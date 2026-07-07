const { grantDriveAccess, removeDriveAccess, revokeDriveAccessByEmail } = require("../utils/googleDriveHelper");
const { sendEmail } = require("../utils/emailHelper");
const { getDiscordInviteForEmail } = require("../utils/discordHelper");
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

        if (!student) {
            return res.status(404).json({ message: "Student not found." });
        }

        let responseMessage = "User status updated successfully";
        const fileId = student.Course?.drive_folder_id;

        let previousFileId = null;
        if (student.previous_course_id) {
            const previousCourse = await Course.findOne({
                where: { courseId: student.previous_course_id },
                attributes: ["drive_folder_id"]
            });
            previousFileId = previousCourse?.drive_folder_id || null;
        }

        // ✅ Update isValid Status First
        await user.update({ isValid });

        if (isValid === 1) {
            if (!student.isEnrolled) {
                await student.update({ isEnrolled: 1 });

                // ✅ Generate Password & Update User
                const newPassword = generatePassword();
                const hashedPassword = await bcrypt.hash(newPassword, 10);
                await user.update({ password: hashedPassword });

                // ✅ Send Email with Dynamic Discord Server Link
                const discordServerName = process.env.DISCORD_SERVER_NAME || "Road to SDET Community";
                
                // Get fresh Discord invite dynamically
                const discordInvite = await getDiscordInviteForEmail();
                const discordServerLink = discordInvite.inviteUrl;
                
                // Log invite status
                if (discordInvite.isGenerated) {
                    console.log(`✅ Generated fresh Discord invite for ${user.email}: ${discordServerLink}`);
                } else {
                    console.log(`⚠️ Using fallback Discord invite for ${user.email}: ${discordServerLink}`);
                }
                
                await sendEmail(user.email,
                    "Road to SDET Student Enrollment Confirmation",
                    `Dear ${student.student_name},\n\nYour account has been activated successfully.\n\n👤 Student ID: ${studentId}\n🔑 Password: ${newPassword}\n\nPlease log in and change your password.\nSite URL: https://www.roadtocareer.net/login\n\n And also please join our Discord community with following link:\n\n🔗${discordServerName}: ${discordServerLink}\n\nIn our Discord server, you can:\n• Connect with fellow students and instructors\n• Get real-time help and support\n• Participate in study groups and discussions\n• Get career guidance and job opportunities\n• Any announcements and updates regarding classes \n\nWelcome to our community!\n\nRegards,\nRoad to SDET Team`
                );

                responseMessage += " & New password sent to email";
            }

            // ✅ Try to Grant Drive Access (But do not block user activation if failed)
            if (fileId) {
                const driveResponse = await grantDriveAccess(fileId, user.email);
                if (driveResponse.success) {
                    await student.update({ google_access_id: driveResponse.permissionId });
                    responseMessage += " & Drive access granted";
                } else {
                    responseMessage += " & Google Drive access failed to grant"; // ✅ Add failure message but do not stop execution
                }
            } else {
                responseMessage += " & No Drive folder ID available for access";
            }

            // ✅ Also grant access to the previous (recent) batch's Drive folder, if any
            if (previousFileId) {
                const prevDriveResponse = await grantDriveAccess(previousFileId, user.email);
                responseMessage += prevDriveResponse.success
                    ? " & Previous batch Drive access granted"
                    : " & Previous batch Drive access failed to grant";
            }
        } else {
            responseMessage = "User deactivated";

            // ✅ Try to Revoke Drive Access (But do not block deactivation if failed — isValid is already updated)
            if (student.google_access_id && fileId) {
                const revokeResponse = await removeDriveAccess(fileId, student.google_access_id);
                if (revokeResponse.success) {
                    await student.update({ google_access_id: null });
                    responseMessage += " & Drive access revoked";
                } else {
                    responseMessage += " & Drive access failed to revoke";
                    console.error("Failed to revoke Drive access:", revokeResponse.error);
                }
            }

            // ✅ Also revoke access to the previous (recent) batch's Drive folder, if any
            if (previousFileId) {
                const prevRevokeResponse = await revokeDriveAccessByEmail(previousFileId, user.email);
                if (prevRevokeResponse.success) {
                    responseMessage += " & Previous batch Drive access revoked";
                } else {
                    console.error("Failed to revoke previous batch Drive access:", prevRevokeResponse.error);
                }
            }
        }

        return res.status(200).json({ message: responseMessage, isValid });

    } catch (error) {
        console.error("Error updating user status:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: ['id', 'username', 'email', 'role', 'isValid', 'createdAt', 'updatedAt'],
        });

        res.status(200).json({
            total: users.length,
            users
        });
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

exports.updateUserById = async (req, res) => {
    const { id } = req.params;
    const { username, email, password, role, isValid } = req.body;

    if (!username || !email || !role || isValid == null) {
        return res.status(400).json({ message: "username, email, role, and isValid are required." });
    }

    try {
        const user = await User.findOne({ where: { id } });  // ✅ Find by id explicitly
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        user.username = username;
        user.email = email;
        user.role = role;
        user.isValid = isValid;

        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            user.password = hashedPassword;
        }

        await user.save();

        res.status(200).json({ message: "User updated successfully.", user });
    } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

exports.deleteUserById = async (req, res) => {
    const { id } = req.params;

    try {
        const user = await User.findOne({ where: { id } }); 
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        await user.destroy();

        res.status(200).json({ message: "User deleted successfully." });
    } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).json({ message: "Internal server error." });
    }
};
