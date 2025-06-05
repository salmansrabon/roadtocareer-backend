const express = require("express");
const router = express.Router();
const { createResume, updateResume, getAllResumes, deleteResume, getAllStudentResumes } = require("../controllers/resumeController");
const { authenticateUser, requireAdmin } = require("../middlewares/authMiddleware");

const multer = require("multer");
const path = require("path");
const resumeController = require("../controllers/resumeController");

// Set up multer for file upload
const upload = multer({
  dest: path.join(__dirname, "..", "uploads/"),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      cb(new Error("Only PDF files are allowed."), false);
    } else {
      cb(null, true);
    }
  },
});



router.post("/create", authenticateUser, createResume);
router.put("/update/:studentId", updateResume);
router.get("/list", getAllResumes);
router.delete("/delete/:studentId", deleteResume);
router.get("/students", authenticateUser, getAllStudentResumes); //list all the students resume
router.post("/evaluate", upload.single("resume"), resumeController.evaluateResume);

module.exports = router;
