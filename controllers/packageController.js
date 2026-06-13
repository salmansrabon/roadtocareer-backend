const Package = require("../models/Package");
const Course = require("../models/Course");

// Helper function to process installment input (handles both JSON string and comma-separated string)
const processInstallmentInput = (installmentInput) => {
    if (!installmentInput) return null;
    
    // If it's already a JSON object, return as-is
    if (typeof installmentInput === 'object' && installmentInput !== null) {
        return installmentInput;
    }
    
    // If it's a string, check if it's JSON or comma-separated
    if (typeof installmentInput === 'string') {
        // Try to parse as JSON first
        try {
            const parsed = JSON.parse(installmentInput);
            if (parsed && typeof parsed === 'object' && parsed.total && parsed.amount) {
                return parsed;
            }
        } catch (e) {
            // If JSON parsing fails, treat as comma-separated string
        }
        
        // Handle comma-separated string
        const amounts = installmentInput.split(',').map(amount => parseInt(amount.trim()));
        return {
            total: amounts.length,
            amount: amounts
        };
    }
    
    return null;
};

exports.createPackage = async (req, res) => {
    try {
        const { courseId, packageName, discountedFee, regularFee, installment } = req.body;

        // ✅ Check if a package already exists for this course
        const existingPackage = await Package.findOne({ where: { courseId } });

        if (existingPackage) {
            return res.status(400).json({ message: "A package is already created for this course." });
        }

        // Process installment input (convert comma-separated string to JSON object)
        const processedInstallment = processInstallmentInput(installment);

        // ✅ Create new package
        const newPackage = await Package.create({
            courseId,
            packageName,
            discountedFee,
            regularFee,
            installment: processedInstallment
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
        const packages = await Package.findAll({
            include: {
                model: Course,
                attributes: ["batch_no", "is_enabled"]
            }
        });

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

        // Process installment if it's being updated
        if (updateData.installment) {
            updateData.installment = processInstallmentInput(updateData.installment);
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

// 🔹 GET: Get package by course ID
exports.getPackageByCourse = async (req, res) => {
    const { courseId } = req.params;
    try {
        const pkg = await Package.findOne({ where: { courseId } });
        if (!pkg) {
            return res.status(404).json({ success: false, message: "No package found for this course." });
        }
        res.status(200).json({ success: true, package: pkg });
    } catch (err) {
        console.error("Error fetching package by course:", err);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};
