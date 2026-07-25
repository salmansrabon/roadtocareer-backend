const express = require("express");
const router = express.Router();
const { getAllEvents } = require("../controllers/eventController");
const { authenticateUser, requireAdmin } = require("../middlewares/authMiddleware");

router.get("/list", authenticateUser, requireAdmin, getAllEvents);

module.exports = router;
