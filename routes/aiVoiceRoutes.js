const express = require("express");
const { createRealtimeSession, saveInterviewResult, getInterviewAttempts, processTranscript } = require("../controllers/aiVoiceTalkController");
const { authenticateUser } = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/realtime-session", authenticateUser, createRealtimeSession);
router.post("/save-result", authenticateUser, saveInterviewResult);
router.get("/interview-attempts/:studentId", authenticateUser, getInterviewAttempts);
router.post("/process-transcript", authenticateUser, processTranscript);

module.exports = router;
