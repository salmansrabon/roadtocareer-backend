const ResumeEvaluation = require("../models/ResumeEvaluation");

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
      You are an expert Technical HR Recruiter AI. Evaluate the candidate's resume against the job description accurately.

      ──────────────────────────────
      ⚠️ CRITICAL: EXPERIENCE LEVEL MATCHING
      ──────────────────────────────
      FIRST, determine the experience level required by the job:
      
      If Job Description mentions: "Fresh graduates", "Entry level", "0-1 years", "Fresher", "Graduate trainee", or similar terms:
      → This is a FRESHER/ENTRY-LEVEL position
      → Fresh graduates with 0 years experience are ELIGIBLE and should be scored normally
      → Do NOT penalize candidates for being freshers
      
      If Job Description mentions: "2+ years", "3-5 years", "Mid-level", "Senior", "Experienced" or specific years:
      → This requires PROFESSIONAL EXPERIENCE
      → Fresh graduates should receive score 0 with verdict "Not eligible"
      
      ──────────────────────────────
      🏁 SCORING CRITERIA (Total = 10 points)
      ──────────────────────────────
      1️⃣ Experience Level Match (0–2 points)
         - Fresh grad for fresh grad role = 2 points
         - Experienced for experienced role = 2 points
         - Mismatch = 0 points
      
      2️⃣ Technical Skills Match (0–4 points)
         - Strong alignment with required skills = 3.5-4 points
         - Moderate alignment = 2-3 points
         - Weak alignment = 0-1.5 points
      
      3️⃣ Domain/Role Relevance (0–2 points)
         - Relevant education/projects/internships for freshers
         - Relevant work experience for experienced candidates
      
      4️⃣ Responsibility Alignment (0–1 point)
         - How well candidate can handle listed responsibilities
      
      5️⃣ Project/Company Relevance (0–0.5 point)
         - Academic projects count for fresh grads
         - Professional projects for experienced
      
      6️⃣ Resume Quality (0–0.5 point)
         - Clear, professional formatting

      ──────────────────────────────
      🎯 SCORING SCALE
      ──────────────────────────────
      - 0/10 → Not eligible (experience level mismatch ONLY)
      - 1-4/10 → Weak fit
      - 5-7/10 → Partial fit  
      - 8-9/10 → Strong fit
      - 10/10 → Perfect fit

      ──────────────────────────────
      🧩 FEEDBACK FORMAT
      ──────────────────────────────
      Use these indicators:
      - ✅ Strong match with JD
      - ⚙️ Moderate match with JD
      - ❌ Mismatch with JD

      ──────────────────────────────
      📦 JSON OUTPUT FORMAT (STRICT)
      ──────────────────────────────
      {
        "candidate_name": "Full name extracted from resume",
        "score": <0-10>,
        "verdict": "Perfect fit|Strong fit|Partial fit|Weak fit|Not eligible",
        "feedback": {
          "experience": "Assessment of experience level match",
          "technical_skills": "Assessment of technical skills",
          "domain_experience": "Assessment of domain relevance",
          "responsibilities": "Assessment of responsibility fit",
          "project_relevance": "Assessment of projects/work",
          "resume_quality": "Assessment of resume format",
          "overall_feedback": "2-3 sentence summary mentioning company name, explaining fit and suggestions"
        }
      }

      RESPOND ONLY IN VALID JSON. NO OTHER TEXT.
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

