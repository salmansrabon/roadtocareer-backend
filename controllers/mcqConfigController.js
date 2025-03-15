const McqConfig = require("../models/McqConfig");

// ✅ 1. Create MCQ Config
exports.createMcqConfig = async (req, res) => {
    try {
        const { CourseId, quiz_title, quiz_description, totalQuestion, isActive, totalTime, start_datetime, end_datetime } = req.body;

        if (!CourseId || !quiz_title || !quiz_description || !totalQuestion || !start_datetime || !end_datetime) {
            return res.status(400).json({ message: "Missing required fields." });
        }
        // ✅ Check if a config already exists for this CourseId
        const existingConfig = await McqConfig.findOne({ where: { CourseId } });

        if (existingConfig) {
            return res.status(409).json({ message: "MCQ Config already exists for this CourseId. Update it instead of creating a new one." });
        }
        const newConfig = await McqConfig.create({
            CourseId,
            quiz_title,
            quiz_description,
            totalQuestion,
            isActive: isActive !== undefined ? isActive : true,
            totalTime,
            start_datetime,
            end_datetime
        });

        return res.status(201).json({ message: "MCQ Config created successfully!", mcqConfig: newConfig });

    } catch (error) {
        console.error("Error creating MCQ Config:", error);
        return res.status(500).json({ message: "Internal Server Error." });
    }
};


exports.getMcqConfigByCourse = async (req, res) => {
    try {
        const { CourseId } = req.params;

        let configs;

        if (CourseId) {
            // ✅ Fetch configurations for a specific CourseId
            configs = await McqConfig.findAll({ where: { CourseId } });

            if (!configs.length) {
                return res.status(404).json({ message: "No MCQ Config found for this course." });
            }
        } else {
            // ✅ Fetch all configurations when CourseId is not provided
            configs = await McqConfig.findAll();

            if (!configs.length) {
                return res.status(404).json({ message: "No MCQ Configs available." });
            }
        }

        return res.status(200).json({ mcqConfigs: configs });

    } catch (error) {
        console.error("Error fetching MCQ Config:", error);
        return res.status(500).json({ message: "Internal Server Error." });
    }
};


// ✅ 3. Update MCQ Config by CourseId
exports.updateMcqConfigByCourse = async (req, res) => {
    try {
        const { CourseId } = req.params;
        const updatedData = req.body;

        const config = await McqConfig.findOne({ where: { CourseId } });

        if (!config) {
            return res.status(404).json({ message: "MCQ Config not found for this course." });
        }

        await config.update(updatedData);

        return res.status(200).json({ message: "MCQ Config updated successfully!", updatedConfig: config });

    } catch (error) {
        console.error("Error updating MCQ Config:", error);
        return res.status(500).json({ message: "Internal Server Error." });
    }
};

// ✅ 4. Delete MCQ Config by CourseId
exports.deleteMcqConfigByCourse = async (req, res) => {
    try {
        const { CourseId } = req.params;

        const config = await McqConfig.findOne({ where: { CourseId } });

        if (!config) {
            return res.status(404).json({ message: "MCQ Config not found for this course." });
        }

        await config.destroy();

        return res.status(200).json({ message: "MCQ Config deleted successfully!" });

    } catch (error) {
        console.error("Error deleting MCQ Config:", error);
        return res.status(500).json({ message: "Internal Server Error." });
    }
};
