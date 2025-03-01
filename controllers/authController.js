const User = require("../models/User"); // ✅ Import Sequelize User Model
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// ✅ Register User
exports.register = async (req, res) => {
    try {
        const { username, email, password, role } = req.body;

        // ✅ Check if user already exists
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        // ✅ Hash Password
        const hashedPassword = await bcrypt.hash(password, 10);

        // ✅ Create User
        const newUser = await User.create({
            username,
            email,
            password: hashedPassword,
            role
        });

        res.status(201).json({ message: "User registered successfully", user: newUser });
    } catch (error) {
        console.error("Error registering user:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// ✅ Login User
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body; // ✅ Expect username instead of email

        // ✅ Find user by username
        const user = await User.findOne({ where: { username } });
        if (!user) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // ✅ Check if the account is disabled
        if (user.isValid === 0) {
            return res.status(403).json({ message: "Sorry, your account is disabled." });
        }

        // ✅ Compare passwords
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // ✅ Generate JWT Token
        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1h" });

        res.json({
            token,
            user: { id: user.id, username: user.username, email: user.email, role: user.role }
        });
    } catch (error) {
        console.error("Error logging in:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

