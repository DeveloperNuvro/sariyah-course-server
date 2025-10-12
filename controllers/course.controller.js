import Course from '../models/course.model.js';
import Category from '../models/category.model.js';
import Lesson from '../models/lesson.model.js';
import Review from "../models/review.model.js";
import Enrollment from "../models/enrollment.model.js";
import asyncHandler from "express-async-handler";
import jwt from "jsonwebtoken"; // Needed for the optional auth check
import slugify from 'slugify';


// @desc    Get all published courses
export const getAllCourses = asyncHandler(async (req, res) => {
    // 1. Fetch all published courses and populate necessary fields
    const courses = await Course.find({ isPublished: true })
        .populate('category', 'name')
        .populate('instructor', 'name')
        .populate('lessons', 'title') // Populate lessons to get the lesson count
        .lean(); // Use .lean() for better performance and ability to add properties

    // 2. Iterate through each course to get its enrollment count
    // We use Promise.all to run these count queries in parallel for better performance
    const coursesWithCounts = await Promise.all(courses.map(async (course) => {
        const enrollmentCount = await Enrollment.countDocuments({ course: course._id });
        return {
            ...course, // Spread the original course properties
            enrollmentCount, // Add the new enrollmentCount property
        };
    }));
    
    // 3. Send the enriched array of courses
    res.status(200).json(coursesWithCounts);
});

/**
 * @desc    Get ALL courses (published and unpublished)
 * @route   GET /api/courses/all
 * @access  Private/Admin
 */
export const getAllCoursesAdmin = asyncHandler(async (req, res) => {
    // This query is simple: get everything.
    const courses = await Course.find({})
        .populate('category', 'name')
        .populate('instructor', 'name')
        .sort({ createdAt: -1 });

    res.status(200).json({
        success: true,
        count: courses.length,
        data: courses,
    });
});

// @desc    Get a single course by slug
export const getCourseBySlug = asyncHandler(async (req, res) => {
    // 1. Find the course.
    // .lean() makes the query faster and returns a plain JS object,
    // which is perfect for adding properties to it before sending the response.
    const course = await Course.findOne({ slug: req.params.slug })
        .populate("instructor", "name bio avatar socialLinks") // Adjusted fields to match your other controllers
        .populate("category", "name slug")
        .populate("lessons", "title duration order content")
        .lean(); // <-- Use .lean() for performance

    if (!course) {
        res.status(404);
        throw new Error("Course not found");
    }

    // 2. Authorization check: Allow admin or the course's own instructor to view an unpublished course.
    if (!course.isPublished) {
        let isAuthorizedToView = false;
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith("Bearer")) {
            try {
                const token = authHeader.split(" ")[1];
                const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
                const user = await User.findById(decoded.id).select('role');

                // User is authorized if they are an admin OR they are the instructor of this specific course
                if (user && (user.role === 'admin' || course.instructor._id.equals(user._id))) {
                    isAuthorizedToView = true;
                }
            } catch (error) {
                // Invalid token, user is not authorized. Let it fall through.
            }
        }

        if (!isAuthorizedToView) {
            res.status(403); // Use 403 Forbidden as they found the resource but aren't allowed to see it
            throw new Error("This course is not published and cannot be viewed.");
        }
    }

    // 3. Find all reviews for this course
    const reviews = await Review.find({ course: course._id });

    // 4. Calculate rating details on the fly
    const numReviews = reviews.length;
    let averageRating = 0;
    if (numReviews > 0) {
        const totalRating = reviews.reduce((acc, item) => item.rating + acc, 0);
        averageRating = (totalRating / numReviews).toFixed(1); // Round to one decimal place
    }

    // 5. Attach the calculated rating details to the course object before sending
    course.numReviews = numReviews;
    course.averageRating = Number(averageRating);

    const enrollmentCount = await Enrollment.countDocuments({ course: course._id });

    // --- 4. ATTACH THE COUNT TO THE COURSE OBJECT ---
    course.enrollmentCount = enrollmentCount;

    // 6. Send the final, enriched course object
    res.status(200).json({
        success: true,
        data: course
    });
});

export const getCourseById = asyncHandler(async (req, res) => {
    const course = await Course.findById(req.params.id)
        .populate("instructor", "name")
        .populate("category", "name");

    if (!course) {
        res.status(44);
        throw new Error("Course not found");
    }
    res.status(200).json({ success: true, data: course });
});


/**
 * @desc    Get all enrollments for a specific course
 * @route   GET /api/courses/:courseId/enrollments
 * @access  Private/Instructor or Private/Admin
 */
export const getCourseEnrollments = asyncHandler(async (req, res) => {
    const courseId = req.params.courseId;

    // 1. Find the course to verify ownership
    const course = await Course.findById(courseId);

    if (!course) {
        res.status(404);
        throw new Error("Course not found");
    }

    // 2. Authorization: Check if user is the course instructor or an admin
    if (course.instructor.toString() !== req.user.id && req.user.role !== 'admin') {
        res.status(403);
        throw new Error("Not authorized to view this course's enrollments");
    }

    // 3. Find all enrollments for the course
    const enrollments = await Enrollment.find({ course: courseId })
        .populate('student', 'name email avatar createdAt')
        .sort({ createdAt: -1 });

    res.status(200).json({
        success: true,
        count: enrollments.length,
        data: enrollments
    });
});

