const express = require("express");
const router = express.Router();
const { chatbotResponse } = require("../controllers/chatbotController");
const { rateLimit } = require("../middlewares/rateLimiter");

// POST /api/chatbot/chat - Main chatbot endpoint. Public by design; rate
// limited per IP since it is LLM-backed and billable.
const chatLimiter = rateLimit({ windowMs: 60 * 1000, max: 20 });
router.post("/chat", chatLimiter, chatbotResponse);

module.exports = router;
