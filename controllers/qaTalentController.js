const Student = require("../models/Student");
const Course = require("../models/Course");
const { Op, Sequelize } = require("sequelize");

// ✅ AI-Powered Search using OpenAI GPT-4-mini
exports.aiSearchQATalent = async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: "Search query is required" });
    }

    // Import OpenAI
    const OpenAI = require("openai");
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Create a prompt for GPT-4-mini to extract search parameters
    const systemPrompt = `You are an intelligent QA talent search assistant. Your goal is to find the BEST matching candidates even when exact skills aren't available. Always return relevant results by using fallback skills and related technologies.

CRITICAL "BEST" CANDIDATE DETECTION:
When users ask for "best", "top", "elite", "premium", "highest quality", "most qualified", "star", "excellent", "high scorer", "highest scorer", "top scorer", or similar superlatives, set "findBest": true. This triggers a special ranking algorithm that prioritizes:
1. VERIFIED students (get_certificate = true) - HIGHEST priority
2. ISTQB certified professionals - HIGH priority  
3. Students with the most technical skills - MEDIUM priority
4. Higher experience levels - MEDIUM priority
5. Currently enrolled/active students - LOW priority

Database Schema:
- students table with fields: student_name, email, university, batch_no, passingYear, company, designation, profession, lookingForJob (enum: 'Yes'/'No'), isISTQBCertified (enum: 'Yes'/'No'), certificate (URL string - when present, student is "verified")
- employment (JSON): { totalExperience: "2.5", company: [{companyName, designation, experience}] }
- skill (JSON): { soft_skill: "text", technical_skill: ["Selenium", "Java", "Python", "JavaScript", "TypeScript", "C#", "API Testing", "REST API", "SOAP API", "Postman","Newman", "SQL", "MySQL", "PostgreSQL", "MongoDB", "Cypress", "Playwright", "TestNG", "JUnit", "Pytest", "Jest", "Mocha", "JIRA", "TestRail", "Zephyr", "Jenkins", "Git", "GitHub", "GitLab", "Appium", "Mobile Testing", "Android Testing", "iOS Testing", "Performance Testing", "Load Testing", "Stress Testing", "JMeter", "LoadRunner", "Gatling", "Cucumber", "BDD", "TDD", "Agile", "Scrum", "Manual Testing", "Regression Testing", "Smoke Testing", "Sanity Testing", "Integration Testing", "UAT", "Exploratory Testing", "Usability Testing", "Compatibility Testing", "Cross-browser Testing", "Security Testing", "Accessibility Testing", "ETL Testing", "Database Testing", "Visual Testing","Figma", "Contract Testing", "Session-based Testing", "Risk-based Testing", "Test Data Management", "Localization Testing", "Internationalization Testing", "A/B Testing", "Chaos Engineering", "Test Cases", "Test Plan", "Test Estimation", "Acceptance Criteria", "Bug Lifecycle", "Bug Triage", "Root Cause Analysis", "Katalon Studio", "Robot Framework", "SoapUI", "REST Assured", "Docker", "Kubernetes", "AWS", "Azure", "CI/CD", "Maven", "Gradle", "Automation Testing", "Linux","Ubuntu"] }

CRITICAL FALLBACK RULES - ALWAYS FIND CANDIDATES:
1. **Security Testing**: If no exact match, use: "BurpSuite, OWASP, ZAP, Nessus, Wireshark, Penetration Testing, Ethical Hacking"
2. **PyTest/Python Testing**: If no PyTest, use: "Python, Selenium, API Testing, Automation Testing"
3. **Performance Testing**: If no exact match, use: "JMeter, LoadRunner, Gatling, Load Testing, Stress Testing"
4. **API Testing**: If no exact match, use: "Postman, REST API, SOAP API, REST Assured, Newman"
5. **Mobile Testing**: If no exact match, use: "Appium, Android Testing, iOS Testing, Mobile Testing"
6. **Database Testing**: If no exact match, use: "SQL, MySQL, PostgreSQL, MongoDB, ETL Testing"
7. **Cloud Testing**: If no exact match, use: "AWS, Azure, Docker, Kubernetes"
8. **CI/CD**: If no exact match, use: "Jenkins, Git, GitHub, GitLab, Docker"
9. **Frontend Testing**: If no exact match, use: "JavaScript, TypeScript, Selenium, Cypress, Playwright"
10. **Backend Testing**: If no exact match, use: "API Testing, SQL, Java, Python, C#"

IMPORTANT SKILL MAPPING RULES:
1. When user says "automation expert" or "automation engineer" or "automation tester", map to: "Selenium,Playwright,Cypress,TestNG,Automation Testing"
2. When user says "API expert" or "API testing", map to: "API Testing,Postman,RestAssured" (fallback: "REST API,SOAP API,Newman")
3. When user says "manual tester" or "manual testing", map to: "Manual Testing,JIRA,Test Case Design"
4. When user says "performance tester", map to: "Performance Testing,JMeter,LoadRunner" (fallback: "Load Testing,Stress Testing,Gatling")
5. When user says "mobile tester" or "mobile testing", map to: "Mobile Testing,Appium,Android,iOS" (fallback: "Android Testing,iOS Testing")
6. When user says "web automation", map to: "Selenium,Playwright,Cypress"
7. When user says "security testing", map to: "Security Testing" (fallback: "BurpSuite,OWASP,ZAP,Penetration Testing")
8. When user says "python testing" or "pytest", map to: "Pytest" (fallback: "Python,Selenium,API Testing")
9. When user says "java testing", map to: "TestNG,JUnit" (fallback: "Java,Selenium,API Testing")
10. When user says "javascript testing", map to: "Jest,Mocha" (fallback: "JavaScript,Cypress,Playwright")
11. Always include related skills for broad terms (e.g., "Java expert" should include "Selenium,TestNG" if testing context)

IMPORTANT VERIFICATION RULES:
- When user says "verified" or "verified QA" or "verified engineers", set "verified": "Yes"
- "Verified" means student has completed our course and has a certificate (either certificate URL or get_certificate is true)
- ISTQB certified is different from verified - it's an international certification
- "Unverified" or "not verified" should set "verified": "No"

IMPORTANT JOB SEEKING RULES:
- When user says "available candidates", "available QA", "open to opportunities", set "lookingForJob": "Yes"
- "Available" and "looking for opportunities" both mean actively seeking employment

"BEST" CANDIDATE EXAMPLES:
User: "Find the best QA in this portal"
Response: {"findBest": true}

User: "Show me top QA engineers"
Response: {"findBest": true}

User: "Who are the most qualified testers here?"
Response: {"findBest": true}

User: "Find elite QA professionals"
Response: {"findBest": true}

User: "Show me premium QA talent"
Response: {"findBest": true}

Return ONLY a valid JSON object with these optional fields:
{
  "findBest": true or false,
  "experience": number (minimum years),
  "maxExperience": number (maximum years),
  "skills": "comma,separated,skills",
  "fallbackSkills": "comma,separated,fallback,skills",
  "university": "string",
  "company": "string",
  "lookingForJob": "Yes" or "No",
  "isISTQBCertified": "Yes" or "No",
  "verified": "Yes" or "No" (for students with certificate),
  "passingYear": "string",
  "searchTerm": "string for name/email/profession search"
}

FALLBACK EXAMPLES:
User: "Find QA who is very good at security testing"
Response: {"skills": "Security Testing", "fallbackSkills": "BurpSuite,OWASP,ZAP,Penetration Testing,Ethical Hacking"}

User: "Find me who is good at PyTest"
Response: {"skills": "Pytest", "fallbackSkills": "Python,Selenium,API Testing,Automation Testing"}

User: "Looking for performance testing experts"
Response: {"skills": "Performance Testing,JMeter,LoadRunner", "fallbackSkills": "Load Testing,Stress Testing,Gatling"}

User: "Need mobile testing specialists"
Response: {"skills": "Mobile Testing,Appium", "fallbackSkills": "Android Testing,iOS Testing"}

User: "Find database testing experts"
Response: {"skills": "Database Testing", "fallbackSkills": "SQL,MySQL,PostgreSQL,ETL Testing"}

User: "Looking for CI/CD experts"
Response: {"skills": "CI/CD,Jenkins", "fallbackSkills": "Git,GitHub,Docker,Kubernetes"}

REGULAR EXAMPLES:
User: "Find QA with 2 years experience and Playwright expert"
Response: {"experience": 2, "skills": "Playwright"}

User: "Looking for ISTQB certified testers from Dhaka University"
Response: {"isISTQBCertified": "Yes", "university": "Dhaka University"}

User: "Find me some automation expert"
Response: {"skills": "Selenium,Playwright,Cypress,TestNG,Automation Testing"}

User: "Find available candidates"
Response: {"lookingForJob": "Yes"}`;

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: query },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    const aiResponse = completion.choices[0].message.content.trim();

    // Parse AI response
    let searchParams;
    try {
      // Remove markdown code blocks if present
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        searchParams = JSON.parse(jsonMatch[0]);
      } else {
        searchParams = JSON.parse(aiResponse);
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", aiResponse);
      return res.status(500).json({
        error: "Failed to understand your query. Please try rephrasing.",
        aiResponse,
      });
    }

    // Check if the query is related to QA talent search
    const hasAnyQARelatedParams = 
      searchParams.findBest ||
      searchParams.skills ||
      searchParams.fallbackSkills ||
      searchParams.experience ||
      searchParams.maxExperience ||
      searchParams.university ||
      searchParams.company ||
      searchParams.lookingForJob ||
      searchParams.isISTQBCertified ||
      searchParams.verified ||
      searchParams.passingYear ||
      searchParams.searchTerm;

    if (!hasAnyQARelatedParams) {
      return res.status(400).json({
        error: "Please query about searching qa talent",
        aiMessage: "Please query about searching qa talent"
      });
    }

    // Detect requested count (e.g., "find me 10 best QA" or explicit count in AI JSON)
    // Support "all", "show all", "every", etc. to return all results
    let requestedCount = null;
    let showAllResults = false;
    
    // Check if user wants all results
    if (typeof query === "string") {
      const showAllRegex = /\b(all|every|everything|complete|entire|full list|show all|get all|find all|list all)\b/i;
      if (showAllRegex.test(query)) {
        showAllResults = true;
      }
    }
    
    if (searchParams.count && Number.isInteger(searchParams.count)) {
      requestedCount = parseInt(searchParams.count);
    } else if (searchParams.count && !isNaN(parseInt(searchParams.count))) {
      requestedCount = parseInt(searchParams.count);
    } else if (searchParams.count && typeof searchParams.count === "string") {
      // Support spelled-out counts returned by the AI (e.g., "three")
      const wordToNum = {
        one: 1,
        two: 2,
        three: 3,
        four: 4,
        five: 5,
        six: 6,
        seven: 7,
        eight: 8,
        nine: 9,
        ten: 10,
        eleven: 11,
        twelve: 12,
        thirteen: 13,
        fourteen: 14,
        fifteen: 15,
        sixteen: 16,
        seventeen: 17,
        eighteen: 18,
        nineteen: 19,
        twenty: 20,
      };
      const lowered = searchParams.count.toLowerCase().trim();
      if (wordToNum[lowered]) requestedCount = wordToNum[lowered];
    } else if (typeof query === "string") {
      // Match patterns like "find me 5 best", "show top 5", "get 10 candidates", etc.
      const countRegex =
        /(?:find|show|get|give me|need|list)\s+(?:me\s+)?(?:top|best)?\s*(\d{1,3})\s*(?:best|top)?\s*(?:qa|testers|candidates|profiles|students|results|people|engineers)?/i;
      const m = query.match(countRegex);
      if (m && m[1]) {
        requestedCount = parseInt(m[1]);
      }
      // Also support spelled-out numbers in the natural language query (e.g., "find me three best")
      if (!requestedCount) {
        const wordToNum = {
          one: 1,
          two: 2,
          three: 3,
          four: 4,
          five: 5,
          six: 6,
          seven: 7,
          eight: 8,
          nine: 9,
          ten: 10,
          eleven: 11,
          twelve: 12,
          thirteen: 13,
          fourteen: 14,
          fifteen: 15,
          sixteen: 16,
          seventeen: 17,
          eighteen: 18,
          nineteen: 19,
          twenty: 20,
        };
        const wordRegex = new RegExp(
          "(?:find|show|get|give me|need|list)\\s+(?:me\\s+)?(" +
            Object.keys(wordToNum).join("|") +
            ")\\s+(?:best|top)?",
          "i"
        );
        const wm = query.match(wordRegex);
        if (wm && wm[1]) {
          const w = wm[1].toLowerCase();
          if (wordToNum[w]) requestedCount = wordToNum[w];
        }
      }
    }

    // If user asked for "best" without an explicit count, interpret it as 1 (the single best candidate)
    if (!requestedCount && searchParams.findBest) {
      requestedCount = 1;
    }

    // If AI didn't extract experience but user mentioned "X year" in query, extract it.
    // Interpret "1 year experienced" as experience >=1 and <2 by setting both experience and maxExperience to the same integer.
    if (
      (!searchParams.experience || searchParams.experience === "") &&
      typeof query === "string"
    ) {
      // Look for numeric years (e.g., "1 year", "2 yrs")
      const expNumMatch = query.match(/(\d{1,2})\s*(?:years?|yrs?|year)/i);
      if (expNumMatch && expNumMatch[1]) {
        const n = parseInt(expNumMatch[1]);
        if (!isNaN(n)) {
          searchParams.experience = n;
          searchParams.maxExperience = n; // treated as exact year -> will be interpreted as >=n and < n+1 in where clause
        }
      } else {
        // Also support spelled-out numbers for experience (one, two, three...)
        const wordToNumExp = {
          one: 1,
          two: 2,
          three: 3,
          four: 4,
          five: 5,
          six: 6,
          seven: 7,
          eight: 8,
          nine: 9,
          ten: 10,
        };
        const wordRegexExp = new RegExp(
          "(" +
            Object.keys(wordToNumExp).join("|") +
            ")\\s+(?:years?|yrs?|year)",
          "i"
        );
        const wmExp = query.match(wordRegexExp);
        if (wmExp && wmExp[1]) {
          const w = wmExp[1].toLowerCase();
          if (wordToNumExp[w]) {
            searchParams.experience = wordToNumExp[w];
            searchParams.maxExperience = wordToNumExp[w];
          }
        }
      }
    }

    // Handle "find best" candidates with special ranking algorithm
    if (searchParams.findBest) {
      // Build where clause for skill filtering if skills are specified
      let bestWhereClause = {};
      let bestOrConditions = [];

      // If skills are specified, filter by them first
      if (searchParams.skills) {
        const skillsArray = searchParams.skills.split(",").map(s => s.trim()).filter(Boolean);
        if (skillsArray.length > 0) {
          skillsArray.forEach(skill => {
            bestOrConditions.push(
              Sequelize.where(
                Sequelize.literal(`JSON_SEARCH(skill, 'one', '%${skill}%', NULL, '$.technical_skill')`),
                { [Op.ne]: null }
              )
            );
          });
        }
      }

      // Add fallback skills if provided
      if (searchParams.fallbackSkills) {
        const fallbackArray = searchParams.fallbackSkills.split(",").map(s => s.trim()).filter(Boolean);
        if (fallbackArray.length > 0) {
          fallbackArray.forEach(skill => {
            bestOrConditions.push(
              Sequelize.where(
                Sequelize.literal(`JSON_SEARCH(skill, 'one', '%${skill}%', NULL, '$.technical_skill')`),
                { [Op.ne]: null }
              )
            );
          });
        }
      }

      if (bestOrConditions.length > 0) {
        bestWhereClause[Op.or] = bestOrConditions;
      }

      // Fetch all students for ranking (limit to reasonable number for performance)
      const allStudents = await Student.findAll({
        where: bestWhereClause,
        attributes: [
          "StudentId",
          "salutation",
          "student_name",
          "email",
          "mobile",
          "university",
          "batch_no",
          "courseTitle",
          "package",
          "profession",
          "company",
          "designation",
          "experience",
          "employment",
          "skill",
          "lookingForJob",
          "isISTQBCertified",
          "knowMe",
          "remark",
          "due",
          "isEnrolled",
          "photo",
          "certificate",
          "get_certificate",
          "passingYear",
          "linkedin",
          "github",
          "isMobilePublic",
          "isEmailPublic",
          "isLinkedInPublic",
          "isGithubPublic",
          "createdAt",
        ],
        include: [
          {
            model: Course,
            attributes: ["courseId", "course_title"],
            required: false,
          },
        ],
        limit: 500, // Fetch more students for ranking
      });

      // Calculate scores for each student
      // If experience range was requested, filter students first to that range
      let candidatesForScoring = allStudents;
      if (searchParams.experience || searchParams.maxExperience) {
        const minExp = searchParams.experience
          ? parseFloat(searchParams.experience)
          : null;
        const maxExp = searchParams.maxExperience
          ? parseFloat(searchParams.maxExperience)
          : null;
        candidatesForScoring = allStudents.filter((s) => {
          try {
            const sd = s.toJSON();
            const emp =
              sd.employment && sd.employment.totalExperience
                ? parseFloat(sd.employment.totalExperience)
                : 0;
            if (minExp !== null && maxExp !== null) {
              return emp >= minExp && emp < maxExp + 1;
            } else if (minExp !== null) {
              return emp >= minExp;
            } else if (maxExp !== null) {
              return emp < maxExp + 1;
            }
            return true;
          } catch (e) {
            return false;
          }
        });
      }

      const scoredStudents = candidatesForScoring.map((student) => {
        let score = 0;
        const studentData = student.toJSON();

        // VERIFIED status - HIGHEST priority (+50 points)
        // Only treat as verified when `get_certificate` is strictly true (or numeric 1)
        if (
          studentData.get_certificate === true ||
          studentData.get_certificate === 1
        ) {
          score += 50;
        }

        // ISTQB certification - HIGH priority (+30 points)
        if (studentData.isISTQBCertified === "Yes") {
          score += 20;
        }

        // Number of technical skills - MEDIUM priority (+1 point per skill, max 20)
        if (
          studentData.skill &&
          typeof studentData.skill === "object" &&
          studentData.skill.technical_skill
        ) {
          let skillCount = 0;
          if (Array.isArray(studentData.skill.technical_skill)) {
            skillCount = studentData.skill.technical_skill.length;
          } else if (typeof studentData.skill.technical_skill === "string") {
            skillCount = studentData.skill.technical_skill.split(",").length;
          }
          score += Math.min(skillCount, 20); // Cap at 20 points
        }

        // Experience level - MEDIUM priority (+1 point per year, max 10)
        if (
          studentData.employment &&
          typeof studentData.employment === "object" &&
          studentData.employment.totalExperience
        ) {
          const experience =
            parseFloat(studentData.employment.totalExperience) || 0;
          score += Math.min(Math.floor(experience), 5); // Cap at 5 points
        }

        // Currently enrolled - LOW priority (+5 points)
        if (studentData.isEnrolled === true || studentData.isEnrolled === 1) {
          score += 5;
        }

        return {
          ...studentData,
          qualityScore: score,
        };
      });

      // Sort by quality score (descending) and return top N (respect requestedCount if provided)
      // Show all if requested, otherwise default to 15
      const maxReturn = showAllResults 
        ? scoredStudents.length // Return all scored students
        : (requestedCount && requestedCount > 0 ? requestedCount : 15);
      const topStudents = scoredStudents
        .sort((a, b) => b.qualityScore - a.qualityScore)
        .slice(0, maxReturn);

      // If no results found with specific skills, try fallback
      if (topStudents.length === 0 && (searchParams.skills || searchParams.fallbackSkills)) {
        // Fetch all students (no skill filter)
        const fallbackStudents = await Student.findAll({
          attributes: [
            "StudentId", "salutation", "student_name", "email", "mobile", "university",
            "batch_no", "courseTitle", "package", "profession", "company", "designation",
            "experience", "employment", "skill", "lookingForJob", "isISTQBCertified",
            "knowMe", "remark", "due", "isEnrolled", "photo", "certificate",
            "get_certificate", "passingYear", "linkedin", "github", "isMobilePublic",
            "isEmailPublic", "isLinkedInPublic", "isGithubPublic", "createdAt",
          ],
          include: [{ model: Course, attributes: ["courseId", "course_title"], required: false }],
          limit: 500,
        });

        // Apply experience filter if needed
        let fallbackCandidates = fallbackStudents;
        if (searchParams.experience || searchParams.maxExperience) {
          const minExp = searchParams.experience ? parseFloat(searchParams.experience) : null;
          const maxExp = searchParams.maxExperience ? parseFloat(searchParams.maxExperience) : null;
          fallbackCandidates = fallbackStudents.filter((s) => {
            try {
              const sd = s.toJSON();
              const emp = sd.employment?.totalExperience ? parseFloat(sd.employment.totalExperience) : 0;
              if (minExp !== null && maxExp !== null) return emp >= minExp && emp < maxExp + 1;
              if (minExp !== null) return emp >= minExp;
              if (maxExp !== null) return emp < maxExp + 1;
              return true;
            } catch (e) {
              return false;
            }
          });
        }

        // Score and sort
        const fallbackScored = fallbackCandidates.map(student => {
          let score = 0;
          const studentData = student.toJSON();
          
          if (studentData.get_certificate === true || studentData.get_certificate === 1) score += 50;
          if (studentData.isISTQBCertified === "Yes") score += 20;
          
          if (studentData.skill?.technical_skill) {
            const skillCount = Array.isArray(studentData.skill.technical_skill)
              ? studentData.skill.technical_skill.length
              : studentData.skill.technical_skill.split(",").length;
            score += Math.min(skillCount, 20);
          }
          
          if (studentData.employment?.totalExperience) {
            const experience = parseFloat(studentData.employment.totalExperience) || 0;
            score += Math.min(Math.floor(experience), 5);
          }
          
          if (studentData.isEnrolled === true || studentData.isEnrolled === 1) score += 5;
          
          return { ...studentData, qualityScore: score };
        });

        const fallbackTop = fallbackScored
          .sort((a, b) => b.qualityScore - a.qualityScore)
          .slice(0, maxReturn);

        // ✅ Filter private data based on privacy settings before sending to frontend
        const filteredFallbackTop = fallbackTop.map(studentData => {
          // ✅ Respect privacy settings - only include private fields if they are marked as public
          if (!studentData.isEmailPublic) {
            delete studentData.email;
          }
          if (!studentData.isMobilePublic) {
            delete studentData.mobile;
          }
          if (!studentData.isLinkedInPublic) {
            delete studentData.linkedin;
          }
          if (!studentData.isGithubPublic) {
            delete studentData.github;
          }
          
          return studentData;
        });

        return res.status(200).json({
          totalStudents: filteredFallbackTop.length,
          students: filteredFallbackTop,
          searchParams,
          originalQuery: query,
          isBestSearch: true,
          isFallbackSearch: true,
          requestedCount: requestedCount || null,
          aiMessage: "Sorry, I didn't find anyone as per your request but following candidate might be potential as per your request.",
          rankingCriteria: {
            verified: "50 points",
            istqbCertified: "20 points",
            skillsCount: "1 point per skill (max 20)",
            experienceYears: "1 point per year (max 5)",
            enrolled: "5 points",
          },
        });
      }

      // ✅ Filter private data based on privacy settings before sending to frontend
      const filteredTopStudents = topStudents.map(studentData => {
        // ✅ Respect privacy settings - only include private fields if they are marked as public
        if (!studentData.isEmailPublic) {
          delete studentData.email;
        }
        if (!studentData.isMobilePublic) {
          delete studentData.mobile;
        }
        if (!studentData.isLinkedInPublic) {
          delete studentData.linkedin;
        }
        if (!studentData.isGithubPublic) {
          delete studentData.github;
        }
        
        return studentData;
      });

      return res.status(200).json({
        totalStudents: filteredTopStudents.length,
        students: filteredTopStudents,
        searchParams,
        originalQuery: query,
        isBestSearch: true,
        requestedCount: requestedCount || null,
        aiMessage: filteredTopStudents.length > 0 ? "Here are the best matching candidates based on your requirements." : "No matching candidates found.",
        rankingCriteria: {
          verified: "50 points",
          istqbCertified: "20 points",
          skillsCount: "1 point per skill (max 20)",
          experienceYears: "1 point per year (max 5)",
          enrolled: "5 points",
        },
      });
    }

    // Build SQL where clause based on AI-extracted parameters
    let whereClause = {};
    let orConditions = [];

    // Filter by Verified (use `get_certificate` flag only)
    if (searchParams.verified === "Yes") {
      whereClause.get_certificate = true;
    } else if (searchParams.verified === "No") {
      whereClause.get_certificate = { [Op.or]: [false, null] };
    }

    // Filter by ISTQB Certification
    if (searchParams.isISTQBCertified) {
      whereClause.isISTQBCertified = searchParams.isISTQBCertified;
    }

    // Filter by Looking for Job
    if (searchParams.lookingForJob) {
      whereClause.lookingForJob = searchParams.lookingForJob;
    }

    // Filter by University
    if (searchParams.university) {
      whereClause.university = { [Op.like]: `%${searchParams.university}%` };
    }

    // Filter by Passing Year
    if (searchParams.passingYear) {
      whereClause.passingYear = { [Op.like]: `%${searchParams.passingYear}%` };
    }

    // Filter by Experience (supports range)
    if (searchParams.experience || searchParams.maxExperience) {
      const minExperience = searchParams.experience
        ? parseFloat(searchParams.experience)
        : null;
      const maxExp = searchParams.maxExperience
        ? parseFloat(searchParams.maxExperience)
        : null;

      whereClause[Sequelize.Op.and] = whereClause[Sequelize.Op.and] || [];

      if (
        minExperience !== null &&
        maxExp !== null &&
        !isNaN(minExperience) &&
        !isNaN(maxExp)
      ) {
        // Both min and max provided - range filter (max is exclusive, so we use < max+1)
        whereClause[Sequelize.Op.and].push(
          Sequelize.literal(
            `(employment IS NOT NULL AND JSON_EXTRACT(employment, '$.totalExperience') IS NOT NULL AND JSON_UNQUOTE(JSON_EXTRACT(employment, '$.totalExperience')) != '' AND JSON_UNQUOTE(JSON_EXTRACT(employment, '$.totalExperience')) REGEXP '^[0-9]+\\\\.?[0-9]*$' AND CAST(JSON_UNQUOTE(JSON_EXTRACT(employment, '$.totalExperience')) AS DECIMAL(10,2)) >= ${minExperience} AND CAST(JSON_UNQUOTE(JSON_EXTRACT(employment, '$.totalExperience')) AS DECIMAL(10,2)) < ${
              maxExp + 1
            })`
          )
        );
      } else if (minExperience !== null && !isNaN(minExperience)) {
        // Only minimum provided - minimum filter
        whereClause[Sequelize.Op.and].push(
          Sequelize.literal(
            `(employment IS NOT NULL AND JSON_EXTRACT(employment, '$.totalExperience') IS NOT NULL AND JSON_UNQUOTE(JSON_EXTRACT(employment, '$.totalExperience')) != '' AND JSON_UNQUOTE(JSON_EXTRACT(employment, '$.totalExperience')) REGEXP '^[0-9]+\\\\.?[0-9]*$' AND CAST(JSON_UNQUOTE(JSON_EXTRACT(employment, '$.totalExperience')) AS DECIMAL(10,2)) >= ${minExperience})`
          )
        );
      } else if (maxExp !== null && !isNaN(maxExp)) {
        // Only maximum provided - maximum filter (max is exclusive, so we use < max+1)
        whereClause[Sequelize.Op.and].push(
          Sequelize.literal(
            `(employment IS NOT NULL AND JSON_EXTRACT(employment, '$.totalExperience') IS NOT NULL AND JSON_UNQUOTE(JSON_EXTRACT(employment, '$.totalExperience')) != '' AND JSON_UNQUOTE(JSON_EXTRACT(employment, '$.totalExperience')) REGEXP '^[0-9]+\\\\.?[0-9]*$' AND CAST(JSON_UNQUOTE(JSON_EXTRACT(employment, '$.totalExperience')) AS DECIMAL(10,2)) < ${
              maxExp + 1
            })`
          )
        );
      }
    }

    // Filter by Company
    if (searchParams.company) {
      orConditions.push(
        { company: { [Op.like]: `%${searchParams.company}%` } },
        Sequelize.where(
          Sequelize.literal(
            `JSON_SEARCH(employment, 'one', '%${searchParams.company}%')`
          ),
          { [Op.ne]: null }
        )
      );
    }

    // Filter by Skills (with fallback logic)
    if (searchParams.skills) {
      const skillsArray = searchParams.skills
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s);

      if (skillsArray.length > 0) {
        const skillConditions = [];

        skillsArray.forEach((skill) => {
          skillConditions.push(
            Sequelize.where(
              Sequelize.literal(
                `JSON_SEARCH(skill, 'one', '%${skill}%', NULL, '$.technical_skill')`
              ),
              { [Op.ne]: null }
            )
          );
        });

        orConditions.push(...skillConditions);
      }
    }

    // Add fallback skills if provided (for when primary skills don't match)
    if (searchParams.fallbackSkills) {
      const fallbackSkillsArray = searchParams.fallbackSkills
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s);

      if (fallbackSkillsArray.length > 0) {
        const fallbackSkillConditions = [];

        fallbackSkillsArray.forEach((skill) => {
          fallbackSkillConditions.push(
            Sequelize.where(
              Sequelize.literal(
                `JSON_SEARCH(skill, 'one', '%${skill}%', NULL, '$.technical_skill')`
              ),
              { [Op.ne]: null }
            )
          );
        });

        // Add fallback skills as OR conditions (they will be used if primary skills don't match)
        orConditions.push(...fallbackSkillConditions);
      }
    }

    // Filter by Search Term (name, email, profession)
    if (searchParams.searchTerm) {
      const searchConditions = [
        { student_name: { [Op.like]: `%${searchParams.searchTerm}%` } },
        { email: { [Op.like]: `%${searchParams.searchTerm}%` } },
        { profession: { [Op.like]: `%${searchParams.searchTerm}%` } },
      ];

      if (orConditions.length > 0) {
        whereClause[Op.and] = [
          { [Op.or]: orConditions },
          { [Op.or]: searchConditions },
        ];
      } else {
        whereClause[Op.or] = searchConditions;
      }
    } else if (orConditions.length > 0) {
      whereClause[Op.or] = orConditions;
    }

    // Fetch matching students (respect requestedCount if present)
    // Show all results if user requested "all", otherwise default to 15
    const queryLimit = showAllResults 
      ? 10000 // Very high limit to show all results
      : (requestedCount && requestedCount > 0 ? requestedCount : 15);
    
    // Fetch matching students
    const students = await Student.findAll({
      where: whereClause,
      attributes: [
        "StudentId",
        "salutation",
        "student_name",
        "email",
        "mobile",
        "university",
        "batch_no",
        "courseTitle",
        "package",
        "profession",
        "company",
        "designation",
        "experience",
        "employment",
        "skill",
        "lookingForJob",
        "isISTQBCertified",
        "knowMe",
        "remark",
        "due",
        "isEnrolled",
        "photo",
        "certificate",
        "get_certificate",
        "passingYear",
        "linkedin",
        "github",
        "isMobilePublic",
        "isEmailPublic",
        "isLinkedInPublic",
        "isGithubPublic",
        "createdAt",
      ],
      include: [
        {
          model: Course,
          attributes: ["courseId", "course_title"],
          required: false,
        },
      ],
      order: [
        ["get_certificate", "DESC"],
        ["createdAt", "DESC"],
      ],
      limit: queryLimit, // Limit AI search results (respect requested count)
    });

    // If no exact matches found, return best matching profiles with fallback logic
    if (
      students.length === 0 &&
      (searchParams.skills || searchParams.fallbackSkills)
    ) {
      // Fetch all students for ranking with skill relevance
      const allStudents = await Student.findAll({
        attributes: [
          "StudentId",
          "salutation",
          "student_name",
          "email",
          "mobile",
          "university",
          "batch_no",
          "courseTitle",
          "package",
          "profession",
          "company",
          "designation",
          "experience",
          "employment",
          "skill",
          "lookingForJob",
          "isISTQBCertified",
          "knowMe",
          "remark",
          "due",
          "isEnrolled",
          "photo",
          "certificate",
          "get_certificate",
          "passingYear",
          "linkedin",
          "github",
          "isMobilePublic",
          "isEmailPublic",
          "isLinkedInPublic",
          "isGithubPublic",
          "createdAt",
        ],
        include: [
          {
            model: Course,
            attributes: ["courseId", "course_title"],
            required: false,
          },
        ],
        limit: 500, // Fetch more students for ranking
      });

      // If experience range was requested, filter students first to that range
      let candidatesForScoring = allStudents;
      if (searchParams.experience || searchParams.maxExperience) {
        const minExp = searchParams.experience
          ? parseFloat(searchParams.experience)
          : null;
        const maxExp = searchParams.maxExperience
          ? parseFloat(searchParams.maxExperience)
          : null;
        candidatesForScoring = allStudents.filter((s) => {
          try {
            const sd = s.toJSON();
            const emp =
              sd.employment && sd.employment.totalExperience
                ? parseFloat(sd.employment.totalExperience)
                : 0;
            if (minExp !== null && maxExp !== null) {
              return emp >= minExp && emp < maxExp + 1;
            } else if (minExp !== null) {
              return emp >= minExp;
            } else if (maxExp !== null) {
              return emp < maxExp + 1;
            }
            return true;
          } catch (e) {
            return false;
          }
        });
      }

      // Calculate scores for each student with skill relevance
      const scoredStudents = candidatesForScoring.map((student) => {
        let score = 0;
        let skillRelevance = 0;
        const studentData = student.toJSON();

        // VERIFIED status - HIGHEST priority (+50 points)
        // Only treat as verified when `get_certificate` is strictly true (or numeric 1)
        if (
          studentData.get_certificate === true ||
          studentData.get_certificate === 1
        ) {
          score += 50;
        }

        // ISTQB certification - HIGH priority (+30 points)
        if (studentData.isISTQBCertified === "Yes") {
          score += 20;
        }

        // Skill relevance - check if student has requested or fallback skills
        if (
          studentData.skill &&
          typeof studentData.skill === "object" &&
          studentData.skill.technical_skill
        ) {
          const studentSkills = Array.isArray(studentData.skill.technical_skill)
            ? studentData.skill.technical_skill
            : studentData.skill.technical_skill.split(",").map((s) => s.trim());

          const requestedSkills = searchParams.skills
            ? searchParams.skills.split(",").map((s) => s.trim())
            : [];
          const fallbackSkills = searchParams.fallbackSkills
            ? searchParams.fallbackSkills.split(",").map((s) => s.trim())
            : [];

          // Check for exact skill matches (higher weight)
          requestedSkills.forEach((skill) => {
            if (
              studentSkills.some((s) =>
                s.toLowerCase().includes(skill.toLowerCase())
              )
            ) {
              skillRelevance += 5; // Exact match gets 5 points
            }
          });

          // Check for fallback skill matches (lower weight)
          fallbackSkills.forEach((skill) => {
            if (
              studentSkills.some((s) =>
                s.toLowerCase().includes(skill.toLowerCase())
              )
            ) {
              skillRelevance += 5; // Fallback match gets 5 points
            }
          });

          score += skillRelevance;
        }

        // Number of technical skills - MEDIUM priority (+1 point per skill, max 20)
        if (
          studentData.skill &&
          typeof studentData.skill === "object" &&
          studentData.skill.technical_skill
        ) {
          let skillCount = 0;
          if (Array.isArray(studentData.skill.technical_skill)) {
            skillCount = studentData.skill.technical_skill.length;
          } else if (typeof studentData.skill.technical_skill === "string") {
            skillCount = studentData.skill.technical_skill.split(",").length;
          }
          score += Math.min(skillCount, 20); // Cap at 20 points
        }

        // Experience level - MEDIUM priority (+1 point per year, max 10)
        if (
          studentData.employment &&
          typeof studentData.employment === "object" &&
          studentData.employment.totalExperience
        ) {
          const experience =
            parseFloat(studentData.employment.totalExperience) || 0;
          score += Math.min(Math.floor(experience), 10); // Cap at 10 points
        }

        // Currently enrolled - LOW priority (+5 points)
        if (studentData.isEnrolled === true || studentData.isEnrolled === 1) {
          score += 5;
        }

        return {
          ...studentData,
          qualityScore: score,
          skillRelevance: skillRelevance,
        };
      });

      // Sort by quality score (descending) and return top N best matches (respect requestedCount)
      // Show all if requested, otherwise default to 15
      const fallbackMax = showAllResults
        ? scoredStudents.length // Return all scored students
        : (requestedCount && requestedCount > 0 ? requestedCount : 15);
      const bestMatchingStudents = scoredStudents
        .sort((a, b) => b.qualityScore - a.qualityScore)
        .slice(0, fallbackMax);

      // ✅ Filter private data based on privacy settings before sending to frontend
      const filteredBestMatching = bestMatchingStudents.map(studentData => {
        // ✅ Respect privacy settings - only include private fields if they are marked as public
        if (!studentData.isEmailPublic) {
          delete studentData.email;
        }
        if (!studentData.isMobilePublic) {
          delete studentData.mobile;
        }
        if (!studentData.isLinkedInPublic) {
          delete studentData.linkedin;
        }
        if (!studentData.isGithubPublic) {
          delete studentData.github;
        }
        
        return studentData;
      });

      return res.status(200).json({
        totalStudents: filteredBestMatching.length,
        students: filteredBestMatching,
        searchParams,
        originalQuery: query,
        isFallbackSearch: true,
        requestedCount: requestedCount || null,
        aiMessage:
          "Sorry, I didn't find exactly what you are looking for, but here are some best profile you might choose.",
      });
    }

    // ✅ Filter private data based on privacy settings before sending to frontend
    const filteredStudents = students.map(student => {
      const studentData = student.toJSON();
      
      // ✅ Respect privacy settings - only include private fields if they are marked as public
      if (!studentData.isEmailPublic) {
        delete studentData.email;
      }
      if (!studentData.isMobilePublic) {
        delete studentData.mobile;
      }
      if (!studentData.isLinkedInPublic) {
        delete studentData.linkedin;
      }
      if (!studentData.isGithubPublic) {
        delete studentData.github;
      }
      
      return studentData;
    });

    return res.status(200).json({
      totalStudents: filteredStudents.length,
      students: filteredStudents,
      searchParams, // Return extracted parameters for debugging
      originalQuery: query,
      requestedCount: requestedCount || null,
      aiMessage:
        filteredStudents.length > 0
          ? "Here are the top results based on your query."
          : "No matching profiles found.",
    });
  } catch (error) {
    console.error("Error in AI search:", error);
    return res.status(500).json({
      error: "AI search failed. Please try again or use manual filters.",
      details: error.message,
    });
  }
};

