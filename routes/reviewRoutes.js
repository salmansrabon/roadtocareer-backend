const express = require("express");
const router = express.Router();
const { createReview, listReviews, updateReview, deleteReview, updateReviewPriorities } = require("../controllers/reviewController");
const { authenticateUser, requireAdmin } = require("../middlewares/authMiddleware");

router.post("/create", authenticateUser, requireAdmin, createReview);
router.get("/list", listReviews);
router.put("/update/:id", authenticateUser, requireAdmin, updateReview);
router.delete("/delete/:id", authenticateUser, requireAdmin, deleteReview);
router.put("/update-priorities", authenticateUser, requireAdmin, updateReviewPriorities);

module.exports = router;