export const getMyCourses = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const userRole = req.user.role;

    let courses;
    if (userRole === 'instructor') {
        // If the user is an instructor, get courses they teach
        courses = await Course.find({ instructor: userId })
            .populate('category', 'name slug')
            .sort({ createdAt: -1 });
    } else {
        // If the user is a student, get courses they are enrolled in
        const enrollments = await Enrollment.find({ student: userId }).select('course');
        const courseIds = enrollments.map(enrollment => enrollment.course);
        courses = await Course.find({ _id: { $in: courseIds } })
            .populate('category', 'name slug')
            .populate('instructor', 'name avatar')
            .sort({ createdAt: -1 });
    }
    res.status(200).json({
        success: true,
        count: courses.length,
        data: courses
    });
});



// @desc    Create a new course (Admin/Instructor)
export const createCourse = asyncHandler(async (req, res) => {
    const { title, description, price, category, level, language, discountPrice } = req.body;

    // 1. Validation
    if (!title || !description || !price || !category) {
        res.status(400);
        throw new Error("Please provide title, description, price, and category");
    }

    if (discountPrice && Number(discountPrice) >= Number(price)) {
        res.status(400);
        throw new Error("Discount price must be less than the regular price");
    }

    // 2. Check for thumbnail upload
    if (!req.file) {
        res.status(400);
        throw new Error("Course thumbnail is required");
    }

    // 3. Prepare data for new course
    const courseData = {
        ...req.body,
        instructor: req.user._id,
        thumbnail: req.file.path, // Secure URL from Cloudinary
    };

    // 4. Generate unique slug
    const baseSlug = slugify(title, { lower: true, strict: true });
    let slug = baseSlug;
    let counter = 1;
    while (await Course.findOne({ slug })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
    }
    courseData.slug = slug;

    const course = await Course.create(courseData);

    res.status(201).json({
        success: true,
        message: "Course created successfully",
        data: course,
    });
});

export const updateCourse = asyncHandler(async (req, res) => {
    let course = await Course.findById(req.params.id);
    if (!course) {
        res.status(404);
        throw new Error("Course not found");
    }

    // Authorization check
    if (course.instructor.toString() !== req.user.id && req.user.role !== "admin") {
        res.status(403);
        throw new Error("User not authorized to update this course");
    }

    const { price, discountPrice } = req.body;
    const currentPrice = price || course.price;
    if (discountPrice && Number(discountPrice) >= Number(currentPrice)) {
        res.status(400);
        throw new Error("Discount price must be less than the regular price");
    }

    // Handle thumbnail update
    if (req.file) {
        // Delete old thumbnail from Cloudinary
        const publicId = course.thumbnail.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`lms/thumbnails/${publicId}`);
        req.body.thumbnail = req.file.path; // Set new URL
    }

    const updatedCourse = await Course.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
    });

    res.status(200).json({ success: true, data: updatedCourse });
});

export const deleteCourse = asyncHandler(async (req, res) => {
    const course = await Course.findById(req.params.id);
    if (!course) {
        res.status(404);
        throw new Error("Course not found");
    }
    // Authorization check
    if (course.instructor.toString() !== req.user.id && req.user.role !== "admin") {
        res.status(403);
        throw new Error("User not authorized to delete this course");
    }
    // Delete associated thumbnail from Cloudinary
    if (course.thumbnail) {
        const publicId = course.thumbnail.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`lms/thumbnails/${publicId}`);
    }
    await course.deleteOne();
    res.status(200).json({ success: true, message: "Course deleted successfully" });
});


// @desc    Add a lesson to a course (Admin/Instructor)
export const addLessonToCourse = async (req, res) => {
    const { title, content, videoUrl, duration } = req.body;
    try {
        const course = await Course.findById(req.params.courseId);
        if (!course) return res.status(404).json({ message: 'Course not found' });

        // Authorization: check if the logged-in user is the course instructor
        if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'User not authorized to add lessons to this course' });
        }

        const newLesson = new Lesson({
            course: req.params.courseId,
            title,
            content,
            videoUrl,
            duration
        });
        const savedLesson = await newLesson.save();
        course.lessons.push(savedLesson._id);
        await course.save();

        res.status(201).json(savedLesson);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

/**
 * @desc    Toggle the publish status of a course
 * @route   PATCH /api/courses/:id/publish
 * @access  Private/Instructor or Private/Admin
 */
export const togglePublishStatus = asyncHandler(async (req, res) => {
    // 1. Find the course by ID
    const course = await Course.findById(req.params.id);

    if (!course) {
        res.status(404);
        throw new Error("Course not found");
    }

    // 2. Authorization Check: Ensure the user is the course instructor or an admin
    if (course.instructor.toString() !== req.user.id && req.user.role !== "admin") {
        res.status(403); // Forbidden
        throw new Error("User not authorized to change the status of this course");
    }

    // 3. Toggle the 'isPublished' status
    course.isPublished = !course.isPublished;

    // 4. Save the updated course
    const updatedCourse = await course.save();

    // 5. Send a response
    res.status(200).json({
        success: true,
        message: `Course has been ${updatedCourse.isPublished ? 'published' : 'unpublished'} successfully.`,
        data: updatedCourse,
    });
});

/**
 * @desc    Toggle the ended status of a course
 * @route   PATCH /api/courses/:id/end
 * @access  Private/Instructor or Private/Admin
 */
export const toggleEndedStatus = asyncHandler(async (req, res) => {
    const course = await Course.findById(req.params.id);

    if (!course) {
        res.status(404);
        throw new Error("Course not found");
    }

    // Authorization Check
    if (course.instructor.toString() !== req.user.id && req.user.role !== "admin") {
        res.status(403);
        throw new Error("User not authorized to change the status of this course");
    }

    // Toggle the 'isEnded' status
    course.isEnded = !course.isEnded;

    const updatedCourse = await course.save();

    res.status(200).json({
        success: true,
        message: `Course has been marked as ${updatedCourse.isEnded ? 'Ended' : 'Re-opened'}.`,
        data: updatedCourse,
    });
});