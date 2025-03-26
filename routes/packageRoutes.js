const express = require("express");
const router = express.Router();
const {createPackage, getAllPackages, updatePackage, deletePackage} = require("../controllers/packageController");

router.post("/create", createPackage);
router.get("/list", getAllPackages);
router.put("/update/:id", updatePackage);
router.delete("/delete/:id", deletePackage);
module.exports = router;
