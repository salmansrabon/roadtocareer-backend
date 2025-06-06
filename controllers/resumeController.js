const StudentResume = require("../models/StudentResume");
const Student = require("../models/Student");
const sequelize = require("../config/db");

const { OpenAI } = require("openai");
const pdfParse = require("pdf-parse");
const fs = require("fs");
// const fetch = require('node-fetch');

// Initialize OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

exports.evaluateResume = async (req, res) => {
    try {
        //Get uploaded file, jobTitle & jobDescription from req.body
        const { companyName, jobTitle, jobDescription } = req.body;
        if (!req.file) return res.status(400).json({ message: "Resume file is required." });
        if (!companyName || !jobTitle || !jobDescription) return res.status(400).json({ message: "Job title and description required." });

        //Read and parse PDF
        const dataBuffer = fs.readFileSync(req.file.path);
        const pdfData = await pdfParse(dataBuffer);
        const resumeText = pdfData.text;

        //Prepare the prompt
        const prompt = `
            You are an expert technical HR recruiter.
            Company Name: ${companyName}
            Job Title: ${jobTitle}
            Here is the job description:
            ${jobDescription}

            Here is my resume:
            ${resumeText}

            Evaluate how well I fit this job.

            STRICT SCORING RULES:
            - If my years of experience do not meet the job's minimum, give a score of 0.
            - If my resume is NOT directly related to the required skills, technologies, or job responsibilities, give a score of 0. Do not be polite or optimistic in this case.
            - If the resume is generic or from a completely unrelated field (e.g., a teaching or banking resume for a software engineering job), give a score of 0.
            - Only give a score above 0 if there is a clear and direct match to the job requirements.
            - Clearly state the main differences between what the job requires and what is present in my resume.
            - During evaluation, mention the company name, years of experience, or skills that are required by the company but lacking in the candidate's resume.
            - Also provide feedback on how the candidate can improve their resume to better match the job description.
            - If someone has a lot of experience but the resume is not related to the job, tell them directly that they should not apply for this job.
            - If the resume is a 100% match with the JD, give a score of 10.
            - If the resume is 80%-90% matched with the JD (8 or 9 out of 10), suggest applying for the job and explain how to improve the resume to reach a 10/10.
            - If the candidate is not a good fit for this job, suggest they apply for jobs that better match their resume.
            - Also, evaluate whether the resume is standard or below standard.

            Respond ONLY in this format:
            Score: X/10
            Feedback: ...
            Where X is a number between 0 and 10, with 10 being a perfect match.
            And mention the company name within your feedback so that I can understand for which company I am applying for
            `;  


        //Call OpenAI API
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo", // or "gpt-4o"
            messages: [{ role: "user", content: prompt }],
            max_tokens: 300,
            temperature: 0.3,
        });

        const result = completion.choices[0].message.content || "No feedback";
        // Extract score (optional: parse and return as number)
        const scoreMatch = result.match(/Score:\s*(\d{1,2})\/10/);
        const score = scoreMatch ? parseInt(scoreMatch[1], 10) : null;
        const feedbackMatch = result.match(/Feedback:\s*(.*)/s);
        const feedback = feedbackMatch ? feedbackMatch[1].trim() : result;

        // 5. Clean up uploaded file
        fs.unlinkSync(req.file.path);

        // 6. Send response
        res.json({ score, feedback });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Please upload only the pdf file (max file size 2mb)", error: error.message });
    }
};

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
      university,
      companyName,
      primarySkill,
      secondarySkill,
      jobStatus,
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
        university: `%${university || ''}%`,
        companyName: `%${companyName || ''}%`,
        primarySkill: `%${primarySkill || ''}%`,
        secondarySkill: `%${secondarySkill || ''}%`,
        jobStatus,
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit)
      };
  
      if (studentName) whereClauses.push(`s.student_name LIKE :studentName`);
      if (studentId) whereClauses.push(`s.StudentId = :studentId`);
      if (email) whereClauses.push(`s.email = :email`);
      if (batch_no) whereClauses.push(`s.batch_no = :batch_no`);
      if (university) whereClauses.push(`s.university LIKE :university`);
      if (companyName) whereClauses.push(`s.company LIKE :companyName`);
      if (primarySkill) whereClauses.push(`sr.primarySkill LIKE :primarySkill`);
      if (secondarySkill) whereClauses.push(`sr.secondarySkill LIKE :secondarySkill`);
      if (jobStatus) whereClauses.push(`sr.jobStatus = :jobStatus`);
  
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
          sr.jobStatus,
          sr.linkedin,
          sr.resumeFile
        FROM students s
        LEFT JOIN student_resumes sr ON s.StudentId = sr.studentId
        ${whereSql}
        ORDER BY sr.updatedAt DESC
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
  



