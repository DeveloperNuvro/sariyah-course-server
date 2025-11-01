import Course from '../models/course.model.js';
import Category from '../models/category.model.js';
import Lesson from '../models/lesson.model.js';
import Review from "../models/review.model.js";
import Enrollment from "../models/enrollment.model.js";
import User from "../models/user.model.js";
import asyncHandler from "express-async-handler";
import jwt from "jsonwebtoken"; // Needed for the optional auth check
import slugify from 'slugify';
import { v2 as cloudinary } from 'cloudinary';


// @desc    Get all published courses
export const getAllCourses = asyncHandler(async (req, res) => {
    // 1. Fetch all published courses and populate necessary fields
    const courses = await Course.find({ isPublished: true })
        .populate('category', 'name')
        .populate('instructor', 'name avatar')
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
        .populate('instructor', 'name avatar')
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
        .populate("instructor", "name avatar")
        .populate("category", "name");

    if (!course) {
        res.status(404);
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
    // Import validation utilities
    const {
        sanitizeString,
        sanitizeText,
        sanitizeUrl,
        sanitizeNumber,
        validateRequired,
        validateLength,
        validateObjectId,
        validatePrice,
    } = await import('../utils/validation.js');

    // 1. Sanitize and validate inputs
    const title = sanitizeString(req.body.title || '', 200);
    const description = sanitizeText(req.body.description || '', 10000);
    const price = sanitizeNumber(req.body.price, 0, 1000000);
    const category = req.body.category ? String(req.body.category).trim() : '';
    const level = sanitizeString(req.body.level || 'beginner', 20);
    const language = sanitizeString(req.body.language || 'English', 50);
    const discountPrice = req.body.discountPrice ? sanitizeNumber(req.body.discountPrice, 0, 1000000) : null;
    const groupLink = req.body.groupLink ? sanitizeUrl(req.body.groupLink) : '';

    // 2. Required fields validation
    const requiredValidation = validateRequired(['title', 'description', 'price', 'category'], {
        title,
        description,
        price: price !== null ? price : '',
        category,
    });
    if (!requiredValidation.valid) {
        res.status(400);
        throw new Error(requiredValidation.message);
    }

    // 3. Validate ObjectId for category
    if (!validateObjectId(category)) {
        res.status(400);
        throw new Error("Invalid category ID");
    }

    // 4. Validate title length
    if (!validateLength(title, 5, 200)) {
        res.status(400);
        throw new Error("Title must be between 5 and 200 characters");
    }

    // 5. Validate description length
    if (!validateLength(description, 50, 10000)) {
        res.status(400);
        throw new Error("Description must be between 50 and 10000 characters");
    }

    // 6. Validate price
    if (price === null || price < 0) {
        res.status(400);
        throw new Error("Price must be a valid positive number");
    }

    // 7. Validate discount price if provided
    if (discountPrice !== null && discountPrice >= price) {
        res.status(400);
        throw new Error("Discount price must be less than the regular price");
    }

    // 8. Validate level
    const allowedLevels = ['beginner', 'intermediate', 'advanced'];
    if (!allowedLevels.includes(level.toLowerCase())) {
        res.status(400);
        throw new Error("Level must be one of: beginner, intermediate, advanced");
    }

    // 2. Check for thumbnail upload
    if (!req.file) {
        res.status(400);
        throw new Error("Course thumbnail is required");
    }

    // 9. Prepare data for new course
    const courseData = {
        title,
        description,
        price,
        category,
        level: level.toLowerCase(),
        language,
        instructor: req.user._id,
        thumbnail: req.file.secure_url || req.file.url || req.file.path, // Secure URL from Cloudinary
    };
    if (discountPrice !== null) {
        courseData.discountPrice = discountPrice;
    }
    if (groupLink) {
        courseData.groupLink = groupLink;
    }

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
        // Delete old thumbnail from Cloudinary if it exists
        if (course.thumbnail) {
            try {
                // Extract publicId from Cloudinary URL (handles various URL formats)
                let publicId = '';
                if (course.thumbnail.includes('/v')) {
                    // Format: https://res.cloudinary.com/.../v1234567890/lms/thumbnails/filename
                    const match = course.thumbnail.match(/\/v\d+\/(.+?)(?:\?.*)?$/);
                    if (match) {
                        publicId = match[1];
                    }
                } else {
                    // Fallback: extract from path
                    publicId = course.thumbnail.split('/').pop().split('.')[0];
                    if (!publicId.includes('lms/thumbnails/')) {
                        publicId = `lms/thumbnails/${publicId}`;
                    }
                }
                
                if (publicId) {
                    await cloudinary.uploader.destroy(publicId);
                }
            } catch (deleteError) {
                console.error('Error deleting old thumbnail:', deleteError);
                // Don't fail the request if old thumbnail deletion fails
            }
        }
        
        // Use secure_url (HTTPS) if available, otherwise fallback to url or path
        req.body.thumbnail = req.file.secure_url || req.file.url || req.file.path;
    }

    // Filter out empty strings and undefined values to prevent ObjectId casting errors
    const updateData = {};
    Object.keys(req.body).forEach(key => {
        const value = req.body[key];
        // Only include non-empty strings and valid values
        if (value !== '' && value !== null && value !== undefined) {
            updateData[key] = value;
        }
    });
    if (typeof updateData.groupLink === 'string') {
        updateData.groupLink = updateData.groupLink.trim();
    }

    const updatedCourse = await Course.findByIdAndUpdate(req.params.id, updateData, {
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
 * @desc    Toggle the publish status of a course (ADMIN ONLY)
 * @route   PATCH /api/courses/:id/publish
 * @access  Private/Admin
 */
export const togglePublishStatus = asyncHandler(async (req, res) => {
    // 1. Find the course by ID
    const course = await Course.findById(req.params.id);

    if (!course) {
        res.status(404);
        throw new Error("Course not found");
    }

    // 2. Authorization Check: Only admins can publish/unpublish courses
    if (req.user.role !== "admin") {
        res.status(403); // Forbidden
        throw new Error("Only administrators can publish or unpublish courses");
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

// @desc    Get group link for a course if user is enrolled, instructor, or admin
// @route   GET /api/courses/:id/group-link
// @access  Private
export const getCourseGroupLink = asyncHandler(async (req, res) => {
    const course = await Course.findById(req.params.id).select('groupLink instructor');
    if (!course) {
        res.status(404);
        throw new Error('Course not found');
    }
    // Admin or instructor can view
    if (req.user.role === 'admin' || course.instructor.toString() === req.user.id) {
        return res.json({ success: true, data: { groupLink: course.groupLink || '' } });
    }
    // Students: must be enrolled
    const isEnrolled = await Enrollment.exists({ course: course._id, student: req.user._id });
    if (!isEnrolled) {
        res.status(403);
        throw new Error('Not authorized to view group link');
    }
    res.json({ success: true, data: { groupLink: course.groupLink || '' } });
});

/**
 * @desc    Update course thumbnail image
 * @route   PATCH /api/courses/:id/thumbnail
 * @access  Private/Instructor or Private/Admin
 */
export const updateCourseThumbnail = asyncHandler(async (req, res) => {
    const course = await Course.findById(req.params.id);
    
    if (!course) {
        res.status(404);
        throw new Error("Course not found");
    }

    // Authorization check
    if (course.instructor.toString() !== req.user.id && req.user.role !== "admin") {
        res.status(403);
        throw new Error("User not authorized to update this course");
    }

    // Check if thumbnail file was uploaded
    if (!req.file) {
        res.status(400);
        throw new Error("Thumbnail image is required");
    }

    // Delete old thumbnail from Cloudinary if it exists
    if (course.thumbnail) {
        try {
            // Extract publicId from Cloudinary URL (handles various URL formats)
            let publicId = '';
            if (course.thumbnail.includes('/v')) {
                // Format: https://res.cloudinary.com/.../v1234567890/lms/thumbnails/filename
                const match = course.thumbnail.match(/\/v\d+\/(.+?)(?:\?.*)?$/);
                if (match) {
                    publicId = match[1];
                }
            } else {
                // Fallback: extract from path
                publicId = course.thumbnail.split('/').pop().split('.')[0];
                if (!publicId.includes('lms/thumbnails/')) {
                    publicId = `lms/thumbnails/${publicId}`;
                }
            }
            
            if (publicId) {
                await cloudinary.uploader.destroy(publicId);
            }
        } catch (deleteError) {
            console.error('Error deleting old thumbnail:', deleteError);
            // Don't fail the request if old thumbnail deletion fails
        }
    }

    // Use secure_url (HTTPS) if available, otherwise fallback to url or path
    const thumbnailUrl = req.file.secure_url || req.file.url || req.file.path;
    course.thumbnail = thumbnailUrl;
    
    const updatedCourse = await course.save();

    res.status(200).json({
        success: true,
        message: "Course thumbnail updated successfully",
        data: updatedCourse
    });
});