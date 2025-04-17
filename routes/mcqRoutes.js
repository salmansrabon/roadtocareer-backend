const express = require("express");
const { addMCQ, updateMCQ, deleteMCQ, getMCQ, validateMCQAnswer, getStudentResult, checkQuizAttempt, getAllStudentsResultsByCourse, copyMCQQuestions } = require("../controllers/mcqController");
const { authenticateUser, requireAdmin } = require("../middlewares/authMiddleware");

const router = express.Router();

// ✅ API to Store MCQs
router.post("/add", authenticateUser, requireAdmin, addMCQ);
router.put("/update/:mcq_id", updateMCQ);
router.delete("/delete/:mcq_id", deleteMCQ);
router.get("/fetch/:courseId", getMCQ);
router.get("/admin/fetch/:courseId", authenticateUser, requireAdmin, getMCQ);
router.get("/fetch", authenticateUser, requireAdmin, getMCQ);
router.post("/validate", validateMCQAnswer);
router.get("/result/:studentId", getStudentResult);
router.get("/result/list/:courseId", authenticateUser,requireAdmin, getAllStudentsResultsByCourse);
router.get("/attempt-status/:studentId", checkQuizAttempt);
router.post("/copy/:CourseId", authenticateUser, requireAdmin, copyMCQQuestions);

module.exports = router;
