const Student = require("../models/Student");
const Course = require("../models/Course");
const Package = require("../models/Package");
const User = require("../models/User");
const Attendance = require("../models/Attendance");
const bcrypt = require("bcryptjs");
const { Op, Sequelize } = require("sequelize");
const moment = require("moment");
const { sendEmail } = require("../utils/emailHelper");
const sequelize = require("../config/db");

// ✅ Function to Generate Unique Student ID
const generateStudentId = async (student_name) => {
    if (!student_name || student_name.length < 2) {
        student_name = "XX"; // Fallback if the name is too short
    }

    // Extract initials from the student's name
    const nameParts = student_name.split(" ").filter(part => part.length > 0);
    let initials = nameParts.map(part => part[0].toUpperCase()).join("");

    // If initials exceed 4 letters, limit them to the first 4 characters
    initials = initials.substring(0, 4);

    let newId;
    let isUnique = false;

    while (!isUnique) {
        const randomNum = Math.floor(10000 + Math.random() * 90000); // Generate a 5-digit random number
        newId = `${initials}${randomNum}`; // Example: "FH42564"

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
            salutation,
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
            salutation:salutation,
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
            const hashedPassword = await bcrypt.hash(password, 10);
            await User.create({
                username: studentId,
                email,
                password: hashedPassword,
                role: "student",
                isValid: false, // Initially set to false,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            console.log("✅ User created successfully.");
        } catch (userError) {
            console.error("❌ Error creating user in DB:", userError);
            return res.status(500).json({ message: "Failed to create user. Please contact admin." });
        }

        function formatTime(time24) {
            const [hourStr, minute] = time24.split(':');
            let hours = parseInt(hourStr, 10);
            const period = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12 || 12; // convert "0" to "12" for midnight
            return `${hours}:${minute} ${period}`;
          }
          

        try {
            const formattedClassDays = Array.isArray(course.class_days)
                ? course.class_days.join(", ")
                : course.class_days.replace(/[\[\]"]/g, "");
            const studentEmailBody = `
                Dear ${student_name},

                Thanks for your enrollment with us.

                Course Details:
                ---------------------
                Course Title: ${course.course_title}
                Batch No: ${course.batch_no}
                Orientation Date: ${course.orientation_date}
                Class Start Date: ${course.class_start_date}
                Class Days: ${formattedClassDays}
                Class Time: ${formatTime(course.class_time)}

                Thank you for joining!

                Regards,
                Course Admin
            `;

            await sendEmail(email, "Road to SDET-Welcome to our Course!", studentEmailBody);

        } catch (emailError) {
            console.error("❌ Error sending email to student:", emailError);
            return res.status(500).json({ message: "Student registered but email sending failed. Please contact admin." });
        }

        // ✅ Fetch Admin Users and Send Notification Email
        try {
            const adminUsers = await User.findAll({ where: { role: "admin" } });

            if (adminUsers.length > 0) {
                const adminEmails = adminUsers.map(admin => admin.email);

                const adminEmailBody = `
                    A new student has enrolled.

                    Student Details:
                    ---------------------
                    Student Name: ${student_name}
                    Course Title: ${course.course_title}
                    Batch No: ${course.batch_no}
                    University: ${university}
                    Profession: ${profession}
                    Passing Year: ${passingYear}
                    
                    Please review and confirm the enrollment.

                    Regards,
                    System Notification
                `;

                await sendEmail(adminEmails.join(","), "New Student Enrollment", adminEmailBody);
                console.log("📧 Notification email sent to admin.");
            }
        } catch (adminEmailError) {
            console.error("❌ Error sending email to admin:", adminEmailError);
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
            remark,
            page = 1,
            limit = 10
        } = req.query;

        const pageNumber = parseInt(page) || 1;
        const limitNumber = parseInt(limit) || 10;
        const offset = (pageNumber - 1) * limitNumber;

        let whereClause = {};

        if (courseId) whereClause.CourseId = courseId;
        if (batch_no) whereClause.batch_no = batch_no;
        if (studentId) whereClause.StudentId = { [Op.like]: `%${studentId}%` };
        if (salutation) whereClause.salutation = { [Op.like]: `%${salutation}%` };
        if (student_name) whereClause.student_name = { [Op.like]: `%${student_name}%` };
        if (email) whereClause.email = { [Op.like]: `%${email}%` };
        if (mobile) whereClause.mobile = { [Op.like]: `%${mobile}%` };
        if (university) whereClause.university = { [Op.like]: `%${university}%` };
        if (profession) whereClause.profession = { [Op.like]: `%${profession}%` };
        if (company) whereClause.company = { [Op.like]: `%${company}%` };
        if (remark) whereClause.remark = { [Op.like]: `%${remark}%` };
        if (isEnrolled !== undefined && isEnrolled !== "") whereClause.isEnrolled = parseInt(isEnrolled);

        // ✅ Build include clause for isValid filter
        const includeClause = [
            {
                model: Course,
                attributes: ["courseId", "course_title"]
            },
            {
                model: User,
                attributes: ["isValid"],
                required: isValid !== undefined && isValid !== "",
                where: isValid !== undefined && isValid !== "" ? {
                    isValid: parseInt(isValid)
                } : undefined
            }
        ];

        // ✅ First get total count with same filters
        const totalStudents = await Student.count({
            where: whereClause,
            include: includeClause
        });

        // ✅ Now fetch paginated data
        const students = await Student.findAll({
            where: whereClause,
            attributes: [
                "StudentId", "salutation", "student_name", "email", "mobile", "university",
                "batch_no", "courseTitle", "package", "profession", "company", "designation",
                "experience", "knowMe", "remark", "due", "isEnrolled", "createdAt"
            ],
            include: includeClause,
            order: [["createdAt", "DESC"]],
            offset,
            limit: limitNumber
        });

        return res.status(200).json({
            totalStudents,
            totalPages: Math.ceil(totalStudents / limitNumber),
            currentPage: pageNumber,
            students
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
                "address",
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
                "certificate",
                "opinion",
                "createdAt"
            ],
            include: [
                {
                    model: Course,
                    attributes: ["courseId", "course_title", "drive_folder_id"]
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
        const { studentId } = req.params;
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
            isEnrolled,
            certificate
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
            isEnrolled,
            certificate
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

        // ✅ Define class time and valid attendance window (class time + 2 hours)
        const classTime = moment(`${date} ${course.class_time}`, "DD-MM-YYYY HH:mm:ss");
        const maxAllowedTime = classTime.clone().add(2, "hours"); // ✅ Allow up to 2 hours after class time
        const submittedTime = moment(`${date} ${time}`, "DD-MM-YYYY hh:mm:ss A");

        // ✅ If submitted time is outside the valid window, reject the request
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

        // ✅ Parse Existing Attendance List
        let updatedAttendanceList = attendance.attendanceList ? JSON.parse(attendance.attendanceList) : [];

        // ✅ Check if student already marked attendance within the valid window
        const lastAttendanceEntry = updatedAttendanceList.length > 0 ? updatedAttendanceList[updatedAttendanceList.length - 1] : null;

        if (lastAttendanceEntry) {
            const lastAttendanceTime = moment(lastAttendanceEntry.time, "DD-MM-YYYY hh:mm:ss A");

            // ✅ If last attendance falls within class time window, reject new attendance
            if (lastAttendanceTime.isSameOrAfter(classTime) && lastAttendanceTime.isSameOrBefore(maxAllowedTime)) {
                return res.status(400).json({ message: "You have already given attendance for this session." });
            }
        }

        // ✅ Append New Attendance Record
        updatedAttendanceList.push({ time: `${date} ${time}` });

        // ✅ Update Attendance Table
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

        // ✅ Parse `attendanceList` safely for calculation
        let parsedAttendanceList = [];
        try {
            const raw = attendance.attendanceList;

            if (typeof raw === "string") {
                parsedAttendanceList = JSON.parse(raw);

                // Handle possible double-stringified JSON
                if (typeof parsedAttendanceList === "string") {
                    parsedAttendanceList = JSON.parse(parsedAttendanceList);
                }
            } else if (Array.isArray(raw)) {
                parsedAttendanceList = raw;
            }

            if (!Array.isArray(parsedAttendanceList)) {
                parsedAttendanceList = [];
            }

        } catch (error) {
            console.warn(`⚠️ Failed to parse attendanceList for ${studentId}:`, error.message);
            return res.status(400).json({ message: "Error parsing attendance data!" });
        }

        // ✅ Construct and send response
        const total = parsedAttendanceList.length;
        const percentage = ((total / 30) * 100).toFixed(2) + "%";

        return res.status(200).json({
            studentId: attendance.StudentId,
            studentName: attendance.student_name,
            courseId: attendance.courseId,
            courseTitle: attendance.courseTitle,
            batch_no: attendance.batch_no,
            attendanceList: attendance.attendanceList, // ✅ Keep raw string format in response
            totalClicks: total,
            attendancePercentage: percentage
        });

    } catch (error) {
        console.error("❌ Error fetching attendance:", error);
        return res.status(500).json({ message: "Internal Server Error." });
    }
};

exports.getAllAttendance = async (req, res) => {
    try {
        const { courseId, batch_no, student_name, limit = 10, offset = 0 } = req.query;

        const whereCondition = {};
        if (courseId) whereCondition.courseId = courseId;
        if (batch_no) whereCondition.batch_no = batch_no;
        if (student_name) whereCondition.student_name = { [Op.like]: `%${student_name}%` };

        const totalRecords = await Attendance.count({ where: whereCondition });

        const attendanceRecords = await Attendance.findAll({
            where: whereCondition,
            attributes: ["courseId", "courseTitle", "batch_no", "StudentId", "student_name", "attendanceList"],
            order: [["createdAt", "DESC"]],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        const formattedAttendanceRecords = attendanceRecords.map(record => {
            let parsedAttendanceList = [];

            try {
                // ✅ Step 1: Parse only to count
                const raw = record.attendanceList;

                if (typeof raw === "string") {
                    parsedAttendanceList = JSON.parse(raw);

                    // Handle double-stringified edge case
                    if (typeof parsedAttendanceList === "string") {
                        parsedAttendanceList = JSON.parse(parsedAttendanceList);
                    }
                } else if (Array.isArray(raw)) {
                    parsedAttendanceList = raw;
                }

                if (!Array.isArray(parsedAttendanceList)) {
                    parsedAttendanceList = [];
                }

            } catch (err) {
                console.warn(`⚠️ Could not parse attendanceList for ${record.StudentId}:`, err.message);
                parsedAttendanceList = [];
            }

            const total = parsedAttendanceList.length;
            const percentage = ((total / 30) * 100).toFixed(2) + "%";

            return {
                courseId: record.courseId,
                courseTitle: record.courseTitle,
                batch_no: record.batch_no,
                StudentId: record.StudentId,
                student_name: record.student_name,
                attendanceList: record.attendanceList, // ✅ Keep as string in response
                totalClicks: total,
                attendancePercentage: percentage
            };
        });

        return res.status(200).json({
            success: true,
            totalRecords,
            totalPages: Math.ceil(totalRecords / limit),
            currentPage: Math.floor(offset / limit) + 1,
            attendanceRecords: formattedAttendanceRecords
        });

    } catch (error) {
        console.error("❌ Error fetching attendance records:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

exports.migrateStudent = async (req, res) => {
    const { studentId } = req.params;
    const { CourseId, batch_no, package, remark } = req.body;

    if (!batch_no) {
        return res.status(400).json({ message: "batch_no is required." });
    }

    try {
        const student = await Student.findOne({ where: { studentId } });

        if (!student) {
            return res.status(404).json({ message: `No student found with ID: ${studentId}` });
        }

        const oldBatch = student.batch_no;

        // ✅ Update quiz_answer and remark
        await Student.update(
            {
                quiz_answer: null,
                remark: remark || `Migrated from batch ${oldBatch} to ${batch_no}`,
                CourseId, // ✅ Update courseId as well
                package, // ✅ Update package as well
                batch_no // ✅ Update new batch as well
            },
            { where: { studentId } }
        );

        // ✅ Reset attendance list
        await Attendance.update(
            { attendanceList: null },
            { where: { studentId } }
        );

        return res.status(200).json({
            message: `✅ Attendance and quiz answer reset for ${studentId}`,
            updatedCourse: CourseId,
            updatedBatch: batch_no
        });

    } catch (error) {
        console.error("❌ Error resetting student data:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};

exports.getAllCompanies = async (req, res) => {
  const { search = "", limit } = req.query;

  try {
    let query = `
      SELECT DISTINCT s.company
      FROM students s
      WHERE s.company IS NOT NULL AND TRIM(s.company) != ''
    `;

    const replacements = {};

    // If search is passed → filter by it and force limit to 10
    if (search) {
      query += ` AND s.company LIKE :search ORDER BY s.company ASC LIMIT 10`;
      replacements.search = `%${search}%`;
    } else if (limit) {
      query += ` ORDER BY s.company ASC LIMIT :limit`;
      replacements.limit = parseInt(limit);
    } else {
      query += ` ORDER BY s.company ASC`; // all results, ordered
    }

    const [results] = await sequelize.query(query, { replacements });
    const companies = results.map((row) => row.company);

    res.status(200).json({
      success: true,
      count: companies.length,
      data: companies,
    });
  } catch (error) {
    console.error("Error fetching company list:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};








