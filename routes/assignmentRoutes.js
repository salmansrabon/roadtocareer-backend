const express = require('express');
const router = express.Router();
const { createAssignmentQuestion, getAllAssignmentQuestions, updateAssignmentQuestion } = require('../controllers/assignmentQuestionController');
const { submitAssignmentAnswer, getAnswersByAssignmentId, getAnswersByStudentId, getAssignmentAnswerByStudentAndAssignmentId } = require('../controllers/assignmentAnswerController');
const {updateAssignmentScore} = require('../controllers/assignmentReviewController');

router.post('/question', createAssignmentQuestion);
router.get('/question/list', getAllAssignmentQuestions);
router.put('/question/:id', updateAssignmentQuestion);
router.post('/answer', submitAssignmentAnswer);
router.get('/answer/assignment/:assignmentId', getAnswersByAssignmentId);
router.get('/answer/student/:studentId', getAnswersByStudentId);
router.get('/answer', getAssignmentAnswerByStudentAndAssignmentId);
router.put('/review/assignment/:assignmentId', updateAssignmentScore);

module.exports = router;
