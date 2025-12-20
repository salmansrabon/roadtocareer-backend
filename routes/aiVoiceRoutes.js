const express = require("express");
const { createRealtimeSession, saveInterviewResult, getInterviewAttempts, processTranscript } = require("../controllers/aiVoiceTalkController");

const router = express.Router();

router.post("/realtime-session", createRealtimeSession);
router.post("/save-result", saveInterviewResult);
router.get("/interview-attempts/:studentId", getInterviewAttempts);
router.post("/process-transcript", processTranscript);

module.exports = router;
