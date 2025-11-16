/**
 * AI Search Test Cases for QA Talent Discovery
 * Run with: node test-ai-search.js
 */

const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const systemPrompt = `You are a SQL query assistant for a QA talent database. Extract search parameters from natural language queries.

Database Schema:
- students table with fields: student_name, email, university, batch_no, passingYear, company, designation, profession, lookingForJob (enum: 'Yes'/'No'), isISTQBCertified (enum: 'Yes'/'No'), certificate (URL string - when present, student is "verified")
- employment (JSON): { totalExperience: "2.5", company: [{companyName, designation, experience}] }
- skill (JSON): { soft_skill: "text", technical_skill: ["Selenium", "Java", "Python", "JavaScript", "Cypress", "Playwright", "Postman", "API Testing", "TestNG", "JUnit", "Manual Testing", "Automation Testing", "Performance Testing", "Mobile Testing", "JIRA", "SQL"] }

IMPORTANT SKILL MAPPING RULES:
1. When user says "automation expert" or "automation engineer" or "automation tester", map to: "Selenium,Playwright,Cypress,TestNG,Automation Testing"
2. When user says "API expert" or "API testing", map to: "API Testing,Postman,RestAssured"
3. When user says "manual tester" or "manual testing", map to: "Manual Testing,JIRA,Test Case Design"
4. When user says "performance tester", map to: "Performance Testing,JMeter,LoadRunner"
5. When user says "mobile tester" or "mobile testing", map to: "Mobile Testing,Appium,Android,iOS"
6. When user says "web automation", map to: "Selenium,Playwright,Cypress"
7. Always include related skills for broad terms (e.g., "Java expert" should include "Selenium,TestNG" if testing context)

IMPORTANT VERIFICATION RULES:
- When user says "verified" or "verified QA" or "verified engineers", set "hasCertificate": true (NOT isISTQBCertified)
- "Verified" means student has completed our course and has a certificate URL
- ISTQB certified is different from verified - it's an international certification

IMPORTANT JOB SEEKING RULES:
- When user says "available candidates", "available QA", "open to opportunities", set "lookingForJob": "Yes"
- "Available" and "looking for opportunities" both mean actively seeking employment

Return ONLY a valid JSON object with these optional fields:
{
  "experience": number (minimum years),
  "maxExperience": number (maximum years),
  "skills": "comma,separated,skills",
  "university": "string",
  "company": "string",
  "lookingForJob": "Yes" or "No",
  "isISTQBCertified": "Yes" or "No",
  "hasCertificate": true (for verified students with certificate URL),
  "batch_no": "string",
  "passingYear": "string",
  "searchTerm": "string for name/email/profession search"
}

Examples:
User: "Find QA with 2 years experience and Playwright expert"
Response: {"experience": 2, "skills": "Playwright"}

User: "Looking for ISTQB certified testers from Dhaka University"
Response: {"isISTQBCertified": "Yes", "university": "Dhaka University"}

User: "Find QA engineers with Selenium and Java, at least 3 years experience"
Response: {"experience": 3, "skills": "Selenium,Java"}

User: "Show me QA with 2 to 5 years experience"
Response: {"experience": 2, "maxExperience": 5}

User: "Find testers with less than 3 years experience"
Response: {"maxExperience": 3}

User: "Find me some automation expert"
Response: {"skills": "Selenium,Playwright,Cypress,TestNG,Automation Testing"}

User: "Looking for API testing specialists"
Response: {"skills": "API Testing,Postman,RestAssured"}

User: "Find experienced manual testers"
Response: {"skills": "Manual Testing,JIRA,Test Case Design"}

User: "Need web automation engineers with 2+ years"
Response: {"experience": 2, "skills": "Selenium,Playwright,Cypress"}

User: "Find me verified QA engineers"
Response: {"hasCertificate": true}

User: "Looking for verified automation experts"
Response: {"hasCertificate": true, "skills": "Selenium,Playwright,Cypress,TestNG,Automation Testing"}

User: "Show me ISTQB certified testers"
Response: {"isISTQBCertified": "Yes"}

User: "Find available candidates"
Response: {"lookingForJob": "Yes"}

User: "Show me QA open to opportunities"
Response: {"lookingForJob": "Yes"}`;

