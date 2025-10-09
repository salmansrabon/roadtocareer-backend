const express = require("express");
const router = express.Router();
const { chatbotResponse } = require("../controllers/chatbotController");

// POST /api/chatbot/chat - Main chatbot endpoint
router.post("/chat", chatbotResponse);

module.exports = router;
