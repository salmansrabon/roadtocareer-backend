const express = require("express");
const router = express.Router();
const resumeController = require("../controllers/resumeController");
const { getAllResumeEvaluations, deleteResumeEvaluation } = resumeController;
const { authenticateUser } = require("../middlewares/authMiddleware");
const { rateLimit } = require("../middlewares/rateLimiter");

const multer = require("multer");
const path = require("path");

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


// Public by design (job-seeker resume check on the public job-detail page);
// rate limited per IP since it's a billable OpenAI call.
const evaluateLimiter = rateLimit({ windowMs: 60 * 1000, max: 5 });
router.post("/evaluate", evaluateLimiter, upload.single("resume"), resumeController.evaluateResume);
router.get("/evaluations", authenticateUser, getAllResumeEvaluations);
router.delete("/evaluations/:id", authenticateUser, deleteResumeEvaluation);

module.exports = router;
