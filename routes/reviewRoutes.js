const express = require("express");
const router = express.Router();
const { createReview, listReviews, updateReview, deleteReview, updateReviewPriorities } = require("../controllers/reviewController");

router.post("/create", createReview);
router.get("/list", listReviews);
router.put("/update/:id", updateReview);
router.delete("/delete/:id", deleteReview);
router.put("/update-priorities", updateReviewPriorities);

module.exports = router;
