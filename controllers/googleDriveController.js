const { listFolderContents: listFolderHelper } = require("../utils/googleDriveHelper");
const Gallery = require("../models/Gallery");

exports.listFolderContents = async (req, res) => {
    const { parentId, sharedDriveId } = req.query;

    if (!parentId) {
        return res.status(400).json({ success: false, error: "parentId query parameter is required." });
    }

    try {
        const result = await listFolderHelper(parentId, sharedDriveId);

        if (result.success) {
            return res.status(200).json(result.files);
        } else {
            return res.status(500).json({ success: false, error: result.error });
        }
    } catch (error) {
        console.error("Controller error:", error);
        return res.status(500).json({ success: false, error: "Internal server error." });
    }
};

exports.getAllGoogleDriveLinks = async (req, res) => {
    try {
        const galleryItems = await Gallery.findAll({
            order: [["position", "ASC"], ["createdAt", "DESC"]],
        });

        return res.status(200).json({
            success: true,
            count: galleryItems.length,
            data: galleryItems,
        });
    } catch (error) {
        console.error("Error fetching gallery items:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

exports.createGoogleDriveLink = async (req, res) => {
    try {
        const { title, description, gdrive_link, thumbnail } = req.body;

        if (!title || !gdrive_link) {
            return res.status(400).json({
                success: false,
                message: "title and gdrive_link are required",
            });
        }

        // Get the highest position and add 1 for new item
        const maxPositionItem = await Gallery.findOne({
            order: [["position", "DESC"]],
        });
        const newPosition = maxPositionItem ? maxPositionItem.position + 1 : 1;

        const createdLink = await Gallery.create({
            position: newPosition,
            title,
            description: description || null,
            gdrive_link,
            thumbnail: thumbnail || null,
        });

        return res.status(201).json({
            success: true,
            message: "Gallery item added successfully",
            data: createdLink,
        });
    } catch (error) {
        console.error("Error creating gallery item:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

exports.updateGoogleDriveLink = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, gdrive_link, thumbnail } = req.body;

        const galleryItem = await Gallery.findByPk(id);

        if (!galleryItem) {
            return res.status(404).json({
                success: false,
                message: "Gallery item not found",
            });
        }

        const updateData = {};
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (gdrive_link !== undefined) updateData.gdrive_link = gdrive_link;
        if (thumbnail !== undefined) updateData.thumbnail = thumbnail;

        await galleryItem.update(updateData);

        return res.status(200).json({
            success: true,
            message: "Gallery item updated successfully",
            data: galleryItem,
        });
    } catch (error) {
        console.error("Error updating gallery item:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

exports.deleteGoogleDriveLink = async (req, res) => {
    try {
        const { id } = req.params;

        const galleryItem = await Gallery.findByPk(id);

        if (!galleryItem) {
            return res.status(404).json({
                success: false,
                message: "Gallery item not found",
            });
        }

        await galleryItem.destroy();

        return res.status(200).json({
            success: true,
            message: "Gallery item deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting gallery item:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

exports.reorderGalleryItems = async (req, res) => {
    try {
        const { items } = req.body; // Expected format: [{ id: 1, position: 0 }, { id: 2, position: 1 }, ...]

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "items array is required",
            });
        }

        // Update positions for all items
        const updatePromises = items.map((item) =>
            Gallery.update(
                { position: item.position },
                { where: { id: item.id } }
            )
        );

        await Promise.all(updatePromises);

        return res.status(200).json({
            success: true,
            message: "Gallery items reordered successfully",
        });
    } catch (error) {
        console.error("Error reordering gallery items:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
