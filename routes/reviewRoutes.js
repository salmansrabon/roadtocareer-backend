const express = require("express");
const router = express.Router();
const { createReview, listReviews } = require("../controllers/reviewController");

// ✅ Add Review
router.post("/create", createReview);

// ✅ Get All Reviews
router.get("/list", listReviews);

module.exports = router;
