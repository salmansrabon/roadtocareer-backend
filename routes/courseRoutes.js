const express = require("express");
const router = express.Router();

const { createCourse, getCourseDetails, getCoursesList, updateCourse, deleteCourse } = require("../controllers/courseController.js");
const { authenticateUser, requireAdmin } = require("../middlewares/authMiddleware");

router.post("/create",authenticateUser,requireAdmin, createCourse);
router.get("/list", getCoursesList);
router.get("/:courseId", getCourseDetails);
router.put("/update/:courseId", updateCourse);
router.delete("/delete/:courseId", deleteCourse);

module.exports = router;
