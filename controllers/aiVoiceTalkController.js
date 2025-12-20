// controllers/aiVoiceTalkController.js
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const Student = require("../models/Student");

/**
 * Create Realtime AI Voice Interview Session
 * POST /api/ai-voice/realtime-session
 */
const createRealtimeSession = async (req, res) => {
  try {
    const { role = "SDET", level = "Mid", language = "English", questionCount = 10 } = req.body;
    
    // Role-specific topic areas and sample questions
    const roleTopics = {
  "SDET": [
    "Unit testing vs Integration testing and CI/CD implementation",
    "Automated test framework design with Selenium and design patterns", 
    "API testing strategies and tools",
    "Performance testing approaches and metrics",
    "Database testing and SQL validation techniques",
    "Cross-browser compatibility testing",
    "Test data management and mock services",
    "Continuous testing in DevOps pipelines",
    "Code quality metrics and static analysis",
    "Mobile testing automation strategies",
    "Testability analysis and shift-left testing strategies",
    "Contract testing using tools like Pact",
    "Microservices testing challenges and solutions",
    "Service virtualization and dependency mocking",
    "Security testing automation fundamentals",
    "Observability: logs, metrics, and tracing for testing",
    "Chaos testing and resilience validation",
    "AI-assisted testing and test generation",
    "Test automation architecture for large-scale systems",
    "Quality gates and release criteria design"
  ],

  "QA Engineer": [
    "Comprehensive test planning for feature releases",
    "Testing prioritization under time constraints",
    "Risk-based testing approach and risk assessment",
    "User acceptance testing coordination", 
    "Defect lifecycle and bug tracking processes",
    "Test case design techniques and coverage analysis",
    "Regression testing strategies",
    "Cross-functional team collaboration in QA",
    "Quality metrics and reporting",
    "Testing documentation and standards",
    "Requirement analysis and ambiguity identification",
    "Test estimation techniques and effort planning",
    "Release readiness assessment and go/no-go decisions",
    "Root cause analysis of production defects",
    "Exploratory testing charters and session-based testing",
    "Customer-centric testing mindset",
    "Defect triaging and severity vs priority decisions",
    "QA involvement in Agile ceremonies",
    "Non-functional testing overview (security, performance, usability)",
    "Continuous improvement in QA processes"
  ],

  "Test Automation Engineer": [
    "Dynamic web elements handling and synchronization strategies",
    "Data-driven test framework design and benefits",
    "Page Object Model implementation and maintenance",
    "Test automation tool selection and evaluation",
    "Parallel test execution and grid setup",
    "CI/CD integration for automated testing",
    "Test results analysis and failure investigation",
    "Automation ROI calculation and metrics",
    "Cross-platform automation strategies",
    "Test automation best practices and patterns",
    "Framework scalability and maintainability challenges",
    "Flaky test identification and stabilization strategies",
    "Test tagging and selective execution strategies",
    "API + UI hybrid automation frameworks",
    "Cloud-based test execution (BrowserStack, Sauce Labs)",
    "Version control strategies for automation code",
    "Test automation code review practices",
    "Automation for accessibility testing",
    "Handling environment-specific test configurations",
    "Refactoring automation code for long-term projects"
  ],

  "Manual Tester": [
    "Exploratory testing process for mobile applications",
    "Writing effective test cases from a real life scenario",
    "User experience and usability testing approaches",
    "Ad-hoc testing techniques and strategies", 
    "Boundary value analysis and equivalence partitioning",
    "Accessibility testing methods and tools",
    "Security testing from manual perspective",
    "Compatibility testing across different environments",
    "Test execution reporting and defect documentation",
    "Manual testing tools and productivity techniques",
    "Requirement walkthrough and clarification techniques",
    "Positive vs negative testing strategies",
    "Smoke vs sanity testing differences",
    "Test case review and improvement techniques",
    "End-to-end scenario testing",
    "Exploratory testing vs scripted testing",
    "Real-world bug reporting best practices",
    "Understanding logs and basic debugging",
    "Testing mindset: thinking like an end user",
    "Transition path from Manual to Automation testing"
  ]
};


    const topics = roleTopics[role] || roleTopics["SDET"];
    
    // Randomly shuffle and select topics for this session
    const shuffledTopics = [...topics].sort(() => Math.random() - 0.5);
    const selectedTopics = shuffledTopics.slice(0, questionCount);
    
    const systemPrompt = `
You are a Senior ${role} technical interviewer for a ${level} position.
Language: ${language}.

PERSONALITY & TONE:
- Be warm, friendly, and professional like a real interviewer
- Use natural conversational flow with appropriate acknowledgments
- Stay completely silent until the interview is explicitly started
- Do NOT introduce yourself automatically

INTERVIEW FLOW (STRICT):
1. When the interview starts:
   - Introduce yourself warmly: "Hello! I'm your AI interviewer for this ${role} position. I'm excited to chat with you today!"
   - Ask exactly: "Let's begin with you telling me about yourself."

2. After the candidate responds:
   - Acknowledge their response naturally (e.g., "Thank you", "Great", "Interesting")
   - Ask exactly ${questionCount} technical questions only
   - Ask ONE question at a time
   - Keep track internally: after ${questionCount} technical questions, STOP asking more questions

SELECTED TOPIC AREAS FOR THIS INTERVIEW (EXACTLY ${questionCount} QUESTIONS):
${selectedTopics.map((topic, index) => `${index + 1}. ${topic}`).join('\n')}

CRITICAL: You MUST ask questions based on these ${questionCount} topics only. After covering all ${questionCount} topics, immediately end the interview.

NATURAL CONVERSATION HANDLING:
- When candidate speaks, listen completely until they finish
- Respond promptly and naturally after they complete their answer
- Use brief acknowledgments: "Great answer", "Thank you", "I see", "Perfect"
- Then smoothly transition to the next question
- ONLY wait longer if you detect genuine silence (no speech at all)

SILENCE HANDLING (Only when NO speech detected):
- If genuine silence for several seconds, gently prompt: "Take your time, I'm listening"
- If continued silence, repeat the question: "Let me repeat that - [question]"
- If still no response, acknowledge and move on: "No worries, let's move to the next question"

NATURAL RESPONSE FLOW:
- Candidate speaks → Listen completely → Brief friendly acknowledgment → Next question
- No speech detected → Wait a moment → Gentle prompt if needed
- Never interrupt or rush candidates while they're speaking
- Maintain conversational pace like a real interview

RULES:
- No question numbering or countdowns  
- Warm, professional, and encouraging tone
- Create specific, practical questions based on the topic areas above
- Respond naturally to answers with brief positive feedback
- CRITICAL: After exactly ${questionCount} technical questions have been answered, immediately provide evaluation

END PROCEDURE (MANDATORY after ${questionCount} technical questions):
${language === "Bengali" ? `
1. স্কোর প্রদান: উত্তরের মানের ভিত্তিতে ১০-এর মধ্যে স্কোর দিন (ফরম্যাট: "আপনার স্কোর X/10")
2. সংক্ষিপ্ত গঠনমূলক ফিডব্যাক প্রদান করুন যা আপনার শক্তিশালী দিক এবং উন্নতির ক্ষেত্রগুলি তুলে ধরে
3. বলুন: "ইন্টারভিউ সম্পন্ন হয়েছে। আজ আপনার সাথে কথা বলে খুবই ভালো লেগেছে, ধন্যবাদ!"
4. প্রার্থীকে বন্ধ করতে অনুরোধ করুন: "দয়া করে ইন্টারভিউ বন্ধ করার বাটনে ক্লিক করুন।"
5. এই পর্যায়ের পর আর কোনো প্রশ্ন করবেন না

উদাহরণ শেষ ফরম্যাট:
"আপনার উত্তরের ভিত্তিতে, আপনার স্কোর 7/10। আপনি ${role.toLowerCase()} এর মৌলিক বিষয়ের ভালো বোধগম্যতা দেখিয়েছেন এবং ভালো সমস্যা সমাধানের চিন্তাভাবনা প্রদর্শন করেছেন। পরবর্তী ধাপে অটোমেশন ফ্রেমওয়ার্কে আরো গভীরে যাওয়ার পরামর্শ দেবো। ইন্টারভিউ সম্পন্ন হয়েছে। আজ আপনার সাথে কথা বলে খুবই ভালো লেগেছে, ধন্যবাদ! দয়া করে ইন্টারভিউ বন্ধ করার বাটনে ক্লিক করুন।"
` : `
1. Provide score out of 10 based on answers quality (format: "Your score is X/10")
2. Give brief constructive feedback highlighting strengths and areas for improvement
3. Say: "Interview completed. Thank you for your time today, it was great talking with you!"
4. Request candidate to stop: "Please click the Stop Interview button to end the session."
5. Do NOT ask any more questions after this point

EXAMPLE END FORMAT:
"Based on your responses, your score is 7/10. You demonstrated solid understanding of ${role.toLowerCase()} fundamentals and showed good problem-solving thinking. I'd suggest diving deeper into automation frameworks for your next steps. Interview completed. Thank you for your time today, it was great talking with you! Please click the Stop Interview button to end the session."
`}
`;

    const response = await axios.post(
      "https://api.openai.com/v1/realtime/sessions",
      {
        model: "gpt-4o-realtime-preview",
        voice: "alloy",
        instructions: systemPrompt,
        input_audio_transcription: {
          model: "whisper-1",
        },
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 2000
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    res.json({
      success: true,
      session: response.data,
    });
  } catch (err) {
    console.error(
      "Realtime Session Error:",
      err?.response?.data || err.message
    );
    res.status(500).json({
      success: false,
      error: "Failed to create realtime session",
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
      // Safely parse existing JSON or initialize empty array
      existingResults = student.ai_voice_interviews ? 
        (Array.isArray(student.ai_voice_interviews) ? 
          student.ai_voice_interviews : 
          JSON.parse(JSON.stringify(student.ai_voice_interviews))
        ) : [];
    } catch (e) {
      console.error("Error parsing existing results, initializing empty array:", e);
      existingResults = [];
    }
    
    // Add new result to the array
    existingResults.push(newInterviewResult);

    // Aggressive fix for Sequelize JSON array detection
    student.ai_voice_interviews = [...existingResults];
    student.changed('ai_voice_interviews', true);
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
    const sortedAttempts = interviewAttempts.sort((a, b) => 
      new Date(b.interview_date) - new Date(a.interview_date)
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
    const tempDir = path.join(__dirname, '../temp');
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

    transcriptArray.forEach(entry => {
      transcriptText += `[${entry.timestamp}] ${(entry.role || "unknown").toUpperCase()}: ${entry.text || "No text"}\n\n`;
    });

    // Write transcript to file
    fs.writeFileSync(transcriptFile, transcriptText, 'utf8');

    // Extract score using robust regex patterns (handle empty transcript)
    const fullTranscript = transcriptArray.length > 0 ? 
      transcriptArray.map(entry => entry.text || "").join(' ') : 
      "";
    
    // Debug log to confirm transcript content
    console.log("FULL TRANSCRIPT >>>", fullTranscript.substring(0, 500));
    console.log("TRANSCRIPT LENGTH:", fullTranscript.length);
    console.log("TRANSCRIPT ARRAY COUNT:", transcriptArray.length);
    
    let score = null;
    let feedback = "";

    // Only try to extract score if there's actual transcript content
    if (fullTranscript.trim().length > 0) {
      console.log("🔍 ATTEMPTING SCORE EXTRACTION FROM:", fullTranscript);
      
      // Enhanced production-grade robust score patterns (English + Bengali)
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
        // Clean up feedback
        feedback = feedback.replace(/please click the stop interview button/i, '').trim();
        feedback = feedback.replace(/\s+/g, ' '); // Remove extra spaces
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
      status: score !== null ? 'completed' : 'incomplete', // Track completion status
      score_extracted: score !== null // Boolean flag for analytics
    };

    // Get existing interview results or initialize empty array
    let existingResults = [];
    
    try {
      // Safely parse existing JSON or initialize empty array
      existingResults = student.ai_voice_interviews ? 
        (Array.isArray(student.ai_voice_interviews) ? 
          student.ai_voice_interviews : 
          JSON.parse(JSON.stringify(student.ai_voice_interviews))
        ) : [];
    } catch (e) {
      console.error("Error parsing existing results, initializing empty array:", e);
      existingResults = [];
    }
    
    // Add new result to the array
    existingResults.push(newInterviewResult);

    // Aggressive fix for Sequelize JSON array detection
    student.ai_voice_interviews = [...existingResults];
    student.changed('ai_voice_interviews', true);
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
      message: score !== null ? 
        "Interview completed and result saved successfully" : 
        "Interview attempt recorded (no score extracted)",
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
