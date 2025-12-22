// controllers/aiVoiceTalkController.js
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const Student = require("../models/Student");

/**
 * Shared topics across ALL roles (QA Engineer, Automation Engineer, SDET, Manual Tester)
 * Topics stay same; question depth changes by level.
 */
const COMMON_TOPICS = [
  "Software Testing Fundamentals",
  "Test Case Design Techniques (BVA, EP, Decision Table, State Transition)",
  "Bug Lifecycle, Severity vs Priority, and Defect Triage",
  "Regression, Smoke, Sanity, and Test Levels",
  "API Testing (manual + automation basics)",
  "Automation Fundamentals (what/why/when + maintainability)",
  "CI/CD and Continuous Testing (quality gates, pipelines)",
  "Performance Testing Basics (key metrics, when to do it)",
  "Security Testing Awareness (OWASP basics, common risks)",
  "Database & SQL Testing (data validation, joins, integrity)",
  "Test Strategy, Planning, Estimation, and Risk-based Testing",
  "Agile QA Collaboration (ceremonies, shifts, collaboration)"
];

/**
 * Normalize level names and provide level guidance.
 * Junior: 0-3, Mid: 4-6, Senior: 7-12
 */
function normalizeLevel(level) {
  const l = String(level || "").trim().toLowerCase();
  if (["jr", "junior", "entry", "entry-level", "0-3", "0–3"].includes(l)) return "Junior";
  if (["mid", "middle", "intermediate", "4-6", "4–6"].includes(l)) return "Mid";
  if (["senior", "sr", "lead", "staff", "principal", "7-12", "7–12"].includes(l)) return "Senior";
  return level && ["Junior", "Mid", "Senior"].includes(level) ? level : "Mid";
}

function getLevelDifficultyGuidance(level) {
  const normalized = normalizeLevel(level);

  const map = {
    Junior: {
      years: "0–3",
      guidance:
        "Ask simple, concept-based questions. Focus on definitions, basic examples, and how they would test simple scenarios. Avoid deep architecture."
    },
    Mid: {
      years: "4–6",
      guidance:
        "Ask scenario-based questions. Focus on implementation details, comparisons, practical decision-making, debugging failures, and trade-offs at feature/team level."
    },
    Senior: {
      years: "7–12",
      guidance:
        "Ask advanced questions. Focus on test strategy, architecture, scaling, leadership decisions, risk management, quality gates, and handling complex real-world failures."
    }
  };

  return { level: normalized, ...map[normalized] };
}

/**
 * Pick N topics. If N > COMMON_TOPICS length, re-use after reshuffle.
 */
function pickTopics(count) {
  const q = Math.max(1, parseInt(count || 10, 10));
  const base = [...COMMON_TOPICS];

  const shuffle = (arr) => arr.sort(() => Math.random() - 0.5);

  let selected = [];
  let pool = shuffle([...base]);

  while (selected.length < q) {
    if (pool.length === 0) pool = shuffle([...base]);
    selected.push(pool.shift());
  }

  return selected;
}

/**
 * Create Realtime AI Voice Interview Session
 * POST /api/ai-voice/realtime-session
 */
