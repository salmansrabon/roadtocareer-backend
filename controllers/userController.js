const { grantDriveAccess, removeDriveAccess } = require("../utils/googleDriveHelper");
const { sendEmail } = require("../utils/emailHelper"); 
const User = require("../models/User");
const Student = require("../models/Student");
const Course = require("../models/Course");
const bcrypt = require("bcryptjs"); 

const generatePassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    return Array(8).fill(null).map(() => chars.charAt(Math.floor(Math.random() * chars.length))).join("");
};

exports.updateUserStatus = async (req, res) => {
    try {
        const { studentId } = req.params;
        const { isValid } = req.body;

        if (![0, 1].includes(parseInt(isValid))) {
            return res.status(400).json({ message: "Invalid isValid value. Must be 0 or 1." });
        }

        const user = await User.findOne({ where: { username: studentId } });
        if (!user) return res.status(404).json({ message: "User not found" });

        const student = await Student.findOne({
            where: { StudentId: studentId },
            include: [{ model: Course, attributes: ["drive_folder_id"] }]
        });

        if (!student || !student.Course.drive_folder_id) {
            return res.status(404).json({ message: "Student or Drive folder ID not found." });
        }

        const fileId = student.Course.drive_folder_id;
        let responseMessage = "User status updated successfully";

        if (isValid === 1) {
            if (!student.isEnrolled) {
                await student.update({ isEnrolled: 1 });

                // ✅ Generate Password & Update User
                const newPassword = generatePassword();
                const hashedPassword = await bcrypt.hash(newPassword, 10);
                await user.update({ password: hashedPassword });

                // ✅ Send Email
                await sendEmail(user.email, 
                    "Your Road to SDET Account Password Reset", 
                    `Dear ${student.student_name},\n\nYour account has been activated successfully.\n\n👤 studentId: ${studentId}\n🔑 Password: ${newPassword}\n\nPlease log in and change your password.\n\nRegards,\nRoad to SDET Team`
                );

                responseMessage += " & New password sent to email";
            }

            // ✅ Grant Drive Access
            const driveResponse = await grantDriveAccess(fileId, user.email);
            if (driveResponse.success) {
                await student.update({ google_access_id: driveResponse.permissionId });
                responseMessage += " & Drive access granted";
            } else {
                return res.status(500).json({ message: "Failed to grant Drive access", error: driveResponse.error });
            }
        } else {
            if (student.google_access_id) {
                const revokeResponse = await removeDriveAccess(fileId, student.google_access_id);
                if (!revokeResponse.success) {
                    return res.status(500).json({ message: "Failed to revoke Drive access", error: revokeResponse.error });
                }
                await student.update({ google_access_id: null });
                responseMessage = "User deactivated & Drive access revoked";
            }
        }

        await user.update({ isValid });
        return res.status(200).json({ message: responseMessage, isValid });

    } catch (error) {
        console.error("Error updating user status:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
