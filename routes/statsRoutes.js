const express = require("express");
const router = express.Router();
const { getLandingStats } = require("../controllers/statsController");

// Public: aggregate counts only, read by the landing page's server render.
router.get("/landing", getLandingStats);

module.exports = router;