const createRealtimeSession = async (req, res) => {
  try {
    const {
      role = "SDET",
      level = "Mid",
      language = "English",
      questionCount = 10
    } = req.body;

    const normalizedLevel = normalizeLevel(level);
    const difficultyInfo = getLevelDifficultyGuidance(normalizedLevel);

    // Dynamic range (AI independence)
    const baseCount = Math.max(1, parseInt(questionCount || 10, 10));
    const minCore = Math.max(1, baseCount - 3);
    const maxCore = baseCount + 3;

    // Prepare enough topics for maximum possible core questions
    const selectedTopics = pickTopics(maxCore);

    const systemPrompt = `
You are a Senior ${role} technical interviewer conducting a structured interview.
Language: ${language}.

CORE PRINCIPLE:
- TOPICS are the SAME for all roles (QA Engineer, Automation Engineer, SDET, Manual Tester).
- DIFFICULTY changes by candidate level only.

LEVEL:
- ${difficultyInfo.level} (${difficultyInfo.years} years)
DIFFICULTY RULE:
- ${difficultyInfo.guidance}

PERSONALITY & TONE:
- Be warm, friendly, and professional like a real interviewer
- Keep a natural conversational flow with short acknowledgments
- Stay completely silent until the interview is explicitly started
- Do NOT introduce yourself automatically before the start

INTERVIEW FLOW (STRICT START):
1) When the interview starts:
   - Introduce yourself warmly: "Hello! I'm your AI interviewer for this ${role} position. I'm excited to chat with you today!"
   - Ask exactly: "Let's begin with you telling me about yourself."

AI INDEPENDENCE (DYNAMIC CORE QUESTION COUNT):
- Base core question reference = ${baseCount}
- You MUST ask between MIN_CORE = ${minCore} and MAX_CORE = ${maxCore} core technical questions.
- After the first 2–3 core questions, decide candidate potential:
  - HIGH potential: continue toward MAX_CORE (${maxCore})
  - MEDIUM potential: stay around BaseCount (${baseCount})
  - LOW potential: you may stop around MIN_CORE (${minCore})

CORE vs FOLLOW-UP:
- CORE technical questions count toward the total.
- Follow-up questions do NOT count toward the total.
- Follow-ups must be directly based on the candidate's last answer.
__Flow Example:__

1. Ask core question like: "Explain boundary value analysis"
2. Candidate answers
3. You may ask follow-up: "Can you walk me through a specific example where you applied BVA?"
4. Candidate responds to follow-up
5. Then you can move to next CORE topic question


GOSSIP / FRIENDLY CHAT (Allowed):
- You may do light friendly chat to know the candidate better.
- Keep it short (1–2 exchanges max) and professional.
- No overly personal questions.
- Gossip does NOT count as core technical questions.

TOPICS (CORE QUESTIONS MUST USE THESE TOPICS, ONE TOPIC PER CORE QUESTION):
${selectedTopics.map((t, i) => `${i + 1}. ${t}`).join("\n")}

CORE QUESTION RULES:
- Ask ONE core question at a time and wait for a complete answer.
- After each answer, you may ask 0–2 follow-up questions (optional).
- Then move to the next core topic question.
- Stop asking core questions once you have reached your chosen number (within ${minCore}-${maxCore}).
- After stopping core questions, immediately go to evaluation and end the interview.
- No question numbering out loud, no "Question 1/10" style talk.

SILENCE HANDLING (Only when NO speech detected):
- If genuine silence for several seconds: "Take your time, I'm listening."
- If continued silence, repeat the question briefly.
- If still no response: acknowledge and move on to the next core topic question.

END PROCEDURE (MANDATORY AFTER YOU FINISH CORE QUESTIONS):
${
  language === "Bengali"
    ? `
1) স্কোর প্রদান: উত্তরের মানের ভিত্তিতে ১০-এর মধ্যে স্কোর দিন (ফরম্যাট: "আপনার স্কোর X/10")
2) সংক্ষিপ্ত গঠনমূলক ফিডব্যাক দিন: শক্তিশালী দিক + উন্নতির জায়গা
3) বলুন: "ইন্টারভিউ সম্পন্ন হয়েছে। আজ আপনার সাথে কথা বলে খুবই ভালো লেগেছে, ধন্যবাদ!"
4) বলুন: "দয়া করে ইন্টারভিউ বন্ধ করার বাটনে ক্লিক করুন।"
5) এই পর্যায়ের পর আর কোনো প্রশ্ন করবেন না
`
    : `
1) Provide score out of 10 (format: "Your score is X/10")
2) Give brief constructive feedback (strengths + improvement areas)
3) Say: "Interview completed. Thank you for your time today, it was great talking with you!"
4) Say: "Please click the Stop Interview button to end the session."
5) Do NOT ask any more questions after this point
`
}
`;

    const response = await axios.post(
      "https://api.openai.com/v1/realtime/sessions",
      {
        model: "gpt-4o-realtime-preview",
        voice: "alloy",
        instructions: systemPrompt,
        temperature: 0.65,
        input_audio_transcription: { model: "whisper-1" },
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 2000
        }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    res.json({
      success: true,
      session: response.data,
      meta: {
        role,
        level: difficultyInfo.level,
        years: difficultyInfo.years,
        baseCount,
        minCore,
        maxCore,
        selectedTopics
      }
    });
  } catch (err) {
    console.error("Realtime Session Error:", err?.response?.data || err.message);
    res.status(500).json({
      success: false,
      error: "Failed to create realtime session"
    });
  }
};

