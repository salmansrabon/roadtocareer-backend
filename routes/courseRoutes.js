const express = require("express");
const router = express.Router();

const { createCourse, getCourseDetails, getCoursesList } = require("../controllers/courseController.js");
const { authenticateUser, requireAdmin } = require("../middlewares/authMiddleware");

// ✅ Create Course API
router.post("/create",authenticateUser,requireAdmin, createCourse);
router.get("/list", getCoursesList);
router.get("/:courseId", getCourseDetails);

module.exports = router;
