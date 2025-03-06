const Course = require("../models/Course");
const Package = require("../models/Package");

exports.createCourse = async (req, res) => {
    try {
        const {
            courseId,
            batch_no,
            course_title,
            course_initial,
            drive_folder_id,
            short_description,
            is_enabled,
            enrollment_start_date,
            enrollment_end_date,
            orientation_date,
            class_start_date,
            class_days, // Array
            class_time,
            course_image
        } = req.body;

        // Validate required fields
        if (!courseId || !batch_no || !course_title || !course_initial || !drive_folder_id ||
            !short_description || !enrollment_start_date || !enrollment_end_date ||
            !orientation_date || !class_start_date || !class_days || !class_time || !course_image) {
            return res.status(400).json({ message: "All fields are required." });
        }

        const existingCourse = await Course.findOne({ where: { courseId } });
        if (existingCourse) {
            return res.status(400).json({ message: "Course ID already exists." });
        }

        const newCourse = await Course.create({
            courseId,
            batch_no,
            course_title,
            course_initial,
            drive_folder_id,
            short_description,
            is_enabled,
            enrollment_start_date,
            enrollment_end_date,
            orientation_date,
            class_start_date,
            class_days: JSON.stringify(class_days), // Store as JSON array
            class_time,
            course_image
        });

        res.status(201).json({ message: "Course created successfully", course: newCourse });
    } catch (error) {
        console.error("Error creating course:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
// ✅ Fetch Course Details by courseId
exports.getCourseDetails = async (req, res) => {
    try {
        const { courseId } = req.params;

        // ✅ Find Course by courseId including Package details
        const course = await Course.findOne({
            where: { courseId },
            attributes: [
                "courseId",
                "batch_no",
                "course_title",
                "course_initial",
                "drive_folder_id",
                "short_description",
                "is_enabled",
                "enrollment_start_date",
                "enrollment_end_date",
                "orientation_date",
                "class_start_date",
                "class_days",
                "class_time",
                "course_image",
                "createdAt",
                "updatedAt"
            ],
            include: [
                {
                    model: Package,
                    attributes: ["packageName", "studentFee", "jobholderFee", "installment"], // ✅ Fetch related package details
                }
            ]
        });

        if (!course) {
            return res.status(404).json({ message: "Course not found" });
        }

        res.status(200).json({ success: true, course });
    } catch (error) {
        console.error("Error fetching course details:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

exports.getCoursesList = async (req, res) => {
    try {
        const courses = await Course.findAll({
            attributes: ["courseId", "batch_no", "course_title", "short_description", "is_enabled", "course_image"], // ✅ Select only required fields
            include: [
                {
                    model: Package,
                    attributes: ["id", "packageName", "studentFee", "jobholderFee"], // ✅ Get package details
                }
            ]
        });

        res.status(200).json({ courses });
    } catch (error) {
        console.error("Error fetching courses:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}