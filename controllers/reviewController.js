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
        const { isEnabled, limit = 10, offset = 0 } = req.query;

        const whereClause = {};
        if (isEnabled === "true") {
            whereClause.rEnable = 1;
        }

        const reviews = await Review.findAll({
            where: whereClause,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [
                ["priority", "ASC"],
                ["updatedAt", "DESC"]
            ]
        });

        const totalCount = await Review.count({ where: whereClause });

        return res.status(200).json({
            totalReviews: totalCount,
            reviews
        });

    } catch (error) {
        console.error("❌ Error fetching reviews:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

exports.updateReview = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Check if the review exists
        const review = await Review.findByPk(id);

        if (!review) {
            return res.status(404).json({ success: false, message: "Review not found" });
        }

        // Update the review
        await review.update(updateData);

        return res.status(200).json({
            success: true,
            message: "Review updated successfully",
            review,
        });

    } catch (error) {
        console.error("Error updating review:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.deleteReview = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if the review exists
        const review = await Review.findByPk(id);

        if (!review) {
            return res.status(404).json({
                success: false,
                message: "Review not found",
            });
        }

        // Delete the review
        await review.destroy();

        return res.status(200).json({
            success: true,
            message: "Review deleted successfully",
        });

    } catch (error) {
        console.error("Error deleting review:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
