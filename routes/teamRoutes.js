const express = require("express");
const { addTeamMember, getTeamMembers } = require("../controllers/teamController");

const router = express.Router();

// ✅ Route to Add a New Team Member
router.post("/teams", addTeamMember);

// ✅ Route to Get Team Members List
router.get("/teams", getTeamMembers);

module.exports = router;
