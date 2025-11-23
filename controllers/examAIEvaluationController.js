const axios = require('axios');
const Student = require("../models/Student");

// AI Evaluation using GPT-4o
exports.evaluateWithAI = async (req, res) => {
    try {
        const { examId, studentId } = req.params;
        const { questionNumber } = req.body;

        console.log("=== AI EVALUATION REQUEST ===");
        console.log("Exam ID:", examId);
        console.log("Student ID:", studentId);
        console.log("Question Number:", questionNumber);

        // Validate input
        if (!questionNumber) {
            return res.status(400).json({ message: "Question number is required" });
        }

        // Get student
        const student = await Student.findOne({
            where: { StudentId: studentId }
        });

        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        // Get student's exam answer
        const examAnswers = student.exam_answer || [];
        const submission = examAnswers.find(answer => answer.exam_id === parseInt(examId));

        if (!submission) {
            return res.status(404).json({ message: "No submission found for this exam" });
        }

        // Find the specific question answer
        const answerData = submission.answers.find(answer => answer.questionNumber === parseInt(questionNumber));

        if (!answerData) {
            return res.status(404).json({ message: "Question not found in submission" });
        }

        // Prepare the prompt for GPT-4o
        const prompt = `
You are a friendly teacher evaluating a student's exam answer. Use casual, human-like language and keep feedback SHORT and CONCISE (2-3 sentences max).

**Question:**
${answerData.question}

**Expected Answer/Hint:**
${answerData.hint}

**Student's Answer:**
${answerData.student_answer || 'No answer provided'}

**Maximum Score:** ${answerData.max_score} marks

INSTRUCTIONS:
- Use friendly phrases like: "Fantastic!", "Good but...", "Very well", "Nice try", "I think not the proper way you answered", "Perfect!", "Almost there!"
- Keep feedback SHORT (2-3 sentences only)
- If student didn't answer or gave wrong answer, include the correct answer briefly
- Be encouraging but honest

Format your response as JSON:
{
  "score": <numeric_score>,
  "feedback": "<short_human_styled_feedback>"
}

Examples:
- "Fantastic! You got it perfectly right."
- "Good but you missed the main concept. The correct answer should include [key point]."
- "Very well explained! Just need to add [missing detail]."
- "I think not the proper way you answered. Try focusing on [correct approach]."
- "No answer provided. The correct answer is: [brief correct answer]."
`;

        console.log("Sending prompt to OpenAI:", prompt);

        // Call OpenAI API
        const openAIResponse = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert educational evaluator. Always respond with valid JSON format containing "score" and "feedback" fields.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 1000,
                temperature: 0.3
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log("OpenAI Response:", openAIResponse.data);

        if (!openAIResponse.data.choices || !openAIResponse.data.choices[0]) {
            throw new Error('Invalid response from OpenAI API');
        }

        let evaluationResult;
        try {
            // Parse the AI response
            const aiContent = openAIResponse.data.choices[0].message.content.trim();
            console.log("AI Content:", aiContent);
            
            // Try to extract JSON from the response
            const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                evaluationResult = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('No JSON found in AI response');
            }
        } catch (parseError) {
            console.error('Error parsing AI response:', parseError);
            // Fallback: try to extract score and feedback manually
            const scoreMatch = aiContent.match(/score["\s:]*(\d+(?:\.\d+)?)/i);
            const feedbackMatch = aiContent.match(/feedback["\s:]*["']?([^"'}]+)/i);
            
            evaluationResult = {
                score: scoreMatch ? parseFloat(scoreMatch[1]) : 0,
                feedback: feedbackMatch ? feedbackMatch[1] : 'AI evaluation completed but could not parse feedback properly.'
            };
        }

        // Validate the score
        const score = Math.min(Math.max(0, parseFloat(evaluationResult.score) || 0), parseFloat(answerData.max_score));
        const feedback = evaluationResult.feedback || 'AI evaluation completed.';

        console.log("Final AI Evaluation Result:", { score, feedback });

        res.status(200).json({
            message: "AI evaluation completed successfully",
            data: {
                questionNumber: parseInt(questionNumber),
                score: score,
                feedback: feedback,
                maxScore: answerData.max_score,
                aiResponse: openAIResponse.data.choices[0].message.content
            }
        });

    } catch (error) {
        console.error("Error in AI evaluation:", error);
        
        if (error.response && error.response.data) {
            console.error("OpenAI API Error:", error.response.data);
        }
        
        res.status(500).json({ 
            message: "AI evaluation failed", 
            error: error.message,
            details: error.response?.data?.error?.message || 'Unknown error'
        });
    }
};

