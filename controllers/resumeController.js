const StudentResume = require("../models/StudentResume");
const Student = require("../models/Student");
const sequelize = require("../config/db");

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
            careerObjective,
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
            reference,
            resumeFile,
            photo,
            
        } = req.body;

        // Check if student exists
        const student = await Student.findOne({ where: { StudentId: studentId } });
        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student ID not found in the system."
            });
        }

        // Check if resume exists
        const existingResume = await StudentResume.findOne({ where: { studentId } });

        const resumePayload = {
            careerObjective,
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
            reference,
            resumeFile: resumeFile || null,
            photo: photo || null
        };

        if (existingResume) {
            await StudentResume.update(resumePayload, { where: { studentId } });
            return res.status(200).json({
                success: true,
                message: "Resume updated successfully.",
                resume: resumePayload
            });
        }

        const newResume = await StudentResume.create(resumePayload);
        return res.status(201).json({
            success: true,
            message: "Resume created successfully.",
            resume: newResume
        });

    } catch (error) {
        console.error("❌ Error in createResume:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
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


exports.getAllStudentResumes = async (req, res) => {
    const {
      studentName,
      studentId,
      email,
      batch_no,
      companyName,
      primarySkill,
      secondarySkill,
      page = 1,
      limit = 10
    } = req.query;
  
    try {
      const whereClauses = [];
      const replacements = {
        studentName: `%${studentName || ''}%`,
        studentId,
        email,
        batch_no,
        companyName: `%${companyName || ''}%`,
        primarySkill: `%${primarySkill || ''}%`,
        secondarySkill: `%${secondarySkill || ''}%`,
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit)
      };
  
      if (studentName) whereClauses.push(`s.student_name LIKE :studentName`);
      if (studentId) whereClauses.push(`s.StudentId = :studentId`);
      if (email) whereClauses.push(`s.email = :email`);
      if (batch_no) whereClauses.push(`s.batch_no = :batch_no`);
      if (companyName) whereClauses.push(`s.company LIKE :companyName`);
      if (primarySkill) whereClauses.push(`sr.primarySkill LIKE :primarySkill`);
      if (secondarySkill) whereClauses.push(`sr.secondarySkill LIKE :secondarySkill`);
  
      const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";
  
      const results = await sequelize.query(
        `
        SELECT 
          s.StudentId, 
          s.salutation,
          s.student_name,
          s.batch_no,
          s.email,
          s.university,
          s.company,
          s.designation,
          sr.primarySkill,
          sr.secondarySkill,
          s.linkedin,
          sr.resumeFile
        FROM students s
        LEFT JOIN student_resumes sr ON s.StudentId = sr.studentId
        ${whereSql}
        ORDER BY s.createdAt DESC
        LIMIT :limit OFFSET :offset
        `,
        {
          replacements,
          type: sequelize.QueryTypes.SELECT,
        }
      );
  
      const countResult = await sequelize.query(
        `
        SELECT COUNT(*) as total
        FROM students s
        LEFT JOIN student_resumes sr ON s.StudentId = sr.studentId
        ${whereSql}
        `,
        {
          replacements,
          type: sequelize.QueryTypes.SELECT,
        }
      );
  
      const total = countResult[0]?.total || 0;
      const totalPages = Math.ceil(total / parseInt(limit));
  
      res.status(200).json({
        success: true,
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages,
        data: results,
      });
    } catch (error) {
      console.error("Error fetching student resumes:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  };
  



