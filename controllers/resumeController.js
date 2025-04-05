const StudentResume = require("../models/StudentResume");
const Student = require("../models/Student");

exports.getAllResumes = async (req, res) => {
    try {
        // 🔹 Get pagination params with defaults
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const studentId = req.query.studentId;

        const where = {};
        if (studentId) {
            where.studentId = studentId;
        }

        // 🔹 Fetch resumes with count
        const { rows: resumes, count: total } = await StudentResume.findAndCountAll({
            where,
            offset,
            limit,
            order: [['createdAt', 'DESC']]
        });

        const totalPages = Math.ceil(total / limit);

        res.status(200).json({
            success: true,
            page,
            limit,
            total,
            totalPages,
            resumes
        });
    } catch (error) {
        console.error("❌ Error in getAllResumes:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};


exports.createResume = async (req, res) => {
    try {
        const {
            studentId,
            fullName,
            email,
            phoneNumber,
            linkedin,
            github,
            jobStatus,
            jobHistory,
            skillSet,
            personalProjects,
            academicInfo,
            trainingInfo,
            primarySkill,
            secondarySkill,
            resumeFile,
            photo
        } = req.body;

        // 🔹 Check if the student exists
        const student = await Student.findOne({ where: { StudentId: studentId } });
        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student ID not found in the system."
            });
        }

        // 🔹 Check for existing resume entry
        const existingResume = await StudentResume.findOne({ where: { studentId } });
        if (existingResume) {
            return res.status(409).json({
                success: false,
                message: "Resume already exists."
            });
        }
        // Create resume record
        const newResume = await StudentResume.create({
            studentId,
            fullName,
            email,
            phoneNumber,
            linkedin,
            github,
            jobStatus,
            jobHistory: jobHistory,
            skillSet: skillSet,
            personalProjects: personalProjects,
            academicInfo: academicInfo,
            trainingInfo: trainingInfo,
            primarySkill,
            secondarySkill,
            resumeFile: resumeFile || null,
            photo: photo || null
        });

        res.status(201).json({
            success: true,
            message: "Resume created successfully.",
            resume: newResume
        });

    } catch (error) {
        console.error("❌ Error in createResume:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};


exports.updateResume = async (req, res) => {
    try {
        const { studentId } = req.params;
        const updateData = req.body;

        if (!studentId) {
            return res.status(400).json({
                success: false,
                message: "Student ID is required in URL."
            });
        }

        // 🔍 Find existing resume
        const resume = await StudentResume.findOne({ where: { studentId } });

        if (!resume) {
            return res.status(404).json({
                success: false,
                message: "Resume not found for the given studentId."
            });
        }

        // 🔄 Update only provided fields
        const updatableFields = [
            "fullName",
            "email",
            "phoneNumber",
            "linkedin",
            "github",
            "jobStatus",
            "jobHistory",
            "skillSet",
            "personalProjects",
            "academicInfo",
            "trainingInfo",
            "primarySkill",
            "secondarySkill",
            "resumeFile",
            "photo"
        ];

        updatableFields.forEach((field) => {
            if (updateData.hasOwnProperty(field)) {
                resume[field] = updateData[field];
            }
        });

        await resume.save();

        res.status(200).json({
            success: true,
            message: "Resume updated successfully.",
            resume
        });
    } catch (error) {
        console.error("❌ Error in updateResumeByStudentId:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

exports.deleteResume = async (req, res) => {
    try {
        const { studentId } = req.params;

        if (!studentId) {
            return res.status(400).json({
                success: false,
                message: "Student ID is required in the URL."
            });
        }

        // 🔍 Find resume
        const resume = await StudentResume.findOne({ where: { studentId } });

        if (!resume) {
            return res.status(404).json({
                success: false,
                message: "Resume not found for the given studentId."
            });
        }

        //Delete resume
        await resume.destroy();

        res.status(200).json({
            success: true,
            message: `Resume for studentId ${studentId} deleted successfully.`
        });
    } catch (error) {
        console.error("❌ Error in deleteResumeByStudentId:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};


