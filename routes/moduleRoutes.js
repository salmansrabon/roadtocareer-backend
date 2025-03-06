const express = require("express");
const router = express.Router();
const { createModule, listModule, getModulesByCourseId } = require("../controllers/moduleController");

// ✅ Route to add a new module
router.post("/add", createModule);
router.get("/list", listModule)
router.get("/:courseId", getModulesByCourseId);

module.exports = router;
