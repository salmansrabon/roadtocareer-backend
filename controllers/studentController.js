const bcrypt = require("bcryptjs");
const Student = require("../models/Student");
const Course = require("../models/Course");
const Package = require("../models/Package");
const axios = require("axios");

// ✅ Function to Generate Unique Student ID
const generateStudentId = async (student_name) => {
    if (!student_name || student_name.length < 5) {
        student_name = "random"; // Fallback in case the name is too short
    }

    // Extract random 5 letters from student name
    const namePart = student_name.toLowerCase().replace(/\s+/g, "").substring(0, 5);

    let newId;
    let isUnique = false;

    while (!isUnique) {
        const randomNum = Math.floor(100 + Math.random() * 900); // 3-digit random number
        newId = `SDET${namePart}${randomNum}`; // Example: "SDETdoe123"

        const existingStudent = await Student.findOne({ where: { StudentId: newId } });
        if (!existingStudent) isUnique = true;
    }
    return newId;
};

// ✅ Function to Generate Secure Random Password
const generatePassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 8; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
};

// ✅ Student Signup API
exports.studentSignup = async (req, res) => {
    try {
        const {
            student_name,
            email,
            mobile,
            university,
            courseId,
            package_name, // ✅ Ensure these values are received
            profession,
            passingYear,
            experience,
            company,
            designation,
            address,
            facebook,
            whatsapp,
            linkedin,
            github,
            knowMe,
            opinion,
            google_access_id
        } = req.body;

        // ✅ Check for required fields
        if (!student_name || !email || !mobile || !university || !courseId || !package_name) {
            return res.status(400).json({ message: "Student name, email, mobile, university, courseId, and package_name are required." });
        }

        // ✅ Check if CourseId exists in `courses` table
        const course = await Course.findOne({ where: { courseId } });
        if (!course) {
            return res.status(400).json({ message: "Invalid CourseId. Course does not exist." });
        }

        // ✅ Check if Package exists in `packages` table
        const packageData = await Package.findOne({ where: { packageName: package_name, courseId } });
        if (!packageData) {
            return res.status(400).json({ message: "Invalid package. Package does not exist for this course." });
        }

        // ✅ Generate Unique Student ID
        const studentId = await generateStudentId(student_name);

        // ✅ Insert Student Data into `students` table
        const newStudent = await Student.create({
            StudentId: studentId,
            CourseId: courseId,  // ✅ Pass CourseId explicitly
            package: package_name, // ✅ Pass package_name explicitly
            batch_no: course.batch_no, // ✅ Auto-fetch batch_no from `courses`
            courseTitle: course.course_title, // ✅ Auto-fetch courseTitle from `courses`
            student_name,
            email,
            mobile,
            university,
            profession,
            passingYear,
            experience,
            company,
            designation,
            address,
            facebook,
            whatsapp,
            linkedin,
            github,
            knowMe,
            opinion,
            google_access_id,
            isEnrolled: true // Always TRUE
        });

        // ✅ Generate Secure Password
        const password = generatePassword();
        //const hashedPassword = await bcrypt.hash(password, 10);

        // ✅ Create User in `users` Table
        const userPayload = {
            username: studentId, // ✅ Unique username from studentId
            email, // ✅ Not unique, multiple students can register with the same email
            password: password,
            role: "student"
        };

        const userResponse = await axios.post("http://localhost:5000/api/auth/register", userPayload);

        if (userResponse.status !== 201) {
            return res.status(500).json({ message: "Error creating user in users table." });
        }

        // ✅ Send Response
        res.status(201).json({
            message: "Student signup successful!",
            studentId: studentId,
            generatedPassword: password, // ✅ Show generated password to student
            studentDetails: newStudent
        });

    } catch (error) {
        console.error("Error in student signup:", error);
        res.status(500).json({ message: "Internal server error." });
    }
};
