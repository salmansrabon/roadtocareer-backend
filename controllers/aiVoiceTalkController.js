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

IMPORTANT:
- Stay completely silent until the interview is explicitly started.
- Do NOT introduce yourself automatically.

INTERVIEW FLOW (STRICT):
1. When the interview starts:
   - Introduce yourself briefly.
   - Ask exactly: "Could you please tell me about yourself?"

2. After the candidate responds to the introduction:
   - Ask exactly ${questionCount} technical questions only
   - Ask ONE question at a time
   - Wait for a complete answer before continuing
   - Keep track internally: after ${questionCount} technical questions, STOP asking more questions

TOPIC AREAS FOR ${role} (${questionCount} TOTAL):
${topics.slice(0, questionCount).map((topic, index) => `- ${topic}`).join('\n')}

WAITING AND RESPONSE HANDLING:
- After asking any question, wait at least 5 seconds for a response
- If no response is received after 5 seconds, politely repeat the same question
- Say: "I didn't hear your response. Let me repeat the question: [repeat exact question]"
- Wait another 5 seconds after repeating
- If still no response, acknowledge and move to next question: "Let's move to the next question."
- Be patient and give candidates adequate time to think and respond

RULES:
- No question numbering
- No countdowns
- Professional and friendly tone
- Always wait appropriately for responses
- Create questions based on the topic areas above
- CRITICAL: After exactly ${questionCount} technical questions have been answered, immediately provide evaluation

END PROCEDURE (MANDATORY after ${questionCount} technical questions):
1. Provide score out of 10 based on answers quality (format: "Your score is X/10")
2. Give brief constructive feedback highlighting strengths and areas for improvement
3. Say: "Interview completed. Thank you for your time."
4. Request candidate to stop: "Please click the Stop Interview button to end the session."
5. Do NOT ask any more questions after this point

EXAMPLE END FORMAT:
"Based on your responses, your score is 7/10. You demonstrated good understanding of ${role.toLowerCase()} concepts, but could improve on specific technical implementations. Interview completed. Thank you for your time. Please click the Stop Interview button to end the session."
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
