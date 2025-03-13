const Student = require("../models/Student");
const Course = require("../models/Course");
const Package = require("../models/Package");
const User = require("../models/User");
const Attendance = require("../models/Attendance");
const axios = require("axios");
const { Op, Sequelize } = require("sequelize");
const moment = require("moment");

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
            package_name,
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

        // ✅ Check if Student Already Exists in this Course
        const existingStudent = await Student.findOne({ where: { email, CourseId: courseId } });

        if (existingStudent) {
            return res.status(409).json({ message: "Student already registered in this course!" });
        }

        // ✅ Check if Course Exists
        const course = await Course.findOne({ where: { courseId } });
        if (!course) {
            return res.status(400).json({ message: "Invalid CourseId. Course does not exist." });
        }

        // ✅ Check if Package Exists for this Course
        const packageData = await Package.findOne({ where: { packageName: package_name, courseId } });
        if (!packageData) {
            return res.status(400).json({ message: "Invalid package. Package does not exist for this course." });
        }

        // ✅ Generate Unique Student ID
        const studentId = await generateStudentId(student_name);

        // ✅ Insert Student Data into `students` Table
        const newStudent = await Student.create({
            StudentId: studentId,
            CourseId: courseId,
            package: package_name,
            batch_no: course.batch_no,
            courseTitle: course.course_title,
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
            isEnrolled: false // Always FALSE initially
        });

        // ✅ Generate Secure Password
        const password = generatePassword();

        // ✅ Create User in `users` Table
        try {
            const userPayload = {
                username: studentId, // ✅ Unique username from studentId
                email,
                password,
                role: "student"
            };

            const userResponse = await axios.post("http://localhost:5000/api/auth/register", userPayload);

            if (userResponse.status !== 201) {
                throw new Error("Error creating user in users table.");
            }
        } catch (userError) {
            console.error("Error creating user:", userError);
            return res.status(500).json({ message: "Failed to create user. Please contact admin." });
        }

        // ✅ Send Success Response
        res.status(201).json({
            message: "Student signup successful!",
            studentId: studentId,
            generatedPassword: password,
            studentDetails: newStudent
        });

    } catch (error) {
        console.error("Error in student signup:", error);

        // ✅ Proper Error Handling
        const errorMessage = error.response?.data?.message || "An unexpected error occurred. Please contact admin.";
        res.status(500).json({ message: errorMessage });
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
            isEnrolled,
            page = 1, // ✅ Default to page 1
            limit = 10 // ✅ Default limit to 10 students per page
        } = req.query;

        // ✅ Convert pagination values to numbers
        const pageNumber = parseInt(page) || 1;
        const limitNumber = parseInt(limit) || 10;
        const offset = (pageNumber - 1) * limitNumber;

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

        // ✅ Get total student count before applying pagination
        const totalStudents = await Student.count({ where: whereClause });

        // ✅ Fetch Students with Filtering & Pagination
        const students = await Student.findAll({
            where: whereClause,
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
            offset, // ✅ Pagination Offset
            limit: limitNumber // ✅ Limit per page
        });

        // ✅ Apply `isValid` Filtering from User Table
        let filteredStudents = students;
        if (isValid !== undefined && isValid !== "") {
            filteredStudents = students.filter(student => student.User && student.User.isValid == parseInt(isValid));
        }

        return res.status(200).json({
            totalStudents,
            totalPages: Math.ceil(totalStudents / limitNumber), // ✅ Total pages for pagination
            currentPage: pageNumber,
            students: filteredStudents
        });
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
                "opinion",
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
            opinion,
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
            opinion,
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

exports.markAttendance = async (req, res) => {
    try {
        const { studentId, date, time } = req.body;

        if (!studentId || !date || !time) {
            return res.status(400).json({ message: "Missing required fields: studentId, date, time." });
        }

        // ✅ Fetch Student Details
        const student = await Student.findOne({ where: { StudentId: studentId } });

        if (!student) {
            return res.status(404).json({ message: "Student not found." });
        }

        // ✅ Fetch Course Details for Class Time Validation
        const course = await Course.findOne({ where: { courseId: student.CourseId } });

        if (!course) {
            return res.status(404).json({ message: "Course not found." });
        }

        const classTime = moment(`${date} ${course.class_time}`, "DD-MM-YYYY hh:mm:ss A");
        const maxAllowedTime = classTime.clone().add(2, "hours"); // ✅ Allow up to 2 hours after class time
        const submittedTime = moment(`${date} ${time}`, "DD-MM-YYYY hh:mm:ss A");

        if (submittedTime.isBefore(classTime) || submittedTime.isAfter(maxAllowedTime)) {
            return res.status(400).json({ message: "Please give attendance on class time." });
        }

        // ✅ Check if Attendance Exists for Student
        let attendance = await Attendance.findOne({ where: { StudentId: studentId } });

        if (!attendance) {
            // ✅ Create Attendance Record if Not Exists
            attendance = await Attendance.create({
                courseId: student.CourseId,
                courseTitle: student.courseTitle,
                batch_no: student.batch_no,
                StudentId: student.StudentId,
                student_name: student.student_name,
                attendanceList: JSON.stringify([]) // Ensure it's initialized properly
            });
        }

        // ✅ Parse Existing Attendance List (If Stored as String)
        let updatedAttendanceList;
        if (typeof attendance.attendanceList === "string") {
            updatedAttendanceList = JSON.parse(attendance.attendanceList);
        } else {
            updatedAttendanceList = attendance.attendanceList || [];
        }

        // ✅ Append New Attendance Record
        updatedAttendanceList.push({ time: `${date} ${time}` });

        // ✅ Update Attendance Table (Ensure JSON is Stored Properly)
        await attendance.update({
            attendanceList: JSON.stringify(updatedAttendanceList) // Convert back to string if using LONGTEXT
        });

        // ✅ Calculate Attendance Percentage
        const totalClicks = updatedAttendanceList.length;
        const attendancePercentage = ((totalClicks / 30) * 100).toFixed(2);

        return res.status(200).json({
            message: "Attendance marked successfully!",
            attendancePercentage: `${attendancePercentage}%`,
            totalClicks
        });

    } catch (error) {
        console.error("Error marking attendance:", error);
        return res.status(500).json({ message: "Internal Server Error." });
    }
};

exports.getAttendance = async (req, res) => {
    try {
        const { studentId } = req.params;

        // ✅ Fetch Attendance Record for the Given Student ID
        const attendance = await Attendance.findOne({ where: { StudentId: studentId } });

        if (!attendance) {
            return res.status(404).json({ message: "No attendance record found for this student." });
        }

        // ✅ Parse `attendanceList` if stored as a String
        let parsedAttendanceList;
        try {
            parsedAttendanceList = typeof attendance.attendanceList === "string"
                ? JSON.parse(attendance.attendanceList)
                : attendance.attendanceList;
        } catch (error) {
            return res.status(400).json({ message: "Error parsing attendance data!" });
        }

        // ✅ Construct Response
        const response = {
            studentId: attendance.StudentId,
            studentName: attendance.student_name,
            courseId: attendance.courseId,
            courseTitle: attendance.courseTitle,
            batch_no: attendance.batch_no,
            attendanceList: parsedAttendanceList, // ✅ Proper JSON format
            totalClicks: parsedAttendanceList.length,
            attendancePercentage: `${((parsedAttendanceList.length / 30) * 100).toFixed(2)}%`
        };

        return res.status(200).json(response);

    } catch (error) {
        console.error("Error fetching attendance:", error);
        return res.status(500).json({ message: "Internal Server Error." });
    }
};