// ✅ Advanced Search for QA Talent
exports.searchQATalent = async (req, res) => {
  try {
    const {
      experience,
      maxExperience,
      skills,
      university,
      company,
      isISTQBCertified,
      lookingForJob,
      verified,
      passingYear,
      searchTerm,
      page = 1,
      limit = 10,
    } = req.query;

    const pageNumber = parseInt(page) || 1;
    const limitNumber = parseInt(limit) || 10;
    const offset = (pageNumber - 1) * limitNumber;

    let whereClause = {};
    let orConditions = [];

    // ✅ Filter by ISTQB Certification
    if (isISTQBCertified) {
      whereClause.isISTQBCertified = isISTQBCertified;
    }

    // ✅ Filter by Looking for Job
    if (lookingForJob) {
      whereClause.lookingForJob = lookingForJob;
    }

    // ✅ Filter by University
    if (university) {
      whereClause.university = { [Op.like]: `%${university}%` };
    }

    // ✅ Filter by Verified (use `get_certificate` flag only)
    if (verified === "Yes") {
      // Only select students where get_certificate is true
      whereClause.get_certificate = true;
    } else if (verified === "No") {
      // Explicitly filter out students with get_certificate true
      whereClause.get_certificate = { [Op.or]: [false, null] };
    }

    // ✅ Filter by Passing Year
    if (passingYear) {
      whereClause.passingYear = { [Op.like]: `%${passingYear}%` };
    }

    // ✅ Filter by Total Experience (numeric comparison for experience range from employment.totalExperience)
    if (experience || maxExperience) {
      const minExperience = experience ? parseFloat(experience) : null;
      const maxExp = maxExperience ? parseFloat(maxExperience) : null;

      whereClause[Sequelize.Op.and] = whereClause[Sequelize.Op.and] || [];

      if (
        minExperience !== null &&
        maxExp !== null &&
        !isNaN(minExperience) &&
        !isNaN(maxExp)
      ) {
        // Both min and max provided - range filter (max is exclusive, so we use < max+1)
        whereClause[Sequelize.Op.and].push(
          Sequelize.literal(
            `(employment IS NOT NULL AND JSON_EXTRACT(employment, '$.totalExperience') IS NOT NULL AND JSON_UNQUOTE(JSON_EXTRACT(employment, '$.totalExperience')) != '' AND JSON_UNQUOTE(JSON_EXTRACT(employment, '$.totalExperience')) REGEXP '^[0-9]+\\\\.?[0-9]*$' AND CAST(JSON_UNQUOTE(JSON_EXTRACT(employment, '$.totalExperience')) AS DECIMAL(10,2)) >= ${minExperience} AND CAST(JSON_UNQUOTE(JSON_EXTRACT(employment, '$.totalExperience')) AS DECIMAL(10,2)) < ${
              maxExp + 1
            })`
          )
        );
      } else if (minExperience !== null && !isNaN(minExperience)) {
        // Only minimum provided - minimum filter
        whereClause[Sequelize.Op.and].push(
          Sequelize.literal(
            `(employment IS NOT NULL AND JSON_EXTRACT(employment, '$.totalExperience') IS NOT NULL AND JSON_UNQUOTE(JSON_EXTRACT(employment, '$.totalExperience')) != '' AND JSON_UNQUOTE(JSON_EXTRACT(employment, '$.totalExperience')) REGEXP '^[0-9]+\\\\.?[0-9]*$' AND CAST(JSON_UNQUOTE(JSON_EXTRACT(employment, '$.totalExperience')) AS DECIMAL(10,2)) >= ${minExperience})`
          )
        );
      } else if (maxExp !== null && !isNaN(maxExp)) {
        // Only maximum provided - maximum filter (max is exclusive, so we use < max+1)
        whereClause[Sequelize.Op.and].push(
          Sequelize.literal(
            `(employment IS NOT NULL AND JSON_EXTRACT(employment, '$.totalExperience') IS NOT NULL AND JSON_UNQUOTE(JSON_EXTRACT(employment, '$.totalExperience')) != '' AND JSON_UNQUOTE(JSON_EXTRACT(employment, '$.totalExperience')) REGEXP '^[0-9]+\\\\.?[0-9]*$' AND CAST(JSON_UNQUOTE(JSON_EXTRACT(employment, '$.totalExperience')) AS DECIMAL(10,2)) < ${
              maxExp + 1
            })`
          )
        );
      }
    }

    // ✅ Filter by Company (search in company field and employment JSON)
    if (company) {
      orConditions.push(
        { company: { [Op.like]: `%${company}%` } },
        Sequelize.where(
          Sequelize.literal(`JSON_SEARCH(employment, 'one', '%${company}%')`),
          { [Op.ne]: null }
        )
      );
    }

    // ✅ Filter by Skills (search in skill JSON for both soft and technical skills)
    // Supports both comma-separated string and JSON array format
    if (skills) {
      const skillsArray = skills
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s);

      if (skillsArray.length > 0) {
        const skillConditions = [];

        skillsArray.forEach((skill) => {
          // Search in soft_skill (string)
          skillConditions.push(
            Sequelize.where(
              Sequelize.literal(
                `JSON_UNQUOTE(JSON_EXTRACT(skill, '$.soft_skill'))`
              ),
              { [Op.like]: `%${skill}%` }
            )
          );

          // Search in technical_skill (can be string or JSON array)
          skillConditions.push(
            Sequelize.where(
              Sequelize.literal(
                `JSON_UNQUOTE(JSON_EXTRACT(skill, '$.technical_skill'))`
              ),
              { [Op.like]: `%${skill}%` }
            )
          );

          // Search in JSON array elements for technical_skill
          skillConditions.push(
            Sequelize.where(
              Sequelize.literal(
                `JSON_SEARCH(skill, 'one', '${skill}', NULL, '$.technical_skill[*]')`
              ),
              { [Op.ne]: null }
            )
          );
        });

        orConditions.push(...skillConditions);
      }
    }

    // ✅ General Search Term (searches across name, email, profession)
    if (searchTerm) {
      const searchConditions = [
        { student_name: { [Op.like]: `%${searchTerm}%` } },
        { email: { [Op.like]: `%${searchTerm}%` } },
        { profession: { [Op.like]: `%${searchTerm}%` } },
      ];

      if (orConditions.length > 0) {
        whereClause[Op.and] = [
          { [Op.or]: orConditions },
          { [Op.or]: searchConditions },
        ];
      } else {
        whereClause[Op.or] = searchConditions;
      }
    } else if (orConditions.length > 0) {
      whereClause[Op.or] = orConditions;
    }

    // ✅ Get total count
    const totalStudents = await Student.count({
      where: whereClause,
      include: [
        {
          model: Course,
          attributes: ["courseId", "course_title"],
          required: false,
        },
      ],
    });

    // ✅ Fetch filtered students
    const studentsRaw = await Student.findAll({
      where: whereClause,
      attributes: [
        "StudentId",
        "salutation",
        "student_name",
        "email",
        "mobile",
        "university",
        "batch_no",
        "courseTitle",
        "package",
        "profession",
        "company",
        "designation",
        "experience",
        "employment",
        "skill",
        "lookingForJob",
        "isISTQBCertified",
        "knowMe",
        "remark",
        "due",
        "isEnrolled",
        "photo",
        "certificate",
        "get_certificate",
        "passingYear",
        "linkedin",
        "github",
        "isMobilePublic",
        "isEmailPublic",
        "isLinkedInPublic",
        "isGithubPublic",
        "createdAt",
      ],
      include: [
        {
          model: Course,
          attributes: ["courseId", "course_title"],
          required: false,
        },
      ],
      order: [
        ["get_certificate", "DESC"],
        ["createdAt", "DESC"],
      ],
      offset,
      limit: limitNumber,
    });

    // ✅ Filter private data based on privacy settings before sending to frontend
    const students = studentsRaw.map(student => {
      const studentData = student.toJSON();
      
      // ✅ Respect privacy settings - only include private fields if they are marked as public
      if (!studentData.isEmailPublic) {
        delete studentData.email;
      }
      if (!studentData.isMobilePublic) {
        delete studentData.mobile;
      }
      if (!studentData.isLinkedInPublic) {
        delete studentData.linkedin;
      }
      if (!studentData.isGithubPublic) {
        delete studentData.github;
      }
      
      return studentData;
    });

    return res.status(200).json({
      totalStudents,
      totalPages: Math.ceil(totalStudents / limitNumber),
      currentPage: pageNumber,
      students,
    });
  } catch (error) {
    console.error("Error searching QA talent:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
