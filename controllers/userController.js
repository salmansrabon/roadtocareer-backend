const User = require("../models/User"); // Import User model

exports.updateUserStatus = async (req, res) => {
    try {
        const { studentId } = req.params; // Extract Student ID from URL params
        const { isValid } = req.body; // Extract isValid status from request body

        // ✅ Ensure isValid is provided and is either 0 or 1
        if (typeof isValid === "undefined" || ![0, 1].includes(parseInt(isValid))) {
            return res.status(400).json({ message: "Invalid isValid value. Must be 0 or 1." });
        }

        // ✅ Find User by StudentId (mapped as username)
        const user = await User.findOne({ where: { username: studentId } });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // ✅ Update isValid status
        await user.update({ isValid });

        return res.status(200).json({ message: "User status updated successfully", isValid });
    } catch (error) {
        console.error("Error updating user status:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
