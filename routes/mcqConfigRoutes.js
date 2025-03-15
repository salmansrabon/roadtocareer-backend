const express = require("express");
const router = express.Router();
const mcqConfigController = require("../controllers/mcqConfigController");

router.post("/create", mcqConfigController.createMcqConfig);
router.get("/:CourseId", mcqConfigController.getMcqConfigByCourse);
router.get("/", mcqConfigController.getMcqConfigByCourse);
router.put("/:CourseId", mcqConfigController.updateMcqConfigByCourse);
router.delete("/:CourseId", mcqConfigController.deleteMcqConfigByCourse);

module.exports = router;
