const express = require("express");
const router = express.Router();
const { createRealtimeSession } = require("../controllers/aiVoiceTalkController");

// POST /api/ai-voice/realtime-session - Create realtime interview session
router.post("/realtime-session", createRealtimeSession);

module.exports = router;
