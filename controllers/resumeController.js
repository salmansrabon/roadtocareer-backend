const StudentResume = require("../models/StudentResume");
const Student = require("../models/Student");
const ResumeEvaluation = require("../models/ResumeEvaluation");
const sequelize = require("../config/db");

const { OpenAI } = require("openai");
const pdfParse = require("pdf-parse");
const fs = require("fs");
// const fetch = require('node-fetch');

// Initialize OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Helper function to save resume evaluation data to database
 * @param {Object} evaluationData - The evaluation data to save
 * @returns {Promise<Object>} - The saved evaluation record
 */
const saveResumeEvaluation = async (evaluationData) => {
  try {
    const evaluation = await ResumeEvaluation.create({
      candidate_name: evaluationData.candidate_name,
      company_name: evaluationData.company_name,
      job_title: evaluationData.job_title,
      resume_score: evaluationData.resume_score,
      resume_text: evaluationData.resume_text,
      ai_feedback: evaluationData.ai_feedback
    });
    return evaluation;
  } catch (error) {
    console.error('❌ Error saving resume evaluation:', error);
    throw error;
  }
};

exports.evaluateResume = async (req, res) => {
  try {
    const { companyName, jobTitle, jobDescription } = req.body;
    if (!req.file)
      return res.status(400).json({ message: "Resume file is required." });
    if (!companyName || !jobTitle || !jobDescription)
      return res
        .status(400)
        .json({
          message: "Company name, job title, and description required.",
        });

    // Read PDF
    const dataBuffer = fs.readFileSync(req.file.path);
    const pdfData = await pdfParse(dataBuffer);
    const resumeText = pdfData.text;

    // 🧠 System Prompt
    const systemPrompt = `
      You are an expert Technical HR Recruiter AI. Evaluate the candidate's resume against the provided job description and respond in valid JSON.

      ──────────────────────────────
      ⚠️ MANDATORY EXPERIENCE RULE (HARD FILTER)
      ──────────────────────────────
      Before scoring any other category:
      - First, detect if the candidate clearly meets the job's *minimum required years of experience* stated or implied in the Job Description.
      - If the candidate’s total experience (from resume) is below the required minimum, then:
        {
          "candidate_name": "<Extracted Name>",
          "score": 0,
          "verdict": "Not eligible",
          "feedback": {
            "experience": "❌ Mismatch with JD (below required experience level)",
            "technical_skills": "⚙️ Not evaluated due to experience mismatch",
            "domain_experience": "⚙️ Not evaluated due to experience mismatch",
            "responsibilities": "⚙️ Not evaluated due to experience mismatch",
            "project_relevance": "⚙️ Not evaluated due to experience mismatch",
            "resume_quality": "✅ Clear and readable format",
            "overall_feedback": "The candidate does not meet the minimum experience requirement for this position and is not eligible for evaluation. Suggest applying to fresher or junior-level roles."
          }
        }
        and STOP. Do not proceed to the rest of the scoring criteria.

      ──────────────────────────────
      🏁 SCORING CRITERIA (Total = 10 points)
      ──────────────────────────────
      (Only apply the following if candidate meets minimum experience)
      1️⃣ Minimum Experience Requirement (0–2 points)
      2️⃣ Technical Skill Match (0–4 points)
      3️⃣ Relevant Job Role / Domain Experience (0–2 points)
      4️⃣ Responsibility Alignment (0–1 point)
      5️⃣ Company/Project Relevance (0–0.5 point)
      6️⃣ Resume Quality (0–0.5 point)

      ──────────────────────────────
      🎯 INTERPRETATION SCALE
      ──────────────────────────────
      - 0/10 → Not eligible
      - 1–4/10 → Weak fit
      - 5–7/10 → Partial fit
      - 8–9/10 → Strong fit
      - 10/10 → Perfect fit

      ──────────────────────────────
      🧩 INSTRUCTION STYLE
      ──────────────────────────────
      Use:
      - ✅ Strong match with JD
      - ⚙️ Moderate match with JD
      - ❌ Mismatch with JD

      ──────────────────────────────
      📦 OUTPUT FORMAT
      ──────────────────────────────
      {
        "candidate_name": "Extracted full name",
        "score": <number>,
        "verdict": "...",
        "feedback": {
          "experience": "...",
          "technical_skills": "...",
          "domain_experience": "...",
          "responsibilities": "...",
          "project_relevance": "...",
          "resume_quality": "...",
          "overall_feedback": "..."
        }
      }

      Respond ONLY in valid JSON.
      `;


    // 🧾 User Prompt
    const userPrompt = `
    Company Name: ${companyName}
    Job Title: ${jobTitle}

    Job Description:
    ${jobDescription}

    Candidate Resume:
    ${resumeText}

    Evaluate how well this candidate fits the job and respond strictly in JSON as specified.
    `;

    // 🧠 OpenAI API Call
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 700,
      response_format: { type: "json_object" },
    });

    // ✅ Parse JSON output directly
    const result = JSON.parse(completion.choices[0].message.content);

    // 💾 Save evaluation to database
    try {
      const candidateName = result.candidate_name || 'Unknown Candidate';
      await saveResumeEvaluation({
        candidate_name: candidateName,
        company_name: companyName,
        job_title: jobTitle,
        resume_score: result.score,
        resume_text: resumeText,
        ai_feedback: result
      });
      console.log('✅ Resume evaluation saved to database for:', candidateName);
    } catch (dbError) {
      console.error('⚠️ Failed to save evaluation to database:', dbError);
      // Continue with response even if DB save fails
    }

    // 🧹 Clean up file
    fs.unlinkSync(req.file.path);

    // 📨 Send response
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message:
        "Error while evaluating resume. Ensure file is a valid PDF (max 2 MB).",
      error: error.message,
    });
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
    const { rows: resumes, count: total } = await StudentResume.findAndCountAll(
      {
        where,
        offset,
        limit,
        order: [["createdAt", "DESC"]],
      }
    );

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      page,
      limit,
      total,
      totalPages,
      resumes,
    });
  } catch (error) {
    console.error("❌ Error in getAllResumes:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
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
      achievements,
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
        message: "Student ID not found in the system.",
      });
    }

    // Check if resume exists
    const existingResume = await StudentResume.findOne({
      where: { studentId },
    });

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
      achievements,
      primarySkill,
      secondarySkill,
      reference,
      resumeFile: resumeFile || null,
      photo: photo || null,
    };

    if (existingResume) {
      await StudentResume.update(resumePayload, { where: { studentId } });
      return res.status(200).json({
        success: true,
        message: "Resume updated successfully.",
        resume: resumePayload,
      });
    }

    const newResume = await StudentResume.create(resumePayload);
    return res.status(201).json({
      success: true,
      message: "Resume created successfully.",
      resume: newResume,
    });
  } catch (error) {
    console.error("❌ Error in createResume:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

exports.updateResume = async (req, res) => {
  try {
    const { studentId } = req.params;
    const updateData = req.body;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: "Student ID is required in URL.",
      });
    }

    // 🔍 Find existing resume
    const resume = await StudentResume.findOne({ where: { studentId } });

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: "Resume not found for the given studentId.",
      });
    }

    // 🔄 Update only provided fields
    const updatableFields = [
      "careerObjective",
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
      "achievements",
      "primarySkill",
      "secondarySkill",
      "resumeFile",
      "photo",
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
      resume,
    });
  } catch (error) {
    console.error("❌ Error in updateResumeByStudentId:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.deleteResume = async (req, res) => {
  try {
    const { studentId } = req.params;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: "Student ID is required in the URL.",
      });
    }

    // 🔍 Find resume
    const resume = await StudentResume.findOne({ where: { studentId } });

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: "Resume not found for the given studentId.",
      });
    }

    //Delete resume
    await resume.destroy();

    res.status(200).json({
      success: true,
      message: `Resume for studentId ${studentId} deleted successfully.`,
    });
  } catch (error) {
    console.error("❌ Error in deleteResumeByStudentId:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.getAllResumeEvaluations = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    const { rows: evaluations, count: total } = await ResumeEvaluation.findAndCountAll({
      offset,
      limit,
      order: [['created_at', 'DESC']]
    });

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      page,
      limit,
      total,
      totalPages,
      evaluations
    });
  } catch (error) {
    console.error('❌ Error fetching resume evaluations:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error'
    });
  }
};