// Test cases that HR might use
const testCases = [
    // Basic automation queries
    {
        query: "Find me some automation expert",
        expected: {
            skills: expect => expect.includes("Selenium") || expect.includes("Automation")
        },
        description: "Should map automation expert to relevant automation skills"
    },
    {
        query: "Looking for automation engineers",
        expected: {
            skills: expect => expect.includes("Selenium") || expect.includes("Automation")
        },
        description: "Should recognize automation engineers"
    },
    {
        query: "Need automation testers with 3 years experience",
        expected: {
            experience: 3,
            skills: expect => expect.includes("Automation") || expect.includes("Selenium")
        },
        description: "Should combine experience and automation skills"
    },

    // Verified candidates
    {
        query: "Find me verified QA engineers",
        expected: {
            hasCertificate: true
        },
        description: "Should filter by certificate for verified candidates"
    },
    {
        query: "Show me verified candidates",
        expected: {
            hasCertificate: true
        },
        description: "Should recognize verified candidates"
    },
    {
        query: "Looking for verified automation experts",
        expected: {
            hasCertificate: true,
            skills: expect => expect.includes("Automation") || expect.includes("Selenium")
        },
        description: "Should combine verified status with automation skills"
    },

    // ISTQB vs Verified distinction
    {
        query: "Find ISTQB certified testers",
        expected: {
            isISTQBCertified: "Yes"
        },
        description: "Should distinguish ISTQB from verified"
    },
    {
        query: "Show me ISTQB certified engineers",
        expected: {
            isISTQBCertified: "Yes"
        },
        description: "Should filter by ISTQB certification"
    },

    // API Testing
    {
        query: "Looking for API testing specialists",
        expected: {
            skills: expect => expect.includes("API Testing") || expect.includes("Postman")
        },
        description: "Should map API testing to relevant skills"
    },
    {
        query: "Need API expert",
        expected: {
            skills: expect => expect.includes("API")
        },
        description: "Should recognize API expert"
    },

    // Manual Testing
    {
        query: "Find manual testers",
        expected: {
            skills: expect => expect.includes("Manual Testing") || expect.includes("JIRA")
        },
        description: "Should map manual testing to relevant skills"
    },
    {
        query: "Looking for experienced manual QA",
        expected: {
            skills: expect => expect.includes("Manual")
        },
        description: "Should recognize manual QA"
    },

    // Web Automation
    {
        query: "Need web automation engineers",
        expected: {
            skills: expect => expect.includes("Selenium") || expect.includes("Playwright") || expect.includes("Cypress")
        },
        description: "Should map web automation to Selenium/Playwright/Cypress"
    },

    // Experience ranges
    {
        query: "Find QA with 2 to 5 years experience",
        expected: {
            experience: 2,
            maxExperience: 5
        },
        description: "Should extract experience range"
    },
    {
        query: "Looking for testers with less than 3 years experience",
        expected: {
            maxExperience: 3
        },
        description: "Should extract maximum experience for 'less than' queries"
    },
    {
        query: "Need senior QA with 5+ years",
        expected: {
            experience: 5
        },
        description: "Should extract minimum experience for '5+' queries"
    },

    // Complex combined queries
    {
        query: "Find verified automation expert with 3 years experience",
        expected: {
            hasCertificate: true,
            experience: 3,
            skills: expect => expect.includes("Automation") || expect.includes("Selenium")
        },
        description: "Should handle complex multi-parameter query"
    },
    {
        query: "Looking for ISTQB certified Selenium expert from BRAC University",
        expected: {
            isISTQBCertified: "Yes",
            skills: expect => expect.includes("Selenium"),
            university: expect => expect.includes("BRAC")
        },
        description: "Should extract multiple parameters"
    },
    {
        query: "Need verified API testers looking for job",
        expected: {
            hasCertificate: true,
            lookingForJob: "Yes",
            skills: expect => expect.includes("API")
        },
        description: "Should combine verified, job seeking, and API skills"
    },

    // Job seeking
    {
        query: "Show me QA looking for job opportunities",
        expected: {
            lookingForJob: "Yes"
        },
        description: "Should extract job seeking status"
    },
    {
        query: "Find available candidates",
        expected: {
            lookingForJob: "Yes"
        },
        description: "Should recognize 'available' as looking for job"
    },

    // University queries
    {
        query: "Find QA from Dhaka University",
        expected: {
            university: expect => expect.includes("Dhaka")
        },
        description: "Should extract university name"
    },

    // Performance and Mobile Testing
    {
        query: "Looking for performance testers",
        expected: {
            skills: expect => expect.includes("Performance")
        },
        description: "Should map performance testing"
    },
    {
        query: "Need mobile testing experts",
        expected: {
            skills: expect => expect.includes("Mobile")
        },
        description: "Should map mobile testing"
    }
];

