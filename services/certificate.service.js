import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import cloudinary from "../config/cloudinary.js";
import User from "../models/user.model.js";
import Course from "../models/course.model.js";
import Certificate from "../models/certificate.model.js";

export const generateAndUploadCertificate = async (studentId, courseId) => {
    try {
        console.log(`[CERT-GEN] Starting certificate generation for student: ${studentId}, course: ${courseId}`);

        const existingCertificate = await Certificate.findOne({ student: studentId, course: courseId });
        if (existingCertificate) {
            console.log("[CERT-GEN] Certificate already exists. Exiting.");
            return;
        }

        const student = await User.findById(studentId).select("name").lean();
        const course = await Course.findById(courseId).select("title").lean();

        if (!student || !course) {
            console.error(`[CERT-GEN-ERROR] Student (${studentId}) or Course (${courseId}) not found.`);
            return;
        }
        console.log(`[CERT-GEN] Found student: ${student.name} and course: ${course.title}`);

        console.log("[CERT-GEN] Creating PDF document...");
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([700, 500]);
        const { height } = page.getSize();
        const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const normalFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

        // --- PREPARE THE TEXT STRINGS ---
        const studentName = student.name;
        const courseTitle = course.title;
        // This is the correct way to format the date string
        const issueDateText = `Issued on: ${new Date().toLocaleDateString()}`;

        page.drawText('Certificate of Completion', { x: 180, y: height - 80, font, size: 30, color: rgb(0.1, 0.2, 0.8) });
        page.drawText('This certificate is awarded to:', { x: 50, y: height - 180, font: normalFont, size: 20 });
        page.drawText(studentName, { x: 200, y: height - 240, font, size: 32 });
        page.drawText('For successfully completing the course:', { x: 50, y: height - 320, font: normalFont, size: 20 });
        page.drawText(courseTitle, { x: 150, y: height - 370, font, size: 28 });
        
        // --- THIS IS THE CORRECTED LINE ---
        // We pass the formatted string 'issueDateText' as the first argument.
        page.drawText(issueDateText, { x: 50, y: 50, font: normalFont, size: 12, color: rgb(0.5, 0.5, 0.5) });

        const pdfBytes = await pdfDoc.save();
        const pdfBuffer = Buffer.from(pdfBytes);
        console.log("[CERT-GEN] PDF buffer created successfully.");

        console.log("[CERT-GEN] Uploading PDF to Cloudinary...");
        const uploadResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: "lms/certificates",
                    resource_type: "image",
                    access_mode: "public",
                    public_id: `${studentId}-${courseId}-${Date.now()}`,
                    format: "pdf",
                },
                (error, result) => {
                    if (error) {
                        console.error("[CLOUDINARY-ERROR] Upload failed:", error);
                        return reject(new Error("Cloudinary upload failed."));
                    }
                    resolve(result);
                }
            );
            uploadStream.end(pdfBuffer);
        });

        if (!uploadResult || !uploadResult.secure_url) {
            throw new Error("Cloudinary upload returned an invalid result.");
        }
        console.log(`[CERT-GEN] Upload successful! URL: ${uploadResult.secure_url}`);

        console.log("[CERT-GEN] Saving certificate record to database...");
        await Certificate.create({
            student: studentId,
            course: courseId,
            certificateUrl: uploadResult.secure_url,
        });

        console.log(`[CERT-GEN] SUCCESS: Certificate for student ${studentId} is complete.`);

    } catch (error) {
        console.error("--- [CERT-GEN-FATAL-ERROR] ---");
        console.error("The certificate generation process failed entirely.");
        console.error("Error message:", error.message);
        console.error("--- [END OF ERROR REPORT] ---");
    }
};