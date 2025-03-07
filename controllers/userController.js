const { grantDriveAccess, removeDriveAccess } = require("../utils/googleDriveHelper");
const User = require("../models/User");
const Student = require("../models/Student");
const Course = require("../models/Course");

exports.updateUserStatus = async (req, res) => {
    try {
        const { studentId } = req.params;
        const { isValid } = req.body;

        if (typeof isValid === "undefined" || ![0, 1].includes(parseInt(isValid))) {
            return res.status(400).json({ message: "Invalid isValid value. Must be 0 or 1." });
        }

        // ✅ Find User by StudentId
        const user = await User.findOne({ where: { username: studentId } });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // ✅ Update isValid status in User Table
        await user.update({ isValid });

        // ✅ Find Student & Get Course Drive Folder ID
        const student = await Student.findOne({
            where: { StudentId: studentId },
            include: [{ model: Course, attributes: ["drive_folder_id"] }]
        });

        if (!student || !student.Course.drive_folder_id) {
            return res.status(404).json({ message: "Student or Drive folder ID not found." });
        }

        const fileId = student.Course.drive_folder_id; // ✅ Get Drive Folder ID

        let responseMessage = "User status updated successfully";

        if (isValid === 1) {
            await student.update({ isEnrolled: 1 }); // ✅ Ensure isEnrolled = true
            // ✅ Grant Google Drive Access
            const driveResponse = await grantDriveAccess(fileId, user.email);
            if (driveResponse.success) {
                await student.update({ google_access_id: driveResponse.permissionId });
                responseMessage = "User approved & Drive access granted";
            } else {
                return res.status(500).json({ message: "Failed to grant Drive access", error: driveResponse.error });
            }
        } else {
            // ✅ Remove Google Drive Access if google_access_id exists
            if (student.google_access_id) {
                const revokeResponse = await removeDriveAccess(fileId, student.google_access_id);
                if (!revokeResponse.success) {
                    return res.status(500).json({ message: "Failed to revoke Drive access", error: revokeResponse.error });
                }
                await student.update({ google_access_id: null });
                responseMessage = "User deactivated & Drive access revoked";
            }
        }

        return res.status(200).json({ message: responseMessage, isValid });
    } catch (error) {
        console.error("Error updating user status:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