async function testAISearch(query) {
    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: query }
            ],
            temperature: 0.3,
            max_tokens: 500
        });

        const aiResponse = completion.choices[0].message.content.trim();
        
        // Parse AI response
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        } else {
            return JSON.parse(aiResponse);
        }
    } catch (error) {
        console.error("Error calling OpenAI:", error.message);
        return null;
    }
}

function validateResponse(response, expected) {
    const errors = [];
    
    for (const [key, expectedValue] of Object.entries(expected)) {
        if (typeof expectedValue === 'function') {
            // Custom validator function
            if (!expectedValue(response[key])) {
                errors.push(`${key}: Expected custom validation to pass, got "${response[key]}"`);
            }
        } else if (response[key] !== expectedValue) {
            errors.push(`${key}: Expected "${expectedValue}", got "${response[key]}"`);
        }
    }
    
    return errors;
}

async function runTests() {
    console.log("🧪 Starting AI Search Test Suite\n");
    console.log("=".repeat(80) + "\n");
    
    let passed = 0;
    let failed = 0;
    const failures = [];

    for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        console.log(`Test ${i + 1}/${testCases.length}: ${testCase.description}`);
        console.log(`Query: "${testCase.query}"`);
        
        const response = await testAISearch(testCase.query);
        
        if (!response) {
            console.log("❌ FAILED: Could not get AI response\n");
            failed++;
            failures.push({
                test: testCase.description,
                query: testCase.query,
                error: "No response from AI"
            });
            continue;
        }
        
        console.log(`Response: ${JSON.stringify(response, null, 2)}`);
        
        const errors = validateResponse(response, testCase.expected);
        
        if (errors.length === 0) {
            console.log("✅ PASSED\n");
            passed++;
        } else {
            console.log("❌ FAILED");
            errors.forEach(error => console.log(`   - ${error}`));
            console.log();
            failed++;
            failures.push({
                test: testCase.description,
                query: testCase.query,
                expected: testCase.expected,
                actual: response,
                errors
            });
        }
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log("=".repeat(80));
    console.log("\n📊 Test Results:");
    console.log(`   ✅ Passed: ${passed}/${testCases.length}`);
    console.log(`   ❌ Failed: ${failed}/${testCases.length}`);
    console.log(`   Success Rate: ${((passed / testCases.length) * 100).toFixed(1)}%\n`);
    
    if (failures.length > 0) {
        console.log("=".repeat(80));
        console.log("\n❌ Failed Tests Summary:\n");
        failures.forEach((failure, index) => {
            console.log(`${index + 1}. ${failure.test}`);
            console.log(`   Query: "${failure.query}"`);
            if (failure.errors) {
                console.log(`   Issues:`);
                failure.errors.forEach(error => console.log(`      - ${error}`));
            } else {
                console.log(`   Error: ${failure.error}`);
            }
            console.log();
        });
    }
}

// Run the tests
runTests().catch(console.error);
