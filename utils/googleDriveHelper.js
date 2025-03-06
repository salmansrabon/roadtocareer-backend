const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");

// Load service account credentials
const KEY_PATH = path.join(__dirname, "../config/service-account.json"); // Ensure this path is correct
const auth = new google.auth.GoogleAuth({
    keyFile: KEY_PATH,
    scopes: ["https://www.googleapis.com/auth/drive"]
});

const drive = google.drive({ version: "v3", auth });

/**
 * ✅ Grant Google Drive Access to User
 * @param {string} email - User's email
 * @returns {Promise<Object>} - Drive permission response
 */
const grantDriveAccess = async (fileId, email) => {
    try {
        //const fileId = "1JWiaT02qIFnl41878y-ZpOsjvAot-7q0"; // Replace with your actual shared drive or folder ID

        const permission = await drive.permissions.create({
            fileId: fileId,
            requestBody: {
                type: "user",
                role: "reader", // Change to "writer" if you want edit access
                emailAddress: email,
            },
            fields: "id",
            supportsAllDrives:true
        });

        return { success: true, permissionId: permission.data.id };
    } catch (error) {
        console.error("Error granting Google Drive access:", error);
        return { success: false, error: error.message };
    }
};

/**
 * ✅ Remove Google Drive Access for User
 * @param {string} fileId - File/Folder ID
 * @param {string} permissionId - Permission ID
 * @returns {Promise<Object>} - Delete response
 */
const removeDriveAccess = async (fileId, permissionId) => {
    try {
        // const fileId = "1JWiaT02qIFnl41878y-ZpOsjvAot-7q0"; // Replace with actual shared folder/file ID
        await drive.permissions.delete({
            fileId: fileId,
            permissionId: permissionId,
            supportsAllDrives:true
        });

        return { success: true, message: "Drive access revoked" };
    } catch (error) {
        console.error("Error removing Google Drive access:", error);
        return { success: false, error: error.message };
    }
};

module.exports = { grantDriveAccess, removeDriveAccess };
