const express = require("express");
const { studentSignup, getAllStudents, getAlumniList, getStudentById, updateStudent, deleteStudentById, markAttendance, getAttendance, getAllAttendance, migrateStudent, getAllCompanies, getAllUniversities, getCourseProgress, deleteAttendance, sendContactEmail, saveCertificate, getQaTalent  } = require("../controllers/studentController");
const { searchQATalent, aiSearchQATalent } = require("../controllers/qaTalentController");
const { addRemark, updateRemark, deleteRemark, getRemarks } = require("../controllers/remarkController");
const { authenticateUser, requireAdmin } = require("../middlewares/authMiddleware");
const { rateLimit } = require("../middlewares/rateLimiter");

const router = express.Router();

// AI-backed / outbound-email endpoints that must stay public (they power the
// public /qa-talent page) but are billable or otherwise abusable — rate
// limited per IP instead of authenticated.
const aiSearchLimiter = rateLimit({ windowMs: 60 * 1000, max: 10 });
const contactEmailLimiter = rateLimit({ windowMs: 60 * 1000, max: 5 });

// ✅ Student Signup Route
router.post("/signup", studentSignup);
router.get("/list", authenticateUser, requireAdmin, getAllStudents);
router.get("/alumni", authenticateUser, getAlumniList);
router.get("/public-list", getQaTalent);
router.get("/search-talent", searchQATalent);
router.post("/ai-search", aiSearchLimiter, aiSearchQATalent);
router.post("/send-contact-email", contactEmailLimiter, sendContactEmail);
// Deliberately public (no authenticateUser): getStudentById does its own
// manual, optional token check and field-level redaction (mobile/email
// gated by isMobilePublic/isEmailPublic unless the caller is the owner or
// an admin/teacher) — it was built to serve both the authenticated profile
// view AND the public /portfolio/[slug] page from one endpoint. TASK-46's
// TASK-48 security pass (commit c117a67) added authenticateUser here too,
// which 401/403s before the request ever reaches that redaction logic,
// breaking every public portfolio page outright (confirmed via `curl` and a
// live agent-browser QA pass, 2026-09-04). PUT/DELETE below stay
// authenticated — those were genuine unauthenticated-write vulnerabilities
// per SECURITY-unauthenticated-endpoints.md; this GET was not.
router.get("/:studentId", getStudentById);
router.put("/:studentId", authenticateUser, updateStudent);
router.delete("/:studentId", authenticateUser, requireAdmin, deleteStudentById);
router.post("/mark-attendance", authenticateUser, markAttendance);
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

module.exports = router;
