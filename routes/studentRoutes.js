const express = require("express");
const { studentSignup, getAllStudents, getStudentById, updateStudent, deleteStudentById, markAttendance, getAttendance, getAllAttendance, migrateStudent, getAllCompanies, getCourseProgress, deleteAttendance, searchQATalent  } = require("../controllers/studentController");
const { authenticateUser, requireAdmin } = require("../middlewares/authMiddleware");

const router = express.Router();

// ✅ Student Signup Route
router.post("/signup", studentSignup);
router.get("/list", authenticateUser, requireAdmin, getAllStudents);
router.get("/public-list", getAllStudents);
router.get("/search-talent", searchQATalent);
router.get("/:studentId", getStudentById);
router.put("/:studentId", updateStudent);
router.delete("/:studentId", deleteStudentById);
router.post("/mark-attendance", markAttendance);
router.get("/attendance/:studentId", authenticateUser, getAttendance);
router.get("/list/attendance", authenticateUser, requireAdmin, getAllAttendance);
router.delete("/attendance/:studentId/:index", authenticateUser, requireAdmin, deleteAttendance);
router.post("/migrate/:studentId", authenticateUser, requireAdmin, migrateStudent);
router.get("/companies/list", getAllCompanies);
router.get("/course-progress/:studentId", authenticateUser, getCourseProgress);

module.exports = router;