/**
 * Save AI Voice Interview Result
 * POST /api/ai-voice/save-result
 */
const saveInterviewResult = async (req, res) => {
  try {
    const {
      studentId,
      score,
      role,
      level,
      feedback,
      topics_covered,
      session_duration
    } = req.body;

    // Fix validation bug - score = 0 is valid!
    if (!studentId || score === null || score === undefined || !role || !level) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: studentId, score, role, level"
      });
    }

    // Guard against NaN
    const parsedScore = parseInt(score);
    if (Number.isNaN(parsedScore)) {
      return res.status(400).json({
        success: false,
        error: "Invalid score format",
        rawScore: score
      });
    }

    // Find student by StudentId
    const student = await Student.findOne({
      where: { StudentId: studentId }
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        error: "Student not found"
      });
    }

    // Create new interview result object
    const newInterviewResult = {
      score: parseInt(score),
      role,
      level,
      feedback: feedback || "",
      interview_date: new Date().toISOString(),
      topics_covered: topics_covered || [],
      session_duration: session_duration || null
    };

    // Get existing interview results or initialize empty array
    let existingResults = [];

    try {
      existingResults = student.ai_voice_interviews
        ? Array.isArray(student.ai_voice_interviews)
          ? student.ai_voice_interviews
          : JSON.parse(JSON.stringify(student.ai_voice_interviews))
        : [];
    } catch (e) {
      console.error("Error parsing existing results, initializing empty array:", e);
      existingResults = [];
    }

    existingResults.push(newInterviewResult);

    // Aggressive fix for Sequelize JSON array detection
    student.ai_voice_interviews = [...existingResults];
    student.changed("ai_voice_interviews", true);
    await student.save();

    console.log("✅ Successfully saved interview attempt:", {
      studentId,
      totalAttempts: existingResults.length,
      newAttempt: newInterviewResult,
      currentDbValue: student.ai_voice_interviews
    });

    res.json({
      success: true,
      message: "Interview result saved successfully",
      result: newInterviewResult
    });
  } catch (err) {
    console.error("Save Interview Result Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to save interview result"
    });
  }
};

/**
 * Get Student Interview Attempts
 * GET /api/ai-voice/interview-attempts/:studentId
 */
const getInterviewAttempts = async (req, res) => {
  try {
    const { studentId } = req.params;

    // Find student by StudentId
    const student = await Student.findOne({
      where: { StudentId: studentId }
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        error: "Student not found"
      });
    }

    // Get interview attempts and sort by latest first
    const interviewAttempts = student.ai_voice_interviews || [];
    const sortedAttempts = interviewAttempts.sort(
      (a, b) => new Date(b.interview_date) - new Date(a.interview_date)
    );

    res.json({
      success: true,
      attempts: sortedAttempts,
      totalAttempts: sortedAttempts.length
    });
  } catch (err) {
    console.error("Get Interview Attempts Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch interview attempts"
    });
  }
};

/**
 * Process Interview Transcript and Extract Score
 * POST /api/ai-voice/process-transcript
 */
