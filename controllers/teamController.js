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
// ✅ Update Team Member
exports.updateTeamMember = async (req, res) => {
    const { id } = req.params;
    try {
        const teamMember = await Team.findByPk(id);
        if (!teamMember) {
            return res.status(404).json({ message: "Team member not found" });
        }

        await teamMember.update(req.body);
        res.status(200).json({ message: "Team member updated successfully", member: teamMember });
    } catch (err) {
        console.error("Update error:", err);
        res.status(500).json({ message: "Server error during update" });
    }
};

// ✅ Delete Team Member
exports.deleteTeamMember = async (req, res) => {
    const { id } = req.params;
    try {
        const deleted = await Team.destroy({ where: { id } });

        if (!deleted) {
            return res.status(404).json({ message: "Team member not found" });
        }

        res.status(200).json({ message: "Team member deleted successfully" });
    } catch (err) {
        console.error("Delete error:", err);
        res.status(500).json({ message: "Server error during deletion" });
    }
};
