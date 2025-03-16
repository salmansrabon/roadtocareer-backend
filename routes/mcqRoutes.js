const express = require("express");
const { addMCQ, getMCQ, validateMCQAnswer, getStudentResult, checkQuizAttempt, getAllStudentsResultsByCourse } = require("../controllers/mcqController");
const Student = require("../models/Student");

const router = express.Router();

// ✅ API to Store MCQs
router.post("/add", addMCQ);
router.get("/fetch/:courseId", getMCQ);
router.get("/fetch", getMCQ);
router.post("/validate", validateMCQAnswer);
router.get("/result/:studentId", getStudentResult);
router.get("/result/list/:courseId", getAllStudentsResultsByCourse);
router.get("/attempt-status/:studentId", checkQuizAttempt);

module.exports = router;
