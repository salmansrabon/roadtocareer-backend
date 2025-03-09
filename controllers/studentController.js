const Student = require("../models/Student");
const Course = require("../models/Course");
const Package = require("../models/Package");
const User = require("../models/User");
const axios = require("axios");
const { Op, Sequelize } = require("sequelize");

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
        newId = `sdet${namePart}${randomNum}`; // Example: "SDETdoe123"

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
            isEnrolled: false // Always FALSE
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

exports.getAllStudents = async (req, res) => {
    try {
        const {
            courseId,
            batch_no,
            studentId,
            salutation,
            student_name,
            email,
            mobile,
            university,
            profession,
            company,
            isValid,
            isEnrolled
        } = req.query;

        // ✅ Build Dynamic Query Conditions (Only add filters if provided)
        let whereClause = {};

        if (courseId) whereClause.courseId = courseId;
        if (batch_no) whereClause.batch_no = batch_no;
        if (studentId) whereClause.StudentId = { [Op.like]: `%${studentId}%` };
        if (salutation) whereClause.salutation = { [Op.like]: `%${salutation}%` };
        if (student_name) whereClause.student_name = { [Op.like]: `%${student_name}%` };
        if (email) whereClause.email = { [Op.like]: `%${email}%` };
        if (mobile) whereClause.mobile = { [Op.like]: `%${mobile}%` };
        if (university) whereClause.university = { [Op.like]: `%${university}%` };
        if (profession) whereClause.profession = { [Op.like]: `%${profession}%` };
        if (company) whereClause.company = { [Op.like]: `%${company}%` };
        if (isEnrolled !== undefined && isEnrolled !== "") whereClause.isEnrolled = parseInt(isEnrolled);

        // ✅ Fetch Students with Filtering & Join Course & User Table
        const students = await Student.findAll({
            where: whereClause, // Apply filters only if given
            attributes: [
                "StudentId",
                "salutation",
                "student_name",
                "email",
                "mobile",
                "university",
                "batch_no",
                "courseTitle",
                "package",
                "profession",
                "company",
                "designation",
                "experience",
                "knowMe",
                "due",
                "isEnrolled",
                "createdAt"
            ],
            include: [
                {
                    model: Course,
                    attributes: ["courseId", "course_title"]
                },
                {
                    model: User,
                    attributes: ["isValid"],
                    required: false,
                    on: { col1: Sequelize.where(Sequelize.col("User.username"), "=", Sequelize.col("Student.StudentId")) }
                }
            ],
            order: [["createdAt", "DESC"]],
        });

        // ✅ Apply Filtering on `isValid` from User Table if given
        let filteredStudents = students;
        if (isValid !== undefined && isValid !== "") {
            filteredStudents = students.filter(student => student.User && student.User.isValid == parseInt(isValid));
        }

        // ✅ Get total filtered student count
        const totalStudents = filteredStudents.length;

        return res.status(200).json({ totalStudents, students: filteredStudents });
    } catch (error) {
        console.error("Error fetching students:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

exports.getStudentById = async (req, res) => {
    try {
        const { studentId } = req.params;

        // ✅ Find Student with Related Data
        const student = await Student.findOne({
            where: { StudentId: studentId },
            attributes: [
                "StudentId",
                "salutation",
                "student_name",
                "email",
                "mobile",
                "university",
                "batch_no",
                "courseTitle",
                "package",  // ✅ Needed to filter the package
                "profession",
                "company",
                "designation",
                "experience",
                "knowMe",
                "remark",
                "due",
                "isEnrolled",
                "createdAt"
            ],
            include: [
                {
                    model: Course,
                    attributes: ["courseId", "course_title"]
                },
                {
                    model: User, // ✅ Join with users table
                    attributes: ["isValid"],
                    required: false, // LEFT JOIN (so that it doesn't fail if no user exists)
                    on: { col1: Sequelize.where(Sequelize.col("User.username"), "=", Sequelize.col("Student.StudentId")) }
                },
                {
                    model: Package,
                    attributes: ["courseId", "packageName", "studentFee", "jobholderFee", "installment"],
                    required: false, // LEFT JOIN to avoid errors
                    on: {
                        col1: Sequelize.where(
                            Sequelize.col("Package.courseId"), "=", Sequelize.col("Student.CourseId")
                        ),
                        col2: Sequelize.where(
                            Sequelize.col("Package.packageName"), "=", Sequelize.col("Student.package")
                        )
                    }
                }
            ]
        });

        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }
        // ✅ Determine correct fee based on profession
        const courseFee =
            student.profession === "Job Holder"
                ? student.Package?.jobholderFee
                : student.Package?.studentFee;

        // ✅ Send Response
        res.status(200).json({
            ...student.toJSON(),
            courseFee // ✅ Only return the correct fee dynamically
        });
    } catch (error) {
        console.error("Error fetching student details:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

exports.updateStudent = async (req, res) => {
    try {
        const { studentId } = req.params; // Extract Student ID from URL params
        const {
            salutation,
            student_name,
            batch_no,
            email,
            mobile,
            university,
            profession,
            company,
            designation,
            experience,
            knowMe,
            remark,
            isEnrolled
        } = req.body; // Extract fields from request body

        // ✅ Find Student by StudentId
        const student = await Student.findOne({ where: { StudentId: studentId } });

        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        // ✅ Find Corresponding User by username (mapped to StudentId)
        const user = await User.findOne({ where: { username: studentId } });

        // ✅ Update Student Data
        await student.update({
            salutation,
            student_name,
            batch_no,
            email,
            mobile,
            university,
            profession,
            company,
            designation,
            experience,
            knowMe,
            remark,
            isEnrolled
        });

        // ✅ If email is updated, also update it in the User table
        if (email && user) {
            await user.update({ email });
        }

        return res.status(200).json({
            message: "Student details updated successfully",
            student
        });

    } catch (error) {
        console.error("Error updating student details:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};


exports.deleteStudentById = async (req, res) => {
    try {
        const { studentId } = req.params;

        // ✅ Find Student
        const student = await Student.findOne({ where: { StudentId: studentId } });

        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        // ✅ Delete Student Record
        await Student.destroy({ where: { StudentId: studentId } });

        // ✅ Delete Associated User Record
        await User.destroy({ where: { username: studentId } });

        res.status(200).json({ message: "Student deleted successfully." });

    } catch (error) {
        console.error("Error deleting student:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};





