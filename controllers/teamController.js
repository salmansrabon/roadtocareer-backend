const Team = require("../models/Teams");

/**
 * ✅ Add a Team Member
 * @route POST /api/teams
 */
exports.addTeamMember = async (req, res) => {
    try {
        const { name, company, designation, email, whatsapp, linkedin, about, photo } = req.body;

        // ✅ Create New Team Member
        const newMember = await Team.create({ name, company, designation, email, whatsapp, linkedin, about, photo });

        return res.status(201).json({ success: true, message: "Team member added successfully!", member: newMember });
    } catch (error) {
        console.error("Error adding team member:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

/**
 * ✅ Get List of Team Members
 * @route GET /api/teams
 */
exports.getTeamMembers = async (req, res) => {
    try {
        // ✅ Fetch all team members
        const members = await Team.findAll({ order: [["createdAt", "DESC"]] });

        return res.status(200).json({ success: true, totalMembers: members.length, members });
    } catch (error) {
        console.error("Error fetching team members:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
