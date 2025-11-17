const Student = require("../models/Student");
const Course = require("../models/Course");
const Package = require("../models/Package");
const User = require("../models/User");
const Attendance = require("../models/Attendance");
const bcrypt = require("bcryptjs");
const { Op, Sequelize } = require("sequelize");
const moment = require("moment-timezone");
const { sendEmail } = require("../utils/emailHelper");
const sequelize = require("../config/db");
const { grantDriveAccess } = require('../utils/googleDriveHelper');
const AssignmentAnswer = require('../models/AssignmentAnswer');
const {formatDate} = require('../utils/formatDate');
const { parseAttendanceList, calculateAttendancePercentage } = require('../utils/attendanceHelper');

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

        // ✅ Prepare employment data if company/designation/experience provided
        let employmentData = null;
        if (company || designation || experience) {
            employmentData = {
                totalExperience: experience || "",
                company: [{
                    companyName: company || "",
                    designation: designation || "",
                    employmentDuration: "", // Empty during signup
                    experience: experience || ""
                }]
            };
        }

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
            employment: employmentData,
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
            // Check if course title contains "Full Stack SQA" (case-insensitive, flexible with hyphens/spacing)
            const courseTitle = course.course_title.toLowerCase().replace(/[-\s]+/g, ' ');
            if(courseTitle.includes('full stack sqa')){
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
                "experience", "employment", "skill", "lookingForJob", "isISTQBCertified", "knowMe", "remark", "due", "isEnrolled", "photo", "certificate", "get_certificate", "passingYear", "linkedin", "github",
                "isMobilePublic", "isEmailPublic", "isLinkedInPublic", "isGithubPublic", "createdAt"
            ],
            include: includeClause,
            order: [["get_certificate", "DESC"], ["createdAt", "DESC"]],
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
                "previous_batch_no",
                "previous_course_id",
                "courseTitle",
                "package",
                "profession",
                "company",
                "designation",
                "experience",
                "employment",
                "skill",
                "lookingForJob",
                "isISTQBCertified",
                "passingYear",
                "knowMe",
                "remark",
                "due",
                "isEnrolled",
                "certificate",
                "photo",
                "linkedin",
                "github",
                "isMobilePublic",
                "isEmailPublic",
                "isLinkedInPublic",
                "isGithubPublic",
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
            passingYear,
            profession,
            company,
            designation,
            experience,
            knowMe,
            remark,
            opinion,
            isEnrolled,
            certificate,
            get_certificate,
            previous_course_id,
            previous_batch_no
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
            passingYear,
            profession,
            company,
            designation,
            experience,
            employment: req.body.employment,
            skill: req.body.skill,
            lookingForJob: req.body.lookingForJob,
            isISTQBCertified: req.body.isISTQBCertified,
            knowMe,
            remark,
            opinion,
            isEnrolled,
            certificate,
            photo: req.body.photo,
            linkedin: req.body.linkedin,
            github: req.body.github,
            isMobilePublic: req.body.isMobilePublic,
            isEmailPublic: req.body.isEmailPublic,
            isLinkedInPublic: req.body.isLinkedInPublic,
            isGithubPublic: req.body.isGithubPublic,
            get_certificate,
            previous_course_id,
            previous_batch_no
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
        const { studentId, date, time, timezone } = req.body;

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

        // ✅ Get student's timezone offset (in minutes) or default to Asia/Dhaka
        const studentTimezone = timezone || 'Asia/Dhaka';

        // ✅ Parse submitted time in student's timezone and convert to UTC
        const submittedTimeLocal = moment.tz(`${date} ${time}`, "DD-MM-YYYY hh:mm:ss A", studentTimezone);
        const submittedTimeUTC = submittedTimeLocal.clone().utc();

        // ✅ Parse class time as Bangladesh time (Asia/Dhaka) and convert to UTC
        const classTimeLocal = moment.tz(`${date} ${course.class_time}`, "DD-MM-YYYY HH:mm:ss", "Asia/Dhaka");
        const classTimeUTC = classTimeLocal.clone().utc();
        const maxAllowedTimeUTC = classTimeUTC.clone().add(2, "hours");

        // ✅ If submitted time is outside the valid window, reject the request
        if (submittedTimeUTC.isBefore(classTimeUTC) || submittedTimeUTC.isAfter(maxAllowedTimeUTC)) {
            return res.status(400).json({ 
                message: "Please give attendance during class time (within 2 hours of class start).",
                debug: {
                    submittedTime: submittedTimeUTC.format(),
                    classTime: classTimeUTC.format(),
                    maxAllowedTime: maxAllowedTimeUTC.format()
                }
            });
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
            // Parse last attendance time (stored in student's local timezone)
            const lastAttendanceTime = moment.tz(lastAttendanceEntry.time, "DD-MM-YYYY hh:mm:ss A", lastAttendanceEntry.timezone || 'Asia/Dhaka');
            const lastAttendanceUTC = lastAttendanceTime.clone().utc();

            // ✅ If last attendance falls within class time window, reject new attendance
            if (lastAttendanceUTC.isSameOrAfter(classTimeUTC) && lastAttendanceUTC.isSameOrBefore(maxAllowedTimeUTC)) {
                return res.status(400).json({ message: "You have already given attendance for this session." });
            }
        }

        // ✅ Append New Attendance Record with timezone info
        updatedAttendanceList.push({ 
            time: `${date} ${time}`,
            timezone: studentTimezone,
            utcTime: submittedTimeUTC.format("DD-MM-YYYY hh:mm:ss A")
        });

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

        // ✅ Parse attendance list using helper function
        const parsedAttendanceList = parseAttendanceList(attendance.attendanceList);

        // ✅ Calculate attendance stats using helper function
        const { totalClicks, attendancePercentage } = calculateAttendancePercentage(parsedAttendanceList.length);

        return res.status(200).json({
            studentId: attendance.StudentId,
            studentName: attendance.student_name,
            courseId: attendance.courseId,
            courseTitle: attendance.courseTitle,
            batch_no: attendance.batch_no,
            attendanceList: attendance.attendanceList, // ✅ Keep raw string format in response
            totalClicks,
            attendancePercentage
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
            // ✅ Parse attendance list using helper function
            const parsedAttendanceList = parseAttendanceList(record.attendanceList);

            // ✅ Calculate attendance stats using helper function
            const { totalClicks, attendancePercentage } = calculateAttendancePercentage(parsedAttendanceList.length);

            return {
                courseId: record.courseId,
                courseTitle: record.courseTitle,
                batch_no: record.batch_no,
                StudentId: record.StudentId,
                student_name: record.student_name,
                attendanceList: record.attendanceList, // ✅ Keep as string in response
                totalClicks,
                attendancePercentage
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
        const oldCourseId = student.CourseId;

        //Update student migration info
        await Student.update(
            {
                quiz_answer: null,
                remark: remark || `Migrated from batch ${oldBatch} to ${batch_no}`,
                CourseId, // Update courseId
                package,  // Update package
                batch_no,  // Update new batch
                previous_batch_no: oldBatch, // Save old batch to previous_batch_no
                previous_course_id: oldCourseId // Save old course ID to previous_course_id
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

// ✅ Advanced Search for QA Talent
exports.searchQATalent = async (req, res) => {
    try {
        const {
            experience,
            maxExperience,
            skills,
            university,
            company,
            isISTQBCertified,
            lookingForJob,
            verified,
            passingYear,
            searchTerm,
            page = 1,
            limit = 10
        } = req.query;

        const pageNumber = parseInt(page) || 1;
        const limitNumber = parseInt(limit) || 10;
        const offset = (pageNumber - 1) * limitNumber;

        let whereClause = {};
        let orConditions = [];
        
        // ✅ Filter by ISTQB Certification
        if (isISTQBCertified) {
            whereClause.isISTQBCertified = isISTQBCertified;
        }

        // ✅ Filter by Looking for Job
        if (lookingForJob) {
            whereClause.lookingForJob = lookingForJob;
        }

        // ✅ Filter by University
        if (university) {
            whereClause.university = { [Op.like]: `%${university}%` };
        }

        // ✅ Filter by Verified (certificate or get_certificate)
        if (verified === 'Yes') {
            whereClause[Op.or] = [
                { certificate: { [Op.ne]: null, [Op.ne]: '' } },
                { get_certificate: true }
            ];
        } else if (verified === 'No') {
            whereClause[Op.and] = whereClause[Op.and] || [];
            whereClause[Op.and].push({
                [Op.or]: [
                    { certificate: { [Op.or]: [{ [Op.is]: null }, { [Op.eq]: '' }] } },
                    { certificate: null }
                ],
                [Op.or]: [
                    { get_certificate: { [Op.or]: [false, null] } },
                    { get_certificate: false }
                ]
            });
        }

        // ✅ Filter by Passing Year
        if (passingYear) {
            whereClause.passingYear = { [Op.like]: `%${passingYear}%` };
        }

        // ✅ Filter by Total Experience (numeric comparison for experience range from employment.totalExperience)
        if (experience || maxExperience) {
            const minExperience = experience ? parseFloat(experience) : null;
            const maxExp = maxExperience ? parseFloat(maxExperience) : null;
            
            whereClause[Sequelize.Op.and] = whereClause[Sequelize.Op.and] || [];
            
            if (minExperience !== null && maxExp !== null && !isNaN(minExperience) && !isNaN(maxExp)) {
                // Both min and max provided - range filter (max is exclusive, so we use < max+1)
                whereClause[Sequelize.Op.and].push(
                    Sequelize.literal(`(employment IS NOT NULL AND JSON_EXTRACT(employment, '$.totalExperience') IS NOT NULL AND JSON_UNQUOTE(JSON_EXTRACT(employment, '$.totalExperience')) != '' AND JSON_UNQUOTE(JSON_EXTRACT(employment, '$.totalExperience')) REGEXP '^[0-9]+\\\\.?[0-9]*$' AND CAST(JSON_UNQUOTE(JSON_EXTRACT(employment, '$.totalExperience')) AS DECIMAL(10,2)) >= ${minExperience} AND CAST(JSON_UNQUOTE(JSON_EXTRACT(employment, '$.totalExperience')) AS DECIMAL(10,2)) < ${maxExp + 1})`)
                );
            } else if (minExperience !== null && !isNaN(minExperience)) {
                // Only minimum provided - minimum filter
                whereClause[Sequelize.Op.and].push(
                    Sequelize.literal(`(employment IS NOT NULL AND JSON_EXTRACT(employment, '$.totalExperience') IS NOT NULL AND JSON_UNQUOTE(JSON_EXTRACT(employment, '$.totalExperience')) != '' AND JSON_UNQUOTE(JSON_EXTRACT(employment, '$.totalExperience')) REGEXP '^[0-9]+\\\\.?[0-9]*$' AND CAST(JSON_UNQUOTE(JSON_EXTRACT(employment, '$.totalExperience')) AS DECIMAL(10,2)) >= ${minExperience})`)
                );
            } else if (maxExp !== null && !isNaN(maxExp)) {
                // Only maximum provided - maximum filter (max is exclusive, so we use < max+1)
                whereClause[Sequelize.Op.and].push(
                    Sequelize.literal(`(employment IS NOT NULL AND JSON_EXTRACT(employment, '$.totalExperience') IS NOT NULL AND JSON_UNQUOTE(JSON_EXTRACT(employment, '$.totalExperience')) != '' AND JSON_UNQUOTE(JSON_EXTRACT(employment, '$.totalExperience')) REGEXP '^[0-9]+\\\\.?[0-9]*$' AND CAST(JSON_UNQUOTE(JSON_EXTRACT(employment, '$.totalExperience')) AS DECIMAL(10,2)) < ${maxExp + 1})`)
                );
            }
        }

        // ✅ Filter by Company (search in company field and employment JSON)
        if (company) {
            orConditions.push(
                { company: { [Op.like]: `%${company}%` } },
                Sequelize.where(
                    Sequelize.literal(`JSON_SEARCH(employment, 'one', '%${company}%')`),
                    { [Op.ne]: null }
                )
            );
        }

        // ✅ Filter by Skills (search in skill JSON for both soft and technical skills)
        // Supports both comma-separated string and JSON array format
        if (skills) {
            const skillsArray = skills.split(',').map(s => s.trim()).filter(s => s);
            
            if (skillsArray.length > 0) {
                const skillConditions = [];
                
                skillsArray.forEach(skill => {
                    // Search in soft_skill (string)
                    skillConditions.push(
                        Sequelize.where(
                            Sequelize.literal(`JSON_UNQUOTE(JSON_EXTRACT(skill, '$.soft_skill'))`),
                            { [Op.like]: `%${skill}%` }
                        )
                    );
                    
                    // Search in technical_skill (can be string or JSON array)
                    skillConditions.push(
                        Sequelize.where(
                            Sequelize.literal(`JSON_UNQUOTE(JSON_EXTRACT(skill, '$.technical_skill'))`),
                            { [Op.like]: `%${skill}%` }
                        )
                    );
                    
                    // Search in JSON array elements for technical_skill
                    skillConditions.push(
                        Sequelize.where(
                            Sequelize.literal(`JSON_SEARCH(skill, 'one', '${skill}', NULL, '$.technical_skill[*]')`),
                            { [Op.ne]: null }
                        )
                    );
                });
                
                orConditions.push(...skillConditions);
            }
        }

        // ✅ General Search Term (searches across name, email, profession)
        if (searchTerm) {
            const searchConditions = [
                { student_name: { [Op.like]: `%${searchTerm}%` } },
                { email: { [Op.like]: `%${searchTerm}%` } },
                { profession: { [Op.like]: `%${searchTerm}%` } }
            ];
            
            if (orConditions.length > 0) {
                whereClause[Op.and] = [
                    { [Op.or]: orConditions },
                    { [Op.or]: searchConditions }
                ];
            } else {
                whereClause[Op.or] = searchConditions;
            }
        } else if (orConditions.length > 0) {
            whereClause[Op.or] = orConditions;
        }

        // ✅ Get total count
        const totalStudents = await Student.count({
            where: whereClause,
            include: [{
                model: Course,
                attributes: ["courseId", "course_title"],
                required: false
            }]
        });

        // ✅ Fetch filtered students
        const students = await Student.findAll({
            where: whereClause,
            attributes: [
                "StudentId", "salutation", "student_name", "email", "mobile", "university",
                "batch_no", "courseTitle", "package", "profession", "company", "designation",
                "experience", "employment", "skill", "lookingForJob", "isISTQBCertified", 
                "knowMe", "remark", "due", "isEnrolled", "photo", "certificate", "get_certificate", "passingYear", 
                "linkedin", "github", "isMobilePublic", "isEmailPublic", "isLinkedInPublic", 
                "isGithubPublic", "createdAt"
            ],
            include: [{
                model: Course,
                attributes: ["courseId", "course_title"],
                required: false
            }],
            order: [["get_certificate", "DESC"], ["createdAt", "DESC"]],
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
        console.error("Error searching QA talent:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// ✅ AI-Powered Search using OpenAI GPT-4-mini
exports.aiSearchQATalent = async (req, res) => {
    try {
        const { query } = req.body;

        if (!query || query.trim().length === 0) {
            return res.status(400).json({ error: "Search query is required" });
        }

        // Import OpenAI
        const OpenAI = require('openai');
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });

        // Create a prompt for GPT-4-mini to extract search parameters
        const systemPrompt = `You are an intelligent QA talent search assistant. Your goal is to find the BEST matching candidates even when exact skills aren't available. Always return relevant results by using fallback skills and related technologies.

CRITICAL "BEST" CANDIDATE DETECTION:
When users ask for "best", "top", "elite", "premium", "highest quality", "most qualified", "star", "excellent", or similar superlatives, set "findBest": true. This triggers a special ranking algorithm that prioritizes:
1. VERIFIED students (get_certificate = true) - HIGHEST priority
2. ISTQB certified professionals - HIGH priority  
3. Students with the most technical skills - MEDIUM priority
4. Higher experience levels - MEDIUM priority
5. Currently enrolled/active students - LOW priority

Database Schema:
- students table with fields: student_name, email, university, batch_no, passingYear, company, designation, profession, lookingForJob (enum: 'Yes'/'No'), isISTQBCertified (enum: 'Yes'/'No'), certificate (URL string - when present, student is "verified")
- employment (JSON): { totalExperience: "2.5", company: [{companyName, designation, experience}] }
- skill (JSON): { soft_skill: "text", technical_skill: ["Selenium", "Java", "Python", "JavaScript", "TypeScript", "C#", "API Testing", "REST API", "SOAP API", "Postman","Newman", "SQL", "MySQL", "PostgreSQL", "MongoDB", "Cypress", "Playwright", "TestNG", "JUnit", "Pytest", "Jest", "Mocha", "JIRA", "TestRail", "Zephyr", "Jenkins", "Git", "GitHub", "GitLab", "Appium", "Mobile Testing", "Android Testing", "iOS Testing", "Performance Testing", "Load Testing", "Stress Testing", "JMeter", "LoadRunner", "Gatling", "Cucumber", "BDD", "TDD", "Agile", "Scrum", "Manual Testing", "Regression Testing", "Smoke Testing", "Sanity Testing", "Integration Testing", "UAT", "Exploratory Testing", "Usability Testing", "Compatibility Testing", "Cross-browser Testing", "Security Testing", "Accessibility Testing", "ETL Testing", "Database Testing", "Visual Testing","Figma", "Contract Testing", "Session-based Testing", "Risk-based Testing", "Test Data Management", "Localization Testing", "Internationalization Testing", "A/B Testing", "Chaos Engineering", "Test Cases", "Test Plan", "Test Estimation", "Acceptance Criteria", "Bug Lifecycle", "Bug Triage", "Root Cause Analysis", "Katalon Studio", "Robot Framework", "SoapUI", "REST Assured", "Docker", "Kubernetes", "AWS", "Azure", "CI/CD", "Maven", "Gradle", "Automation Testing", "Linux","Ubuntu"] }

CRITICAL FALLBACK RULES - ALWAYS FIND CANDIDATES:
1. **Security Testing**: If no exact match, use: "BurpSuite, OWASP, ZAP, Nessus, Wireshark, Penetration Testing, Ethical Hacking"
2. **PyTest/Python Testing**: If no PyTest, use: "Python, Selenium, API Testing, Automation Testing"
3. **Performance Testing**: If no exact match, use: "JMeter, LoadRunner, Gatling, Load Testing, Stress Testing"
4. **API Testing**: If no exact match, use: "Postman, REST API, SOAP API, REST Assured, Newman"
5. **Mobile Testing**: If no exact match, use: "Appium, Android Testing, iOS Testing, Mobile Testing"
6. **Database Testing**: If no exact match, use: "SQL, MySQL, PostgreSQL, MongoDB, ETL Testing"
7. **Cloud Testing**: If no exact match, use: "AWS, Azure, Docker, Kubernetes"
8. **CI/CD**: If no exact match, use: "Jenkins, Git, GitHub, GitLab, Docker"
9. **Frontend Testing**: If no exact match, use: "JavaScript, TypeScript, Selenium, Cypress, Playwright"
10. **Backend Testing**: If no exact match, use: "API Testing, SQL, Java, Python, C#"

IMPORTANT SKILL MAPPING RULES:
1. When user says "automation expert" or "automation engineer" or "automation tester", map to: "Selenium,Playwright,Cypress,TestNG,Automation Testing"
2. When user says "API expert" or "API testing", map to: "API Testing,Postman,RestAssured" (fallback: "REST API,SOAP API,Newman")
3. When user says "manual tester" or "manual testing", map to: "Manual Testing,JIRA,Test Case Design"
4. When user says "performance tester", map to: "Performance Testing,JMeter,LoadRunner" (fallback: "Load Testing,Stress Testing,Gatling")
5. When user says "mobile tester" or "mobile testing", map to: "Mobile Testing,Appium,Android,iOS" (fallback: "Android Testing,iOS Testing")
6. When user says "web automation", map to: "Selenium,Playwright,Cypress"
7. When user says "security testing", map to: "Security Testing" (fallback: "BurpSuite,OWASP,ZAP,Penetration Testing")
8. When user says "python testing" or "pytest", map to: "Pytest" (fallback: "Python,Selenium,API Testing")
9. When user says "java testing", map to: "TestNG,JUnit" (fallback: "Java,Selenium,API Testing")
10. When user says "javascript testing", map to: "Jest,Mocha" (fallback: "JavaScript,Cypress,Playwright")
11. Always include related skills for broad terms (e.g., "Java expert" should include "Selenium,TestNG" if testing context)

IMPORTANT VERIFICATION RULES:
- When user says "verified" or "verified QA" or "verified engineers", set "verified": "Yes"
- "Verified" means student has completed our course and has a certificate (either certificate URL or get_certificate is true)
- ISTQB certified is different from verified - it's an international certification
- "Unverified" or "not verified" should set "verified": "No"

IMPORTANT JOB SEEKING RULES:
- When user says "available candidates", "available QA", "open to opportunities", set "lookingForJob": "Yes"
- "Available" and "looking for opportunities" both mean actively seeking employment

"BEST" CANDIDATE EXAMPLES:
User: "Find the best QA in this portal"
Response: {"findBest": true}

User: "Show me top QA engineers"
Response: {"findBest": true}

User: "Who are the most qualified testers here?"
Response: {"findBest": true}

User: "Find elite QA professionals"
Response: {"findBest": true}

User: "Show me premium QA talent"
Response: {"findBest": true}

Return ONLY a valid JSON object with these optional fields:
{
  "findBest": true or false,
  "experience": number (minimum years),
  "maxExperience": number (maximum years),
  "skills": "comma,separated,skills",
  "fallbackSkills": "comma,separated,fallback,skills",
  "university": "string",
  "company": "string",
  "lookingForJob": "Yes" or "No",
  "isISTQBCertified": "Yes" or "No",
  "verified": "Yes" or "No" (for students with certificate),
  "passingYear": "string",
  "searchTerm": "string for name/email/profession search"
}

FALLBACK EXAMPLES:
User: "Find QA who is very good at security testing"
Response: {"skills": "Security Testing", "fallbackSkills": "BurpSuite,OWASP,ZAP,Penetration Testing,Ethical Hacking"}

User: "Find me who is good at PyTest"
Response: {"skills": "Pytest", "fallbackSkills": "Python,Selenium,API Testing,Automation Testing"}

User: "Looking for performance testing experts"
Response: {"skills": "Performance Testing,JMeter,LoadRunner", "fallbackSkills": "Load Testing,Stress Testing,Gatling"}

User: "Need mobile testing specialists"
Response: {"skills": "Mobile Testing,Appium", "fallbackSkills": "Android Testing,iOS Testing"}

User: "Find database testing experts"
Response: {"skills": "Database Testing", "fallbackSkills": "SQL,MySQL,PostgreSQL,ETL Testing"}

User: "Looking for CI/CD experts"
Response: {"skills": "CI/CD,Jenkins", "fallbackSkills": "Git,GitHub,Docker,Kubernetes"}

REGULAR EXAMPLES:
User: "Find QA with 2 years experience and Playwright expert"
Response: {"experience": 2, "skills": "Playwright"}

User: "Looking for ISTQB certified testers from Dhaka University"
Response: {"isISTQBCertified": "Yes", "university": "Dhaka University"}

User: "Find me some automation expert"
Response: {"skills": "Selenium,Playwright,Cypress,TestNG,Automation Testing"}

User: "Find available candidates"
Response: {"lookingForJob": "Yes"}`;

        // Call OpenAI API
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: query }
            ],
            temperature: 0.3,
            max_tokens: 500
        });

        const aiResponse = completion.choices[0].message.content.trim();
        
        // Parse AI response
        let searchParams;
        try {
            // Remove markdown code blocks if present
            const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                searchParams = JSON.parse(jsonMatch[0]);
            } else {
                searchParams = JSON.parse(aiResponse);
            }
        } catch (parseError) {
            console.error("Failed to parse AI response:", aiResponse);
            return res.status(500).json({ 
                error: "Failed to understand your query. Please try rephrasing.",
                aiResponse 
            });
        }

        // Handle "find best" candidates with special ranking algorithm
        if (searchParams.findBest) {
            // Fetch all students for ranking (limit to reasonable number for performance)
            const allStudents = await Student.findAll({
                attributes: [
                    "StudentId", "salutation", "student_name", "email", "mobile", "university",
                    "batch_no", "courseTitle", "package", "profession", "company", "designation",
                    "experience", "employment", "skill", "lookingForJob", "isISTQBCertified", 
                    "knowMe", "remark", "due", "isEnrolled", "photo", "certificate", "get_certificate", "passingYear", 
                    "linkedin", "github", "isMobilePublic", "isEmailPublic", "isLinkedInPublic", 
                    "isGithubPublic", "createdAt"
                ],
                include: [{
                    model: Course,
                    attributes: ["courseId", "course_title"],
                    required: false
                }],
                limit: 500 // Fetch more students for ranking
            });

            // Calculate scores for each student
            const scoredStudents = allStudents.map(student => {
                let score = 0;
                const studentData = student.toJSON();

                // VERIFIED status - HIGHEST priority (+50 points)
                if (studentData.get_certificate === true || (studentData.certificate && studentData.certificate.trim() !== '')) {
                    score += 50;
                }

                // ISTQB certification - HIGH priority (+30 points)
                if (studentData.isISTQBCertified === 'Yes') {
                    score += 30;
                }

                // Number of technical skills - MEDIUM priority (+1 point per skill, max 20)
                if (studentData.skill && typeof studentData.skill === 'object' && studentData.skill.technical_skill) {
                    let skillCount = 0;
                    if (Array.isArray(studentData.skill.technical_skill)) {
                        skillCount = studentData.skill.technical_skill.length;
                    } else if (typeof studentData.skill.technical_skill === 'string') {
                        skillCount = studentData.skill.technical_skill.split(',').length;
                    }
                    score += Math.min(skillCount, 20); // Cap at 20 points
                }

                // Experience level - MEDIUM priority (+1 point per year, max 10)
                if (studentData.employment && typeof studentData.employment === 'object' && studentData.employment.totalExperience) {
                    const experience = parseFloat(studentData.employment.totalExperience) || 0;
                    score += Math.min(Math.floor(experience), 10); // Cap at 10 points
                }

                // Currently enrolled - LOW priority (+5 points)
                if (studentData.isEnrolled === true || studentData.isEnrolled === 1) {
                    score += 5;
                }

                return {
                    ...studentData,
                    qualityScore: score
                };
            });

            // Sort by quality score (descending) and return top 50
            const topStudents = scoredStudents
                .sort((a, b) => b.qualityScore - a.qualityScore)
                .slice(0, 50);

            return res.status(200).json({
                totalStudents: topStudents.length,
                students: topStudents,
                searchParams,
                originalQuery: query,
                isBestSearch: true,
                rankingCriteria: {
                    verified: "50 points",
                    istqbCertified: "30 points", 
                    skillsCount: "1 point per skill (max 20)",
                    experienceYears: "1 point per year (max 10)",
                    enrolled: "5 points"
                }
            });
        }

        // Build SQL where clause based on AI-extracted parameters
        let whereClause = {};
        let orConditions = [];

        // Filter by Verified (certificate or get_certificate)
        if (searchParams.verified === 'Yes') {
            whereClause[Op.or] = [
                { certificate: { [Op.ne]: null, [Op.ne]: '' } },
                { get_certificate: true }
            ];
        } else if (searchParams.verified === 'No') {
            whereClause[Op.and] = whereClause[Op.and] || [];
            whereClause[Op.and].push({
                [Op.or]: [
                    { certificate: { [Op.or]: [{ [Op.is]: null }, { [Op.eq]: '' }] } },
                    { certificate: null }
                ],
                [Op.or]: [
                    { get_certificate: { [Op.or]: [false, null] } },
                    { get_certificate: false }
                ]
            });
        }

        // Filter by ISTQB Certification
        if (searchParams.isISTQBCertified) {
            whereClause.isISTQBCertified = searchParams.isISTQBCertified;
        }

        // Filter by Looking for Job
        if (searchParams.lookingForJob) {
            whereClause.lookingForJob = searchParams.lookingForJob;
        }

        // Filter by University
        if (searchParams.university) {
            whereClause.university = { [Op.like]: `%${searchParams.university}%` };
        }

        // Filter by Passing Year
        if (searchParams.passingYear) {
            whereClause.passingYear = { [Op.like]: `%${searchParams.passingYear}%` };
        }

        // Filter by Experience (supports range)
        if (searchParams.experience || searchParams.maxExperience) {
            const minExperience = searchParams.experience ? parseFloat(searchParams.experience) : null;
            const maxExp = searchParams.maxExperience ? parseFloat(searchParams.maxExperience) : null;
            
            whereClause[Sequelize.Op.and] = whereClause[Sequelize.Op.and] || [];
            
            if (minExperience !== null && maxExp !== null && !isNaN(minExperience) && !isNaN(maxExp)) {
                // Both min and max provided - range filter (max is exclusive, so we use < max+1)
                whereClause[Sequelize.Op.and].push(
                    Sequelize.literal(`(employment IS NOT NULL AND JSON_EXTRACT(employment, '$.totalExperience') IS NOT NULL AND JSON_UNQUOTE(JSON_EXTRACT(employment, '$.totalExperience')) != '' AND JSON_UNQUOTE(JSON_EXTRACT(employment, '$.totalExperience')) REGEXP '^[0-9]+\\\\.?[0-9]*$' AND CAST(JSON_UNQUOTE(JSON_EXTRACT(employment, '$.totalExperience')) AS DECIMAL(10,2)) >= ${minExperience} AND CAST(JSON_UNQUOTE(JSON_EXTRACT(employment, '$.totalExperience')) AS DECIMAL(10,2)) < ${maxExp + 1})`)
                );
            } else if (minExperience !== null && !isNaN(minExperience)) {
                // Only minimum provided - minimum filter
                whereClause[Sequelize.Op.and].push(
                    Sequelize.literal(`(employment IS NOT NULL AND JSON_EXTRACT(employment, '$.totalExperience') IS NOT NULL AND JSON_UNQUOTE(JSON_EXTRACT(employment, '$.totalExperience')) != '' AND JSON_UNQUOTE(JSON_EXTRACT(employment, '$.totalExperience')) REGEXP '^[0-9]+\\\\.?[0-9]*$' AND CAST(JSON_UNQUOTE(JSON_EXTRACT(employment, '$.totalExperience')) AS DECIMAL(10,2)) >= ${minExperience})`)
                );
            } else if (maxExp !== null && !isNaN(maxExp)) {
                // Only maximum provided - maximum filter (max is exclusive, so we use < max+1)
                whereClause[Sequelize.Op.and].push(
                    Sequelize.literal(`(employment IS NOT NULL AND JSON_EXTRACT(employment, '$.totalExperience') IS NOT NULL AND JSON_UNQUOTE(JSON_EXTRACT(employment, '$.totalExperience')) != '' AND JSON_UNQUOTE(JSON_EXTRACT(employment, '$.totalExperience')) REGEXP '^[0-9]+\\\\.?[0-9]*$' AND CAST(JSON_UNQUOTE(JSON_EXTRACT(employment, '$.totalExperience')) AS DECIMAL(10,2)) < ${maxExp + 1})`)
                );
            }
        }

        // Filter by Company
        if (searchParams.company) {
            orConditions.push(
                { company: { [Op.like]: `%${searchParams.company}%` } },
                Sequelize.where(
                    Sequelize.literal(`JSON_SEARCH(employment, 'one', '%${searchParams.company}%')`),
                    { [Op.ne]: null }
                )
            );
        }

        // Filter by Skills (with fallback logic)
        if (searchParams.skills) {
            const skillsArray = searchParams.skills.split(',').map(s => s.trim()).filter(s => s);
            
            if (skillsArray.length > 0) {
                const skillConditions = [];
                
                skillsArray.forEach(skill => {
                    skillConditions.push(
                        Sequelize.where(
                            Sequelize.literal(`JSON_SEARCH(skill, 'one', '%${skill}%', NULL, '$.technical_skill')`),
                            { [Op.ne]: null }
                        )
                    );
                });
                
                orConditions.push(...skillConditions);
            }
        }

        // Add fallback skills if provided (for when primary skills don't match)
        if (searchParams.fallbackSkills) {
            const fallbackSkillsArray = searchParams.fallbackSkills.split(',').map(s => s.trim()).filter(s => s);
            
            if (fallbackSkillsArray.length > 0) {
                const fallbackSkillConditions = [];
                
                fallbackSkillsArray.forEach(skill => {
                    fallbackSkillConditions.push(
                        Sequelize.where(
                            Sequelize.literal(`JSON_SEARCH(skill, 'one', '%${skill}%', NULL, '$.technical_skill')`),
                            { [Op.ne]: null }
                        )
                    );
                });
                
                // Add fallback skills as OR conditions (they will be used if primary skills don't match)
                orConditions.push(...fallbackSkillConditions);
            }
        }

        // Filter by Search Term (name, email, profession)
        if (searchParams.searchTerm) {
            const searchConditions = [
                { student_name: { [Op.like]: `%${searchParams.searchTerm}%` } },
                { email: { [Op.like]: `%${searchParams.searchTerm}%` } },
                { profession: { [Op.like]: `%${searchParams.searchTerm}%` } }
            ];
            
            if (orConditions.length > 0) {
                whereClause[Op.and] = [
                    { [Op.or]: orConditions },
                    { [Op.or]: searchConditions }
                ];
            } else {
                whereClause[Op.or] = searchConditions;
            }
        } else if (orConditions.length > 0) {
            whereClause[Op.or] = orConditions;
        }

        // Fetch matching students
        const students = await Student.findAll({
            where: whereClause,
            attributes: [
                "StudentId", "salutation", "student_name", "email", "mobile", "university",
                "batch_no", "courseTitle", "package", "profession", "company", "designation",
                "experience", "employment", "skill", "lookingForJob", "isISTQBCertified", 
                "knowMe", "remark", "due", "isEnrolled", "photo", "certificate", "get_certificate", "passingYear", 
                "linkedin", "github", "isMobilePublic", "isEmailPublic", "isLinkedInPublic", 
                "isGithubPublic", "createdAt"
            ],
            include: [{
                model: Course,
                attributes: ["courseId", "course_title"],
                required: false
            }],
            order: [["get_certificate", "DESC"], ["createdAt", "DESC"]],
            limit: 100 // Limit AI search results
        });

        // If no exact matches found, return best matching profiles with fallback logic
        if (students.length === 0 && (searchParams.skills || searchParams.fallbackSkills)) {
            // Fetch all students for ranking with skill relevance
            const allStudents = await Student.findAll({
                attributes: [
                    "StudentId", "salutation", "student_name", "email", "mobile", "university",
                    "batch_no", "courseTitle", "package", "profession", "company", "designation",
                    "experience", "employment", "skill", "lookingForJob", "isISTQBCertified", 
                    "knowMe", "remark", "due", "isEnrolled", "photo", "certificate", "get_certificate", "passingYear", 
                    "linkedin", "github", "isMobilePublic", "isEmailPublic", "isLinkedInPublic", 
                    "isGithubPublic", "createdAt"
                ],
                include: [{
                    model: Course,
                    attributes: ["courseId", "course_title"],
                    required: false
                }],
                limit: 500 // Fetch more students for ranking
            });

            // Calculate scores for each student with skill relevance
            const scoredStudents = allStudents.map(student => {
                let score = 0;
                let skillRelevance = 0;
                const studentData = student.toJSON();

                // VERIFIED status - HIGHEST priority (+50 points)
                if (studentData.get_certificate === true || (studentData.certificate && studentData.certificate.trim() !== '')) {
                    score += 50;
                }

                // ISTQB certification - HIGH priority (+30 points)
                if (studentData.isISTQBCertified === 'Yes') {
                    score += 30;
                }

                // Skill relevance - check if student has requested or fallback skills
                if (studentData.skill && typeof studentData.skill === 'object' && studentData.skill.technical_skill) {
                    const studentSkills = Array.isArray(studentData.skill.technical_skill) 
                        ? studentData.skill.technical_skill 
                        : studentData.skill.technical_skill.split(',').map(s => s.trim());

                    const requestedSkills = searchParams.skills ? searchParams.skills.split(',').map(s => s.trim()) : [];
                    const fallbackSkills = searchParams.fallbackSkills ? searchParams.fallbackSkills.split(',').map(s => s.trim()) : [];

                    // Check for exact skill matches (higher weight)
                    requestedSkills.forEach(skill => {
                        if (studentSkills.some(s => s.toLowerCase().includes(skill.toLowerCase()))) {
                            skillRelevance += 10; // Exact match gets 10 points
                        }
                    });

                    // Check for fallback skill matches (lower weight)
                    fallbackSkills.forEach(skill => {
                        if (studentSkills.some(s => s.toLowerCase().includes(skill.toLowerCase()))) {
                            skillRelevance += 5; // Fallback match gets 5 points
                        }
                    });

                    score += skillRelevance;
                }

                // Number of technical skills - MEDIUM priority (+1 point per skill, max 20)
                if (studentData.skill && typeof studentData.skill === 'object' && studentData.skill.technical_skill) {
                    let skillCount = 0;
                    if (Array.isArray(studentData.skill.technical_skill)) {
                        skillCount = studentData.skill.technical_skill.length;
                    } else if (typeof studentData.skill.technical_skill === 'string') {
                        skillCount = studentData.skill.technical_skill.split(',').length;
                    }
                    score += Math.min(skillCount, 20); // Cap at 20 points
                }

                // Experience level - MEDIUM priority (+1 point per year, max 10)
                if (studentData.employment && typeof studentData.employment === 'object' && studentData.employment.totalExperience) {
                    const experience = parseFloat(studentData.employment.totalExperience) || 0;
                    score += Math.min(Math.floor(experience), 10); // Cap at 10 points
                }

                // Currently enrolled - LOW priority (+5 points)
                if (studentData.isEnrolled === true || studentData.isEnrolled === 1) {
                    score += 5;
                }

                return {
                    ...studentData,
                    qualityScore: score,
                    skillRelevance: skillRelevance
                };
            });

            // Sort by quality score (descending) and return top 20 best matches
            const bestMatchingStudents = scoredStudents
                .sort((a, b) => b.qualityScore - a.qualityScore)
                .slice(0, 20);

            return res.status(200).json({
                totalStudents: bestMatchingStudents.length,
                students: bestMatchingStudents,
                searchParams,
                originalQuery: query,
                isFallbackSearch: true,
                aiMessage: "Sorry, I didn't find exactly what you are looking for, but here are some best profile you might choose."
            });
        }

        return res.status(200).json({
            totalStudents: students.length,
            students,
            searchParams, // Return extracted parameters for debugging
            originalQuery: query,
            aiMessage: students.length > 0 ? "Here are the top results based on your query." : "No matching profiles found."
        });

    } catch (error) {
        console.error("Error in AI search:", error);
        return res.status(500).json({ 
            error: "AI search failed. Please try again or use manual filters.",
            details: error.message 
        });
    }
};

exports.deleteAttendance = async (req, res) => {
    try {
        const { studentId, index } = req.params;

        if (!studentId || index === undefined) {
            return res.status(400).json({ message: "Missing required fields: studentId, index." });
        }

        // ✅ Fetch Student Attendance Record
        const attendance = await Attendance.findOne({ where: { StudentId: studentId } });

        if (!attendance) {
            return res.status(404).json({ message: "Attendance record not found." });
        }

        // ✅ Parse Attendance List using helper function
        const attendanceList = parseAttendanceList(attendance.attendanceList);

        if (attendanceList.length === 0) {
            return res.status(400).json({ message: "Invalid attendance data format." });
        }

        // ✅ Validate Index
        const deleteIndex = parseInt(index);
        if (deleteIndex < 0 || deleteIndex >= attendanceList.length) {
            return res.status(400).json({ message: "Invalid attendance index." });
        }

        // ✅ Remove Attendance Entry at Index
        attendanceList.splice(deleteIndex, 1);

        // ✅ Update Attendance Record
        await attendance.update({
            attendanceList: JSON.stringify(attendanceList)
        });

        // ✅ Calculate Updated Stats using helper function
        const stats = calculateAttendancePercentage(attendanceList.length);

        return res.status(200).json({
            message: "Attendance deleted successfully!",
            ...stats
        });

    } catch (error) {
        console.error("Error deleting attendance:", error);
        return res.status(500).json({ message: "Internal Server Error." });
    }
};

// ✅ Send Contact Email to Student (from QA Talent page)
exports.sendContactEmail = async (req, res) => {
    try {
        const { studentId, subject, body } = req.body;

        if (!studentId || !subject || !body) {
            return res.status(400).json({ error: "Student ID, subject, and message body are required." });
        }

        // ✅ Fetch Student by ID
        const student = await Student.findOne({ where: { StudentId: studentId } });

        if (!student) {
            return res.status(404).json({ error: "Student not found." });
        }

        if (!student.email) {
            return res.status(400).json({ error: "Student does not have an email address." });
        }

        // ✅ Prepare Email Content
        const emailSubject = subject;
        const emailBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1e40af;">Message from Road to Career QA Talent Portal</h2>
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p style="white-space: pre-wrap; line-height: 1.6;">${body}</p>
                </div>
                <hr style="border: 1px solid #e2e8f0; margin: 20px 0;">
                <p style="color: #64748b; font-size: 0.9rem;">
                    This email was sent from the Road to Career QA Talent Discovery platform. 
                    A recruiter or HR professional is interested in connecting with you.
                </p>
                <p style="color: #64748b; font-size: 0.9rem;">
                    <strong>Student:</strong> ${student.student_name}<br>
                    <strong>Batch:</strong> ${student.batch_no || 'N/A'}
                </p>
            </div>
        `;

        // ✅ Send Email using existing emailHelper (with HTML content type)
        await sendEmail(student.email, emailSubject, emailBody, "text/html");

        return res.status(200).json({ 
            message: "Email sent successfully!",
            studentName: student.student_name
        });

    } catch (error) {
        console.error("Error sending contact email:", error);
        return res.status(500).json({ 
            error: error.message || "Failed to send email. Please try again." 
        });
    }
};
