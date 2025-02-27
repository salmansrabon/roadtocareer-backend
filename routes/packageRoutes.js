const express = require("express");
const router = express.Router();
const Package = require("../models/Package");
const Course = require("../models/Course"); // ✅ Import Course Model for validation

// ✅ Create a New Course Package
router.post("/create", async (req, res) => {
    try {
        const { courseId, packageName, studentFee, jobholderFee, installment } = req.body;

        // ✅ Check if a package already exists for this course
        const existingPackage = await Package.findOne({ where: { courseId } });

        if (existingPackage) {
            return res.status(400).json({ message: "A package is already created for this course." });
        }

        // ✅ Create new package
        const newPackage = await Package.create({
            courseId,
            packageName,
            studentFee,
            jobholderFee,
            installment
        });

        res.status(201).json({ message: "Package created successfully", package: newPackage });
    } catch (error) {
        console.error("Error creating package:", error);
        res.status(500).json({ message: "Internal server error", error });
    }
});

module.exports = router;