const processTranscript = async (req, res) => {
  try {
    const {
      studentId,
      sessionId,
      transcript,
      role,
      level,
      topics_covered,
      session_duration
    } = req.body;

    // Validate required fields (transcript can be empty array)
    if (!studentId || !sessionId || !role || !level) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: studentId, sessionId, role, level"
      });
    }

    // Ensure transcript is array (can be empty)
    const transcriptArray = Array.isArray(transcript) ? transcript : [];

    // Save transcript to temp file
    const tempDir = path.join(__dirname, "../temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const transcriptFile = path.join(tempDir, `interview_${sessionId}.txt`);

    // Format transcript for file
    let transcriptText = `Interview Transcript - Session: ${sessionId}\n`;
    transcriptText += `Student: ${studentId}\n`;
    transcriptText += `Role: ${role} | Level: ${level}\n`;
    transcriptText += `Date: ${new Date().toISOString()}\n\n`;
    transcriptText += "=== CONVERSATION ===\n\n";

    transcriptArray.forEach((entry) => {
      transcriptText += `[${entry.timestamp}] ${(entry.role || "unknown").toUpperCase()}: ${entry.text || "No text"}\n\n`;
    });

    // Write transcript to file
    fs.writeFileSync(transcriptFile, transcriptText, "utf8");

    // Extract score using robust regex patterns (handle empty transcript)
    const fullTranscript =
      transcriptArray.length > 0 ? transcriptArray.map((e) => e.text || "").join(" ") : "";

    console.log("FULL TRANSCRIPT >>>", fullTranscript.substring(0, 500));
    console.log("TRANSCRIPT LENGTH:", fullTranscript.length);
    console.log("TRANSCRIPT ARRAY COUNT:", transcriptArray.length);

    let score = null;
    let feedback = "";

    // Only try to extract score if there's actual transcript content
    if (fullTranscript.trim().length > 0) {
      console.log("🔍 ATTEMPTING SCORE EXTRACTION FROM:", fullTranscript);

      // Robust score patterns (English + Bengali)
      const scorePatterns = [
        // English patterns
        /(?:your\s+)?score\s*(?:is|:)?\s*(\d+)\s*(?:\/|out\s+of|over)\s*10/i,
        /\b(\d+)\s*(?:\/|out\s+of|over)\s*10\b/i,
        /(?:rate|rating|grade)\s*(?:you|your)?\s*(?:at\s+)?(\d+)\s*(?:\/|out\s+of|over)\s*10/i,
        /(?:give|giving)\s*(?:you|your)?\s*(?:a\s+)?(\d+)\s*(?:\/|out\s+of|over)\s*10/i,
        /(?:scored?|scoring)\s*(?:you\s+)?(\d+)\s*(?:\/|out\s+of|over)\s*10/i,
        /interview\s+(?:score|rating)\s*:?\s*(\d+)\s*(?:\/|out\s+of|over)\s*10/i,
        /based\s+on\s+your\s+responses?\s*,?\s*(?:your\s+score\s+is\s+)?(\d+)\s*(?:\/|out\s+of|over)\s*10/i,
        /(?:final|overall)\s+(?:score|rating)\s*:?\s*(\d+)\s*(?:\/|out\s+of|over)\s*10/i,
        /(\d+)\s*points?\s+out\s+of\s+10/i,
        /(\d+)\s*(?:\/|out\s+of)\s*10\s*(?:score|points?|rating)?/i,

        // Bengali patterns
        /(?:আপনার\s+)?স্কোর\s*(?:হলো|হল|:)?\s*(\d+)\s*(?:\/|এর\s+মধ্যে)\s*10/i,
        /(\d+)\s*(?:\/|এর\s+মধ্যে)\s*10\s*(?:স্কোর|পয়েন্ট)?/i,
        /(?:স্কোর|রেটিং)\s*(?:আপনার)?\s*(\d+)\s*(?:\/|এর\s+মধ্যে)\s*10/i,
        /উত্তরের\s+ভিত্তিতে\s*,?\s*(?:আপনার\s+স্কোর\s*)?(\d+)\s*(?:\/|এর\s+মধ্যে)\s*10/i,
        /(\d+)\s*পয়েন্ট\s+(?:১০|10)\s*এর\s+মধ্যে/i,
        /মোট\s*(\d+)\s*(?:\/|এর\s+মধ্যে)\s*(?:১০|10)/i
      ];

      for (let i = 0; i < scorePatterns.length; i++) {
        const pattern = scorePatterns[i];
        const match = fullTranscript.match(pattern);
        console.log(`🔎 Testing pattern ${i + 1}: ${pattern}`, match ? `FOUND: ${match[1]}` : "NO MATCH");

        if (match) {
          const extractedScore = parseInt(match[1]);
          if (!isNaN(extractedScore) && extractedScore >= 0 && extractedScore <= 10) {
            score = extractedScore;
            console.log("✅ SCORE EXTRACTED:", score);
            break;
          }
        }
      }
    } else {
      console.log("❌ NO TRANSCRIPT CONTENT TO EXTRACT SCORE FROM");
    }

    // AI fallback for score extraction if regex fails
    if (score === null) {
      try {
        const scorePrompt = `
Extract ONLY the numeric score (0-10) from the following interview conclusion.
Return JSON: { "score": number }

Text:
${fullTranscript}
`;

        const aiScoreResponse = await axios.post(
          "https://api.openai.com/v1/chat/completions",
          {
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: scorePrompt }],
            response_format: { type: "json_object" }
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
              "Content-Type": "application/json"
            }
          }
        );

        const aiResult = JSON.parse(aiScoreResponse.data.choices[0].message.content);
        if (aiResult.score !== undefined && aiResult.score !== null && !isNaN(aiResult.score) && aiResult.score >= 0 && aiResult.score <= 10) {
          score = parseInt(aiResult.score);
        }
      } catch (aiError) {
        console.error("AI score extraction failed:", aiError);
      }
    }

    // Enhanced feedback extraction (English + Bengali)
    const feedbackPatterns = [
      // English patterns
      /(?:score\s*(?:is|:)?\s*\d+\s*(?:\/|out of|over)\s*10)\s*[.!]?\s*(.*?)(?:interview completed|thank you for your time|please click)/i,
      /(?:\d+\s*(?:\/|out of|over)\s*10)\s*[.!]?\s*(.*?)(?:interview completed|thank you for your time|please click)/i,
      /(?:score)\s*[.!]?\s*(.*?)(?:interview completed|thank you for your time|please click)/i,

      // Bengali patterns
      /(?:স্কোর\s*(?:হলো|হল|:)?\s*\d+\s*(?:\/|এর\s+মধ্যে)\s*10)\s*[.!।]?\s*(.*?)(?:ইন্টারভিউ সম্পন্ন|ধন্যবাদ|দয়া করে.*?ক্লিক)/i,
      /(?:\d+\s*(?:\/|এর\s+মধ্যে)\s*10)\s*[.!।]?\s*(.*?)(?:ইন্টারভিউ সম্পন্ন|ধন্যবাদ|দয়া করে.*?ক্লিক)/i,
      /(?:উত্তরের\s+ভিত্তিতে)\s*[.!।]?\s*(.*?)(?:ইন্টারভিউ সম্পন্ন|ধন্যবাদ|দয়া করে.*?ক্লিক)/i,
      /(?:স্কোর)\s*[.!।]?\s*(.*?)(?:ইন্টারভিউ সম্পন্ন|ধন্যবাদ|দয়া করে.*?ক্লিক)/i
    ];

    for (const pattern of feedbackPatterns) {
      const match = fullTranscript.match(pattern);
      if (match && match[1] && match[1].trim().length > 10) {
        feedback = match[1].trim();
        feedback = feedback.replace(/please click the stop interview button/i, "").trim();
        feedback = feedback.replace(/\s+/g, " ");
        break;
      }
    }

    // Find student by StudentId
    const student = await Student.findOne({
      where: { StudentId: studentId }
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        error: "Student not found"
      });
    }

    // Create interview result object (save ALL attempts)
    const newInterviewResult = {
      score: score, // Can be null, 0, or valid score
      role,
      level,
      feedback: feedback || "",
      interview_date: new Date().toISOString(),
      topics_covered: topics_covered || [],
      session_duration: session_duration || null,
      status: score !== null ? "completed" : "incomplete",
      score_extracted: score !== null
    };

    // Get existing interview results or initialize empty array
    let existingResults = [];
    try {
      existingResults = student.ai_voice_interviews
        ? Array.isArray(student.ai_voice_interviews)
          ? student.ai_voice_interviews
          : JSON.parse(JSON.stringify(student.ai_voice_interviews))
        : [];
    } catch (e) {
      console.error("Error parsing existing results, initializing empty array:", e);
      existingResults = [];
    }

    // Add new result to the array
    existingResults.push(newInterviewResult);

    // Aggressive fix for Sequelize JSON array detection
    student.ai_voice_interviews = [...existingResults];
    student.changed("ai_voice_interviews", true);
    await student.save();

    console.log("✅ Successfully saved interview attempt:", {
      studentId,
      totalAttempts: existingResults.length,
      newAttempt: newInterviewResult,
      currentDbValue: student.ai_voice_interviews
    });

    // Clean up temp file (only for completed interviews)
    if (score !== null) {
      try {
        fs.unlinkSync(transcriptFile);
      } catch (e) {
        console.error("Error deleting temp file:", e);
      }
    }

    res.json({
      success: true,
      message: score !== null
        ? "Interview completed and result saved successfully"
        : "Interview attempt recorded (no score extracted)",
      result: newInterviewResult,
      extractedScore: score,
      extractedFeedback: feedback,
      transcriptFile: score === null ? transcriptFile : null
    });
  } catch (err) {
    console.error("Process Transcript Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to process transcript"
    });
  }
};

module.exports = {
  createRealtimeSession,
  saveInterviewResult,
  getInterviewAttempts,
  processTranscript
};
