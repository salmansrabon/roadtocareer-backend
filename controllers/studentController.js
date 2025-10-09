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
const { grantDriveAccess } = require('../utils/googleDriveHelper');
const AssignmentAnswer = require('../models/AssignmentAnswer');
const {formatDate} = require('../utils/formatDate');

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
            salutation: salutation,
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
                Orientation Date: ${formatDate(course.orientation_date)} at 8:30PM
                Class Start Date: ${formatDate(course.class_start_date)}
                Class Days: ${formattedClassDays}
                Class Time: ${formatTime(course.class_time)}

                Thank you for joining!

                Regards,
                Course Admin
            `;

            const paymentEmailBody = `
                            <div style="font-family: Arial, sans-serif; color: #222;">
                            <p>Assalamu Alaikum,</p>
                            <p>Greetings from <strong>Road to SDET</strong>! Hope you’re doing well. We’re excited to let you know that <strong>batch ${course.batch_no}</strong> is starting soon.</p>
                            
                            <h3 style="color: #2d7cff;">Class Schedule and Related Information:</h3>
                            <ul>
                                <li><strong>Orientation date &amp; time:</strong> ${formatDate(course.orientation_date)} from ${formatTime(course.class_time)}</li>
                                <li><strong>Class start date:</strong> ${formatDate(course.class_start_date)} from ${formatTime(course.class_time)}</li>
                            </ul>
                            <h4>Class schedule:</h4>
                            <ul>
                                <li><strong>Day:</strong> ${formattedClassDays}</li>
                                <li><strong>Time:</strong> ${formatTime(course.class_time)}</li>
                            </ul>
                            <h4>Class link:</h4>
                            <p>You’ll receive a Google Calendar invitation (with the class link) once your payment is complete.</p>
                            <h4>Platform &amp; Resources:</h4>
                            <ul>
                                <li><strong>Student Portal:</strong> Attendance, Assignments &amp; performance tracking</li>
                                <li><strong>Google Drive:</strong> Slides, PDFs &amp; recorded videos</li>
                                <li><strong>Discord:</strong> For support and discussion</li>
                            </ul>
                            <h4>Monthly Rewards:</h4>
                            <p>Top 5 scorers each month will receive a performance bonus of <strong>Tk 500</strong>.</p>
                            <h4>Payment Procedure:</h4>
                            <ul>
                                <li><strong>Total Fee:</strong> Tk 8,500 (payable in 3 installments in 3 months)</li>
                                <li><strong>Installment 1:</strong> Tk 3,000 [Admission time]</li>
                                <li><strong>Installment 2:</strong> Tk 2,500 [Second month]</li>
                                <li><strong>Installment 3:</strong> Tk 3,000 [Third month]</li>
                                <li><strong>Payment Deadline:</strong> ${formatDate(course.orientation_date)} at 11:59 PM</li>
                            </ul>
                            <h4>How to Pay:</h4>
                            <ol>
                                <li>Send money via <strong>Bkash / Nagad</strong> to <strong>01686606909</strong>, including your name in the reference field.</li>
                                <li>After paying, please send a screenshot of your transaction via WhatsApp to <strong>01782808778</strong> to confirm your seat.</li>
                            </ol>
                            <p style="background-color: #f9e530ff; padding: 8px 12px; border-radius: 4px;">
                                <strong>Note:</strong> Don’t miss the orientation—it’s essential to know our rules, regulations, and policies.
                            </p>
                            <p>If you have any questions, feel free to ask on our official support WhatsApp <strong>01782808778</strong>.<br>
                            We look forward to seeing you in class!</p>
                            <hr>
                            <p>
                                Regards,<br>
                                <strong>Team, Road to SDET</strong><br>
                                <a href="https://www.linkedin.com/company/road-to-sdet">Linkedin</a> | 
                                <a href="https://www.facebook.com/roadtosdet">Page</a> | 
                                <a href="https://www.facebook.com/groups/roadtosdet">Group</a> | 
                                <a href="https://www.roadtocareer.net">Website</a> | <br/>
                                WhatsApp: +8801782808778
                            </p>
                        </div>
                            `;

            await sendEmail(email, `Road to SDET- Batch ${course.batch_no} Welcome to our Course!`, studentEmailBody);
            if(course.course_title=="Full Stack SQA"){
                await sendEmail(email, `Road to SDET- Batch ${course.batch_no} Course payment procedure and class schedule`, paymentEmailBody, "text/html");
            }

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
                "package",
                "profession",
                "company",
                "designation",
                "experience",
                "passingYear",
                "knowMe",
                "remark",
                "due",
                "isEnrolled",
                "certificate",
                "opinion",
                "createdAt",
                "get_certificate"
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
            certificate,
            get_certificate
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
            certificate,
            get_certificate
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
        //Find the student
        const student = await Student.findOne({ where: { studentId } });
        if (!student) {
            return res.status(404).json({ message: `No student found with ID: ${studentId}` });
        }
        const oldBatch = student.batch_no;

        //Update student migration info
        await Student.update(
            {
                quiz_answer: null,
                remark: remark || `Migrated from batch ${oldBatch} to ${batch_no}`,
                CourseId, // Update courseId
                package,  // Update package
                batch_no  // Update new batch
            },
            { where: { studentId } }
        );

        //Reset attendance
        await Attendance.update(
            { attendanceList: null },
            { where: { studentId } }
        );

        // Lookup the course's drive folder ID
        const course = await Course.findOne({ where: { courseId: CourseId } });
        if (!course || !course.drive_folder_id) {
            // Handle missing folder gracefully
            return res.status(200).json({
                message: `Attendance and quiz answer reset, but no Drive folder found for CourseId: ${CourseId}`,
                updatedCourse: CourseId,
                updatedBatch: batch_no
            });
        }

        // Grant drive access to student
        const driveResult = await grantDriveAccess(course.drive_folder_id, student.email);
        console.log("Drive access result:", driveResult);

        if (!driveResult.success) {
            return res.status(200).json({
                message: `Migration done, but failed to grant Drive access: ${driveResult.error}`,
                updatedCourse: CourseId,
                updatedBatch: batch_no
            });
        }

        // ✅ Send migration notification email to student
        try {
            const migrationEmailBody = `
                Dear ${student.student_name},

                We are writing to inform you that your enrollment has been successfully migrated.

                Migration Details:
                -----------------
                Student ID: ${studentId}
                Previous Batch: ${oldBatch}
                New Batch: ${batch_no}
                Course: ${course.course_title}
                ${remark ? `Remark: ${remark}` : ''}

                Your attendance records and quiz answers have been reset for the new batch. You now have access to the course materials through Google Drive.

                If you have any questions about this migration, please contact our support team.

                Best regards,
                Road to SDET Team
            `;

            await sendEmail(student.email, "Course Migration Notification - Road to SDET", migrationEmailBody);
            console.log("📧 Migration notification email sent to student successfully.");
        } catch (emailError) {
            console.error("❌ Error sending migration notification email:", emailError);
            // Don't fail the migration if email fails, just log the error
        }

        return res.status(200).json({
            message: `Attendance and quiz answer reset, Drive access granted for ${studentId}`,
            updatedCourse: CourseId,
            updatedBatch: batch_no,
            drivePermissionId: driveResult.permissionId
        });

    } catch (error) {
        console.error("❌ Error in migration:", error);
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

// Helper function from earlier

function calculateCourseCompletion(attendance, assignment) {
    const minAttendance = 30;
    const minAssignment = 10;

    // Cap to max values
    const cappedAttendance = Math.min(attendance, minAttendance);
    const cappedAssignment = Math.min(assignment, minAssignment);

    // Compute individual percentages
    const attendancePercent = (cappedAttendance / minAttendance) * 100;
    const assignmentPercent = (cappedAssignment / minAssignment) * 100;

    // If either is 100% and the other is 0%, result is 50%
    if ((attendancePercent === 100 && assignmentPercent === 0) ||
        (assignmentPercent === 100 && attendancePercent === 0)) {
        return 50;
    }

    // If both are zero, return 0
    if (attendancePercent === 0 && assignmentPercent === 0) {
        return 0;
    }

    // For minimal progress: 3 attendance & 1 assignment = 10%
    if (cappedAttendance >= 3 && cappedAssignment >= 1 &&
        attendancePercent < 100 && assignmentPercent < 100) {
        // Calculate proportional progress, but not less than 10%
        const proportional = Math.round((attendancePercent + assignmentPercent) / 2);
        return proportional < 10 ? 10 : proportional;
    }

    // Otherwise, average both
    return Math.round((attendancePercent + assignmentPercent) / 2);
}


exports.getCourseProgress = async (req, res) => {
    try {
        const { studentId } = req.params;

        // 1. Get all attendance records for the student
        const attendanceRecords = await Attendance.findAll({
            where: { StudentId: studentId }
        });

        // 2. Calculate total attendance count by parsing attendanceList arrays
        let attendanceCount = 0;
        attendanceRecords.forEach(record => {
            if (record.attendanceList) {
                try {
                    const list = JSON.parse(record.attendanceList);
                    if (Array.isArray(list)) {
                        attendanceCount += list.length;
                    }
                } catch {
                    // ignore parse errors
                }
            }
        });

        // 3. Get assignment count (out of 10 total assignments)
        const assignmentCount = await AssignmentAnswer.count({
            where: { StudentId: studentId, Score: { [Op.ne]: null } }
        });

        // 4. Calculate percentages
        const attendancePercentage = Math.min((attendanceCount / 30) * 100, 100);
        const assignmentPercentage = Math.min((assignmentCount / 10) * 100, 100);

        // 5. Overall completion is the average of the two
        const courseCompletionPercentage = Math.round(
            (attendancePercentage + assignmentPercentage) / 2
        );

        // 6. Return the results
        res.json({
            attendanceCount,
            assignmentCount,
            attendancePercentage: Math.round(attendancePercentage),
            assignmentPercentage: Math.round(assignmentPercentage),
            courseCompletionPercentage
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
