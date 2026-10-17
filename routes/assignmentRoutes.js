const express = require('express');
const router = express.Router();
const { createAssignmentQuestion, getAllAssignmentQuestions, updateAssignmentQuestion, deleteAssignmentQuestion } = require('../controllers/assignmentQuestionController');
const { submitAssignmentAnswer, getAnswersByAssignmentId, getAnswersByStudentId, getAssignmentAnswerByStudentAndAssignmentId } = require('../controllers/assignmentAnswerController');
const { updateAssignmentScore } = require('../controllers/assignmentReviewController');
const { getAssignmentSummaryByCourse } = require('../controllers/assignmentSummaryController');
const { evaluateAssignmentAnswer } = require('../controllers/assignmentEvaluationController');
const { chatAboutAssignmentAnswer } = require('../controllers/assignmentEvaluationChatController');
const { authenticateUser, requireAdmin } = require("../middlewares/authMiddleware");
const { rateLimit } = require("../middlewares/rateLimiter");

// LLM-backed and billable: cap evaluations per IP.
const evaluationLimiter = rateLimit({ windowMs: 60 * 1000, max: 10 });
// Chat turns are frequent but each is one billable call; separate bucket from Evaluate.
const chatLimiter = rateLimit({ windowMs: 60 * 1000, max: 30 });

router.post('/question', authenticateUser, requireAdmin, createAssignmentQuestion);
router.get('/question/list', authenticateUser, getAllAssignmentQuestions);
router.put('/question/:id', authenticateUser, requireAdmin, updateAssignmentQuestion);
router.delete('/question/:id', authenticateUser, requireAdmin, deleteAssignmentQuestion);
router.post('/answer',authenticateUser, submitAssignmentAnswer);
router.get('/answer/assignment/:assignmentId', authenticateUser, getAnswersByAssignmentId);
router.get('/answer/student/:studentId',authenticateUser, getAnswersByStudentId);
router.get('/answer', authenticateUser, getAssignmentAnswerByStudentAndAssignmentId);
// requireAdmin (admin + teacher) — grading must not be callable by students.
// Without it any authenticated student could POST a score for a classmate and,
// since reviewing now also notifies and emails, spam the whole batch.
router.put('/review/assignment/:assignmentId', authenticateUser, requireAdmin, updateAssignmentScore);
// AI draft review (TASK-64). Read-only suggestion; saving still goes through the route above.
router.post('/answer/:answerId/evaluate', authenticateUser, requireAdmin, evaluationLimiter, evaluateAssignmentAnswer);
router.post('/answer/:answerId/evaluate/chat', authenticateUser, requireAdmin, chatLimiter, chatAboutAssignmentAnswer);
// requireAdmin: the summary lists every student's email, scores and submission links.
router.get('/summary', authenticateUser, requireAdmin, getAssignmentSummaryByCourse);

module.exports = router;
