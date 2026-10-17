const express = require('express');
const router = express.Router();
const { createAssignmentQuestion, getAllAssignmentQuestions, updateAssignmentQuestion, deleteAssignmentQuestion } = require('../controllers/assignmentQuestionController');
const { submitAssignmentAnswer, getAnswersByAssignmentId, getAnswersByStudentId, getAssignmentAnswerByStudentAndAssignmentId } = require('../controllers/assignmentAnswerController');
const { updateAssignmentScore } = require('../controllers/assignmentReviewController');
const { getAssignmentSummaryByCourse } = require('../controllers/assignmentSummaryController');
const { evaluateAssignmentAnswer } = require('../controllers/assignmentEvaluationController');
const { authenticateUser, requireAdmin } = require("../middlewares/authMiddleware");
const { rateLimit } = require("../middlewares/rateLimiter");

// LLM-backed and billable: cap evaluations per IP.
const evaluationLimiter = rateLimit({ windowMs: 60 * 1000, max: 10 });

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
router.get('/summary', authenticateUser, getAssignmentSummaryByCourse);

module.exports = router;
