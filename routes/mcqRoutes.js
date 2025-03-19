const express = require("express");
const { addMCQ, updateMCQ, getMCQ, validateMCQAnswer, getStudentResult, checkQuizAttempt, getAllStudentsResultsByCourse } = require("../controllers/mcqController");
const { authenticateUser, requireAdmin } = require("../middlewares/authMiddleware");

const router = express.Router();

// ✅ API to Store MCQs
router.post("/add", authenticateUser, requireAdmin, addMCQ);
router.put("/update/:mcq_id", updateMCQ);
router.get("/fetch/:courseId", getMCQ);
router.get("/fetch", authenticateUser, requireAdmin, getMCQ);
router.post("/validate", validateMCQAnswer);
router.get("/result/:studentId", getStudentResult);
router.get("/result/list/:courseId", getAllStudentsResultsByCourse);
router.get("/attempt-status/:studentId", checkQuizAttempt);

module.exports = router;