exports.deleteResumeEvaluation = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Evaluation ID is required'
      });
    }

    const evaluation = await ResumeEvaluation.findByPk(id);

    if (!evaluation) {
      return res.status(404).json({
        success: false,
        message: 'Resume evaluation not found'
      });
    }

    await evaluation.destroy();

    res.status(200).json({
      success: true,
      message: 'Resume evaluation deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting resume evaluation:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error'
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
    limit = 10,
  } = req.query;

  try {
    const whereClauses = [];
    const replacements = {
      studentName: `%${studentName || ""}%`,
      studentId,
      email,
      batch_no,
      university: `%${university || ""}%`,
      companyName: `%${companyName || ""}%`,
      primarySkill: `%${primarySkill || ""}%`,
      secondarySkill: `%${secondarySkill || ""}%`,
      jobStatus,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    };

    if (studentName) whereClauses.push(`s.student_name LIKE :studentName`);
    if (studentId) whereClauses.push(`s.StudentId = :studentId`);
    if (email) whereClauses.push(`s.email = :email`);
    if (batch_no) whereClauses.push(`s.batch_no = :batch_no`);
    if (university) whereClauses.push(`s.university LIKE :university`);
    if (companyName) whereClauses.push(`s.company LIKE :companyName`);
    if (primarySkill) whereClauses.push(`sr.primarySkill LIKE :primarySkill`);
    if (secondarySkill)
      whereClauses.push(`sr.secondarySkill LIKE :secondarySkill`);
    if (jobStatus) whereClauses.push(`sr.jobStatus = :jobStatus`);

    const whereSql = whereClauses.length
      ? `WHERE ${whereClauses.join(" AND ")}`
      : "";

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
