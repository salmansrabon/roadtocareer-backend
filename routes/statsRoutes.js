const express = require("express");
const router = express.Router();
const { getLandingStats, getCompanyLogos } = require("../controllers/statsController");

// Public: aggregate counts only, read by the landing page's server render.
router.get("/landing", getLandingStats);
// Public: company name + logo + headcount for the "Where Our Students Work" strip.
router.get("/company-logos", getCompanyLogos);

module.exports = router;
