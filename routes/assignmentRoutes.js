const express = require('express');
const router = express.Router();
const { createAssignmentQuestion, getAllAssignmentQuestions, updateAssignmentQuestion, deleteAssignmentQuestion } = require('../controllers/assignmentQuestionController');
const { submitAssignmentAnswer, getAnswersByAssignmentId, getAnswersByStudentId, getAssignmentAnswerByStudentAndAssignmentId } = require('../controllers/assignmentAnswerController');
const { updateAssignmentScore } = require('../controllers/assignmentReviewController');
const { getAssignmentSummaryByCourse } = require('../controllers/assignmentSummaryController');
const { authenticateUser, requireAdmin } = require("../middlewares/authMiddleware");

router.post('/question', authenticateUser, requireAdmin, createAssignmentQuestion);
router.get('/question/list', authenticateUser, getAllAssignmentQuestions);
router.put('/question/:id', authenticateUser, requireAdmin, updateAssignmentQuestion);
router.delete('/question/:id', authenticateUser, requireAdmin, deleteAssignmentQuestion);
router.post('/answer',authenticateUser, submitAssignmentAnswer);
router.get('/answer/assignment/:assignmentId', authenticateUser, getAnswersByAssignmentId);
router.get('/answer/student/:studentId',authenticateUser, getAnswersByStudentId);
router.get('/answer', authenticateUser, getAssignmentAnswerByStudentAndAssignmentId);
router.put('/review/assignment/:assignmentId', authenticateUser, updateAssignmentScore);
router.get('/summary', authenticateUser, getAssignmentSummaryByCourse);

module.exports = router;
