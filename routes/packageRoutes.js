const express = require("express");
const router = express.Router();
const { createPackage, getAllPackages, updatePackage, deletePackage, getPackageByCourse } = require("../controllers/packageController");

router.post("/create", createPackage);
router.get("/list", getAllPackages);
router.get("/course/:courseId", getPackageByCourse);
router.put("/update/:id", updatePackage);
router.delete("/delete/:id", deletePackage);

module.exports = router;
