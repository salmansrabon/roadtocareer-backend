const express = require("express");
const router = express.Router();
const { createModule, listModule, getModulesByCourseId, updateModule, deleteModule } = require("../controllers/moduleController");
const { authenticateUser, requireAdmin } = require("../middlewares/authMiddleware");

router.post("/add", authenticateUser, requireAdmin, createModule);
router.get("/list", listModule)
router.get("/:courseId", getModulesByCourseId);
router.put("/update/:courseId", authenticateUser, requireAdmin, updateModule);
router.delete("/delete/:courseId", authenticateUser, requireAdmin, deleteModule);

module.exports = router;
