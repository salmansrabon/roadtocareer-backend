const Package = require("../models/Package");
const Course = require("../models/Course");

exports.createPackage = async (req, res) => {
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
};
// 🔹 GET: List all packages
exports.getAllPackages = async (req, res) => {
    try {
        const packages = await Package.findAll();
        res.status(200).json({ success: true, packages });
    } catch (err) {
        console.error("Error fetching packages:", err);
        res.status(500).json({ success: false, message: "Failed to load packages" });
    }
};

// 🔹 PUT: Update package
exports.updatePackage = async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    try {
        const existing = await Package.findByPk(id);

        if (!existing) {
            return res.status(404).json({ success: false, message: "Package not found" });
        }

        await existing.update(updateData);
        res.status(200).json({ success: true, message: "Package updated successfully", package: existing });
    } catch (err) {
        console.error("Error updating package:", err);
        res.status(500).json({ success: false, message: "Failed to update package" });
    }
};

// 🔹 DELETE: Delete package
exports.deletePackage = async (req, res) => {
    const { id } = req.params;

    try {
        const existing = await Package.findByPk(id);

        if (!existing) {
            return res.status(404).json({ success: false, message: "Package not found" });
        }

        await existing.destroy();
        res.status(200).json({ success: true, message: "Package deleted successfully" });
    } catch (err) {
        console.error("Error deleting package:", err);
        res.status(500).json({ success: false, message: "Failed to delete package" });
    }
};