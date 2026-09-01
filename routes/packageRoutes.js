const express = require("express");
const router = express.Router();
const { createPackage, getAllPackages, updatePackage, deletePackage, getPackageByCourse } = require("../controllers/packageController");
const { authenticateUser, requireAdmin } = require("../middlewares/authMiddleware");

router.post("/create", authenticateUser, requireAdmin, createPackage);
router.get("/list", getAllPackages);
router.get("/course/:courseId", getPackageByCourse);
router.put("/update/:id", authenticateUser, requireAdmin, updatePackage);
router.delete("/delete/:id", authenticateUser, requireAdmin, deletePackage);

module.exports = router;
