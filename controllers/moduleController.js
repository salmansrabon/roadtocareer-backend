const Module = require("../models/Module");
const Course = require("../models/Course");
const Package = require("../models/Package");

exports.createModule = async (req, res) => {
    try {
        const { courseId, packageId, module } = req.body;

        // ✅ Validate input
        if (!courseId || !packageId || !module) {
            return res.status(400).json({ message: "All fields are required!" });
        }

        // ✅ Convert stringified module to JSON if needed
        let parsedModule;
        try {
            parsedModule = typeof module === "string" ? JSON.parse(module) : module;
        } catch (error) {
            return res.status(400).json({ message: "Invalid module format!" });
        }

        // ✅ Save to database
        const newModule = await Module.create({ courseId, packageId, module: parsedModule });

        res.status(201).json({ message: "Module added successfully!", data: newModule });
    } catch (error) {
        console.error("Error adding module:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

exports.listModule = async (req, res) => {
    try {
        // 🔹 Fetch all modules with related Course & Package info
        const modules = await Module.findAll({
            attributes: ["id", "courseId", "packageId", "module", "createdAt"],
            
            order: [["createdAt", "DESC"]], // Sort by latest created
        });

        res.status(200).json({ success: true, modules });
    } catch (error) {
        console.error("Error fetching modules:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};


exports.getModulesByCourseId = async (req, res) => {
    try {
        const { courseId } = req.params;

        // ✅ Fetch modules where courseId matches
        const modules = await Module.findAll({
            where: { courseId },
            attributes: ["id", "courseId", "packageId", "module", "createdAt"],
            order: [["createdAt", "DESC"]], // Sort by latest created
        });

        if (modules.length === 0) {
            return res.status(404).json({ success: false, message: "No modules found for this course." });
        }

        res.status(200).json({ success: true, modules });

    } catch (error) {
        console.error("Error fetching modules by courseId:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.updateModule = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { module } = req.body; // ✅ Module data from request

        // ✅ Check if Module Exists by courseId
        const existingModule = await Module.findOne({ where: { courseId } });
        if (!existingModule) {
            return res.status(404).json({ message: "Module not found for the given Course ID." });
        }

        // ✅ Ensure module is stored as JSON (NOT as a string)
        let parsedModule;
        try {
            parsedModule = typeof module === "string" ? JSON.parse(module) : module;
        } catch (error) {
            return res.status(400).json({ message: "Invalid module format!" });
        }

        // ✅ Update the Module Data
        await existingModule.update({ module: parsedModule });

        res.status(200).json({ message: "Module updated successfully!" });
    } catch (error) {
        console.error("Error updating module:", error);
        res.status(500).json({ message: "Internal server error." });
    }
};
exports.deleteModule = async (req, res) => {
    try {
        const { courseId } = req.params; // ✅ Extract courseId from URL

        // ✅ Check if the module exists
        const existingModule = await Module.findOne({ where: { courseId } });
        if (!existingModule) {
            return res.status(404).json({ message: "Module not found for the given Course ID." });
        }

        // ✅ Delete the module
        await existingModule.destroy();

        res.status(200).json({ message: "Module deleted successfully!" });
    } catch (error) {
        console.error("Error deleting module:", error);
        res.status(500).json({ message: "Internal server error." });
    }
};








