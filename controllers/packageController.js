const { Op } = require("sequelize");
const Package = require("../models/Package");
const Course = require("../models/Course");
const Student = require("../models/Student");

const sameName = (a, b) => String(a ?? "").trim().toLowerCase() === String(b ?? "").trim().toLowerCase();

// Payments and dues look a package up by (courseId, packageName), so a package
// that students already use must keep its name and its row.
const countStudentsOnPackage = (pkg) =>
    Student.count({ where: { CourseId: pkg.courseId, package: pkg.packageName } });

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
        const { courseId, packageName, discountedFee, regularFee, installment, is_self_learning } = req.body;

        if (!packageName || !String(packageName).trim()) {
            return res.status(400).json({ message: "Package name is required." });
        }

        // ✅ A course can have many packages, but their names must be unique
        const siblings = await Package.findAll({ where: { courseId } });
        if (siblings.some((p) => sameName(p.packageName, packageName))) {
            return res.status(400).json({ message: "This course already has a package with this name." });
        }
        // ✅ Only one package per course can be the Self-Learning package
        if (is_self_learning && siblings.some((p) => p.is_self_learning)) {
            return res.status(400).json({ message: "This course already has a Self-Learning package." });
        }

        // Process installment input (convert comma-separated string to JSON object)
        const processedInstallment = processInstallmentInput(installment);

        // ✅ Create new package
        const newPackage = await Package.create({
            courseId,
            packageName: String(packageName).trim(),
            discountedFee,
            regularFee,
            installment: processedInstallment,
            is_self_learning: Boolean(is_self_learning)
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

        if (updateData.is_self_learning !== undefined) {
            updateData.is_self_learning = Boolean(updateData.is_self_learning);
            if (updateData.is_self_learning && !existing.is_self_learning) {
                const other = await Package.findOne({
                    where: { courseId: existing.courseId, is_self_learning: true, id: { [Op.ne]: existing.id } }
                });
                if (other) {
                    return res.status(400).json({ success: false, message: "This course already has a Self-Learning package." });
                }
            }
        }

        const newName = updateData.packageName === undefined ? undefined : String(updateData.packageName).trim();
        if (newName !== undefined && newName !== existing.packageName) {
            if (!newName) {
                return res.status(400).json({ success: false, message: "Package name is required." });
            }
            const siblings = await Package.findAll({
                where: { courseId: existing.courseId, id: { [Op.ne]: existing.id } }
            });
            if (siblings.some((p) => sameName(p.packageName, newName))) {
                return res.status(400).json({ success: false, message: "This course already has a package with this name." });
            }
            const studentCount = await countStudentsOnPackage(existing);
            if (studentCount > 0) {
                return res.status(400).json({
                    success: false,
                    message: `${studentCount} student(s) are on this package. Renaming it would break their payment records.`
                });
            }
            updateData.packageName = newName;
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

        const studentCount = await countStudentsOnPackage(existing);
        if (studentCount > 0) {
            return res.status(400).json({
                success: false,
                message: `${studentCount} student(s) are on this package, so it cannot be deleted.`
            });
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
        const packages = await Package.findAll({ where: { courseId }, order: [["id", "ASC"]] });
        if (!packages.length) {
            return res.status(404).json({ success: false, message: "No package found for this course." });
        }
        // `package` stays for older callers: the first normal package, else the first one.
        const primary = packages.find((p) => !p.is_self_learning) || packages[0];
        res.status(200).json({ success: true, package: primary, packages });
    } catch (err) {
        console.error("Error fetching package by course:", err);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};
