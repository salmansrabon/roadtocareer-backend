// controllers/aiVoiceTalkController.js
const axios = require("axios");

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

TOPIC AREAS FOR ${role} (${questionCount} TOTAL):
${topics.slice(0, questionCount).map((topic, index) => `- ${topic}`).join('\n')}

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
1. Provide score out of 10 based on answers quality (format: "Your score is X/10")
2. Give brief constructive feedback highlighting strengths and areas for improvement
3. Say: "Interview completed. Thank you for your time today, it was great talking with you!"
4. Request candidate to stop: "Please click the Stop Interview button to end the session."
5. Do NOT ask any more questions after this point

EXAMPLE END FORMAT:
"Based on your responses, your score is 7/10. You demonstrated solid understanding of ${role.toLowerCase()} fundamentals and showed good problem-solving thinking. I'd suggest diving deeper into automation frameworks for your next steps. Interview completed. Thank you for your time today, it was great talking with you! Please click the Stop Interview button to end the session."
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

module.exports = { createRealtimeSession };
