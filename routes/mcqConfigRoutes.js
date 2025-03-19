const express = require("express");
const router = express.Router();
const mcqConfigController = require("../controllers/mcqConfigController");
const { authenticateUser, requireAdmin } = require("../middlewares/authMiddleware");

router.post("/create",authenticateUser, requireAdmin, mcqConfigController.createMcqConfig);
router.get("/:CourseId", mcqConfigController.getMcqConfigByCourse);
router.get("/", mcqConfigController.getMcqConfigByCourse);
router.put("/:CourseId", mcqConfigController.updateMcqConfigByCourse);
router.delete("/:CourseId", mcqConfigController.deleteMcqConfigByCourse);

module.exports = router;
