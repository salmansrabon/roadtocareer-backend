const Review = require("../models/Reviews");

// ✅ Create a Review
exports.createReview = async (req, res) => {
    try {
        const {
            name, image, batch, rating, description, designation,
            company, university, facebook, whatsapp, linkedin, rEnable, priority
        } = req.body;

        const review = await Review.create({
            name, image, batch, rating, description, designation,
            company, university, facebook, whatsapp, linkedin, rEnable, priority
        });

        return res.status(201).json({ success: true, message: "Review added successfully!", review });
    } catch (error) {
        console.error("Error creating review:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// ✅ List All Reviews
exports.listReviews = async (req, res) => {
    try {
        const reviews = await Review.findAll({ order: [["priority", "DESC"], ["createdAt", "DESC"]] });

        return res.status(200).json({ totalReviews: reviews.length, reviews });
    } catch (error) {
        console.error("Error fetching reviews:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};
