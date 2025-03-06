const express = require("express");
const router = express.Router();

const { createCourse, getCourseDetails, getCoursesList } = require("../controllers/courseController.js");

// ✅ Create Course API
router.post("/create", createCourse);
router.get("/list", getCoursesList);
router.get("/:courseId", getCourseDetails);

module.exports = router;
