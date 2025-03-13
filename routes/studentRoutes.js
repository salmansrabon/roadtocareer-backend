const express = require("express");
const { studentSignup, getAllStudents, getStudentById, updateStudent, deleteStudentById, markAttendance, getAttendance  } = require("../controllers/studentController");
const { authenticateUser, requireAdmin } = require("../middlewares/authMiddleware");

const router = express.Router();

// ✅ Student Signup Route
router.post("/signup", studentSignup);
router.get("/list", authenticateUser, requireAdmin, getAllStudents);
router.get("/:studentId", getStudentById);
router.put("/:studentId", updateStudent);
router.delete("/:studentId", deleteStudentById);
router.post("/mark-attendance", markAttendance);
router.get("/attendance/:studentId", getAttendance);

module.exports = router;