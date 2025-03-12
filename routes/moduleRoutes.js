const express = require("express");
const router = express.Router();
const { createModule, listModule, getModulesByCourseId, updateModule, deleteModule } = require("../controllers/moduleController");

router.post("/add", createModule);
router.get("/list", listModule)
router.get("/:courseId", getModulesByCourseId);
router.put("/update/:courseId", updateModule);
router.delete("/delete/:courseId", deleteModule);

module.exports = router;
