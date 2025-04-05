const express = require("express");
const router = express.Router();
const { createResume, updateResume, getAllResumes, deleteResume } = require("../controllers/resumeController");
const { authenticateUser, requireAdmin } = require("../middlewares/authMiddleware");


router.post("/create", authenticateUser, createResume);
router.put("/update/:studentId", updateResume);
router.get("/list", getAllResumes);
router.delete("/delete/:studentId", deleteResume);

module.exports = router;
