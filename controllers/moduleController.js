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

