const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");

// Load service account credentials
const KEY_PATH = path.join(__dirname, "../config/gdrive-service-account.json"); // Ensure this path is correct
const auth = new google.auth.GoogleAuth({
    keyFile: KEY_PATH,
    scopes: ["https://www.googleapis.com/auth/drive"]
});

const drive = google.drive({ version: "v3", auth });

// ✅ Print Access Token
(async () => {
    try {
        const client = await auth.getClient();
        const tokenResponse = await client.getAccessToken();
        //console.log("Access Token:", tokenResponse.token || tokenResponse);
    } catch (error) {
        console.error("Error fetching access token:", error);
    }
})();

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

/**
 * List Files/Folders Under a Parent in Shared Drive
 * @param {string} parentFolderId - The ID of the parent folder
 * @param {string} sharedDriveId - The ID of the shared drive
 * @returns {Promise<Object>} - List of files/folders
 */
const listFolderContents = async (parentFolderId, sharedDriveId) => {
    try {
        const response = await drive.files.list({
            q: `'${parentFolderId}' in parents`,
            corpora: 'drive',
            driveId: sharedDriveId,
            includeItemsFromAllDrives: true,
            supportsAllDrives: true,
            fields: 'files(id, name, mimeType, createdTime)',
        });

        return { success: true, files: response.data.files };
    } catch (error) {
        console.error("Error listing folder contents:", error);
        return { success: false, error: error.message };
    }
};



module.exports = { grantDriveAccess, removeDriveAccess, listFolderContents };