// Evaluate all questions with AI
exports.evaluateAllWithAI = async (req, res) => {
    try {
        const { examId, studentId } = req.params;

        console.log("=== AI EVALUATION ALL QUESTIONS ===");
        console.log("Exam ID:", examId);
        console.log("Student ID:", studentId);

        // Get student
        const student = await Student.findOne({
            where: { StudentId: studentId }
        });

        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        // Get student's exam answer
        const examAnswers = student.exam_answer || [];
        const submission = examAnswers.find(answer => answer.exam_id === parseInt(examId));

        if (!submission) {
            return res.status(404).json({ message: "No submission found for this exam" });
        }

        const evaluatedQuestions = [];
        const errors = [];

        // Evaluate each question with AI
        for (const answerData of submission.answers) {
            try {
                // Prepare the prompt for GPT-4o
                const prompt = `
You are a friendly teacher evaluating a student's exam answer. Use casual, human-like language and keep feedback SHORT and CONCISE (2-3 sentences max).

**Question:**
${answerData.question}

**Expected Answer/Hint:**
${answerData.hint}

**Student's Answer:**
${answerData.student_answer || 'No answer provided'}

**Maximum Score:** ${answerData.max_score} marks

INSTRUCTIONS:
- Use friendly phrases like: "Fantastic!", "Good but...", "Very well", "Nice try", "I think not the proper way you answered", "Perfect!", "Almost there!"
- Keep feedback SHORT (2-3 sentences only)
- If student didn't answer or gave wrong answer, include the correct answer briefly
- Be encouraging but honest

Format your response as JSON:
{
  "score": <numeric_score>,
  "feedback": "<short_human_styled_feedback>"
}

Examples:
- "Fantastic! You got it perfectly right."
- "Good but you missed the main concept. The correct answer should include [key point]."
- "Very well explained! Just need to add [missing detail]."
- "I think not the proper way you answered. Try focusing on [correct approach]."
- "No answer provided. The correct answer is: [brief correct answer]."
`;

                // Call OpenAI API
                const openAIResponse = await axios.post(
                    'https://api.openai.com/v1/chat/completions',
                    {
                        model: 'gpt-4o',
                        messages: [
                            {
                                role: 'system',
                                content: 'You are an expert educational evaluator. Always respond with valid JSON format containing "score" and "feedback" fields.'
                            },
                            {
                                role: 'user',
                                content: prompt
                            }
                        ],
                        max_tokens: 1000,
                        temperature: 0.3
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );

                let evaluationResult;
                try {
                    // Parse the AI response
                    const aiContent = openAIResponse.data.choices[0].message.content.trim();
                    
                    // Try to extract JSON from the response
                    const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        evaluationResult = JSON.parse(jsonMatch[0]);
                    } else {
                        throw new Error('No JSON found in AI response');
                    }
                } catch (parseError) {
                    console.error('Error parsing AI response for question', answerData.questionNumber, ':', parseError);
                    // Fallback: try to extract score and feedback manually
                    const aiContent = openAIResponse.data.choices[0].message.content.trim();
                    const scoreMatch = aiContent.match(/score["\s:]*(\d+(?:\.\d+)?)/i);
                    const feedbackMatch = aiContent.match(/feedback["\s:]*["']?([^"'}]+)/i);
                    
                    evaluationResult = {
                        score: scoreMatch ? parseFloat(scoreMatch[1]) : 0,
                        feedback: feedbackMatch ? feedbackMatch[1] : 'AI evaluation completed but could not parse feedback properly.'
                    };
                }

                // Validate the score
                const score = Math.min(Math.max(0, parseFloat(evaluationResult.score) || 0), parseFloat(answerData.max_score));
                const feedback = evaluationResult.feedback || 'AI evaluation completed.';

                evaluatedQuestions.push({
                    questionNumber: answerData.questionNumber,
                    score: score,
                    feedback: feedback
                });

                // Add small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (questionError) {
                console.error(`Error evaluating question ${answerData.questionNumber}:`, questionError);
                errors.push({
                    questionNumber: answerData.questionNumber,
                    error: questionError.message
                });
            }
        }

        res.status(200).json({
            message: "AI evaluation completed",
            data: {
                evaluatedQuestions: evaluatedQuestions,
                totalQuestions: submission.answers.length,
                successfullyEvaluated: evaluatedQuestions.length,
                errors: errors
            }
        });

    } catch (error) {
        console.error("Error in AI evaluation (all questions):", error);
        res.status(500).json({ 
            message: "AI evaluation failed", 
            error: error.message
        });
    }
};
