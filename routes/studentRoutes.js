const express = require("express");
const { studentSignup, getAllStudents, getStudentById, updateStudent, deleteStudentById, markAttendance, getAttendance, getAllAttendance, migrateStudent, getAllCompanies, getCourseProgress, deleteAttendance, sendContactEmail, saveCertificate, getQaTalent  } = require("../controllers/studentController");
const { searchQATalent, aiSearchQATalent } = require("../controllers/qaTalentController");
const { authenticateUser, requireAdmin } = require("../middlewares/authMiddleware");

const router = express.Router();

// ✅ Student Signup Route
router.post("/signup", studentSignup);
router.get("/list", authenticateUser, requireAdmin, getAllStudents);
router.get("/public-list", getQaTalent);
router.get("/search-talent", searchQATalent);
router.post("/ai-search", aiSearchQATalent);
router.post("/send-contact-email", sendContactEmail);
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
router.post("/save-certificate/:studentId", authenticateUser, saveCertificate);

module.exports = router;
