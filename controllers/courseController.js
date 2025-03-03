const Course = require("../models/Course");
const Package = require("../models/Package");

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
