const express = require("express");
const { addTeamMember, getTeamMembers, updateTeamMember, deleteTeamMember } = require("../controllers/teamController");
const { authenticateUser, requireAdmin } = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/add", authenticateUser,requireAdmin, addTeamMember);
router.get("/list", getTeamMembers);
router.put("/update/:id", authenticateUser,requireAdmin, updateTeamMember);
router.delete("/delete/:id", authenticateUser,requireAdmin, deleteTeamMember);

module.exports = router;
