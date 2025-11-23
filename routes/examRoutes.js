const express = require("express");
const router = express.Router();
const { authenticateUser, requireAdmin } = require("../middlewares/authMiddleware");

// Import controllers
const examQuestionController = require("../controllers/examQuestionController");
const examConfigController = require("../controllers/examConfigController");
const examSubmissionController = require("../controllers/examSubmissionController");
const examAIEvaluationController = require("../controllers/examAIEvaluationController");

// ==============================================
// EXAM QUESTION ROUTES (Admin Only)
// ==============================================

// Create exam questions for a course
router.post("/questions", authenticateUser, requireAdmin, examQuestionController.createExamQuestions);

// Get all exam questions (Admin view with pagination)
router.get("/questions", authenticateUser, requireAdmin, examQuestionController.getAllExamQuestions);

// Get exam questions by course ID
router.get("/questions/course/:courseId", authenticateUser, requireAdmin, examQuestionController.getExamQuestionsByCourse);

// Update exam questions
router.put("/questions/:id", authenticateUser, requireAdmin, examQuestionController.updateExamQuestions);

// Delete exam questions
router.delete("/questions/:id", authenticateUser, requireAdmin, examQuestionController.deleteExamQuestions);

// ==============================================
// EXAM CONFIGURATION ROUTES
// ==============================================

// Create exam configuration (Admin only)
router.post("/config", authenticateUser, requireAdmin, examConfigController.createExamConfig);

// Get all exam configurations (Admin view with pagination and filters)
router.get("/config", authenticateUser, requireAdmin, examConfigController.getAllExamConfigs);

// Get exam configuration by ID (Admin only)
router.get("/config/:id", authenticateUser, requireAdmin, examConfigController.getExamConfigById);

// Update exam configuration (Admin only)
router.put("/config/:id", authenticateUser, requireAdmin, examConfigController.updateExamConfig);

// Delete exam configuration (Admin only)
router.delete("/config/:id", authenticateUser, requireAdmin, examConfigController.deleteExamConfig);

// Get student submissions for an exam (Admin only)
router.get("/config/:examId/submissions", authenticateUser, requireAdmin, examConfigController.getExamSubmissions);

// ==============================================
// STUDENT EXAM ROUTES
// ==============================================

// Get active exams for student's course/batch
router.get("/student/active", authenticateUser, examConfigController.getActiveExamsForStudent);

// Get exam questions for student (without hints)
router.get("/student/:examId", authenticateUser, examSubmissionController.getExamForStudent);

// Submit exam answers
router.post("/student/:examId/submit", authenticateUser, examSubmissionController.submitExamAnswers);

// Get student's exam result
router.get("/student/:examId/result", authenticateUser, examSubmissionController.getStudentExamResult);

// ==============================================
// EXAM EVALUATION ROUTES (Admin Only)
// ==============================================

// Get student submission for evaluation (Admin only)
router.get("/evaluate/:examId/:studentId", authenticateUser, requireAdmin, examSubmissionController.getStudentSubmissionForEvaluation);

// Evaluate student submission (Admin only)
router.put("/evaluate/:examId/:studentId", authenticateUser, requireAdmin, examSubmissionController.evaluateStudentSubmission);

// ==============================================
// AI EVALUATION ROUTES (Admin Only)
// ==============================================

// AI evaluation for a single question (Admin only)
router.post("/ai-evaluate/:examId/:studentId", authenticateUser, requireAdmin, examAIEvaluationController.evaluateWithAI);

// AI evaluation for all questions (Admin only)
router.post("/ai-evaluate-all/:examId/:studentId", authenticateUser, requireAdmin, examAIEvaluationController.evaluateAllWithAI);

module.exports = router;
