const express = require("express");
const { studentSignup, getAllStudents, getAlumniList, getStudentById, updateStudent, deleteStudentById, markAttendance, getAttendance, getAllAttendance, migrateStudent, getAllCompanies, getAllUniversities, getCourseProgress, deleteAttendance, sendContactEmail, saveCertificate, getQaTalent, getStudentsWithAIInterviews  } = require("../controllers/studentController");
const { searchQATalent, aiSearchQATalent } = require("../controllers/qaTalentController");
const { addRemark, updateRemark, deleteRemark, getRemarks } = require("../controllers/remarkController");
const { authenticateUser, requireAdmin } = require("../middlewares/authMiddleware");

const router = express.Router();

// ✅ Student Signup Route
router.post("/signup", studentSignup);
router.get("/list", authenticateUser, requireAdmin, getAllStudents);
router.get("/alumni", authenticateUser, getAlumniList);
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
router.get("/:studentId/remarks", authenticateUser, requireAdmin, getRemarks);
router.post("/:studentId/remarks", authenticateUser, requireAdmin, addRemark);
router.put("/:studentId/remarks/:index", authenticateUser, requireAdmin, updateRemark);
router.delete("/:studentId/remarks/:index", authenticateUser, requireAdmin, deleteRemark);
router.get("/companies/list", getAllCompanies);
router.get("/universities/list", getAllUniversities);
router.get("/course-progress/:studentId", authenticateUser, getCourseProgress);
router.post("/save-certificate/:studentId", authenticateUser, saveCertificate);
router.get("/ai-interviews/list", authenticateUser, requireAdmin, getStudentsWithAIInterviews);

module.exports = router;
