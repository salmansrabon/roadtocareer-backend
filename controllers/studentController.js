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
const { grantDriveAccess } = require("../utils/googleDriveHelper");
const AssignmentAnswer = require("../models/AssignmentAnswer");
const { formatDate } = require("../utils/formatDate");
const {
  parseAttendanceList,
  calculateAttendancePercentage,
} = require("../utils/attendanceHelper");


// ✅ Function to Generate Unique Student ID
const generateStudentId = async (student_name) => {
  if (!student_name || student_name.length < 2) {
    student_name = "XX"; // Fallback if the name is too short
  }

  // Extract initials from the student's name
  const nameParts = student_name.split(" ").filter((part) => part.length > 0);
  let initials = nameParts.map((part) => part[0].toUpperCase()).join("");

  // If initials exceed 4 letters, limit them to the first 4 characters
  initials = initials.substring(0, 4);

  let newId;
  let isUnique = false;

  while (!isUnique) {
    const randomNum = Math.floor(10000 + Math.random() * 90000); // Generate a 5-digit random number
    newId = `${initials}${randomNum}`; // Example: "FH42564"

    const existingStudent = await Student.findOne({
      where: { StudentId: newId },
    });
    if (!existingStudent) isUnique = true;
  }
  return newId;
};

// ✅ Function to Generate Secure Random Password
const generatePassword = () => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
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
      google_access_id,
    } = req.body;

    // ✅ Check for required fields
    if (
      !student_name ||
      !email ||
      !mobile ||
      !university ||
      !courseId ||
      !package_name
    ) {
      return res
        .status(400)
        .json({
          message:
            "Student name, email, mobile, university, courseId, and package_name are required.",
        });
    }

    // ✅ Check if Student Already Exists in this Course
    const existingStudent = await Student.findOne({
      where: { email, CourseId: courseId },
    });

    if (existingStudent) {
      return res
        .status(409)
        .json({ message: "Student already registered in this course!" });
    }

    // ✅ Check if Course Exists
    const course = await Course.findOne({ where: { courseId } });
    if (!course) {
      return res
        .status(400)
        .json({ message: "Invalid CourseId. Course does not exist." });
    }

    // ✅ Check if Package Exists for this Course
    const packageData = await Package.findOne({
      where: { packageName: package_name, courseId },
    });
    if (!packageData) {
      return res
        .status(400)
        .json({
          message: "Invalid package. Package does not exist for this course.",
        });
    }

    // ✅ Generate Unique Student ID
    const studentId = await generateStudentId(student_name);

    // ✅ Prepare employment data if company/designation/experience provided
    let employmentData = null;
    if (company || designation || experience) {
      employmentData = {
        totalExperience: experience || "",
        company: [
          {
            companyName: company || "",
            designation: designation || "",
            employmentDuration: "", // Empty during signup
            experience: experience || "",
          },
        ],
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
      isEnrolled: false, // Always FALSE initially
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
      return res
        .status(500)
        .json({ message: "Failed to create user. Please contact admin." });
    }

    function formatTime(time24) {
      const [hourStr, minute] = time24.split(":");
      let hours = parseInt(hourStr, 10);
      const period = hours >= 12 ? "PM" : "AM";
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
                Orientation Date: ${formatDate(
                  course.orientation_date
                )} at 8:30PM
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
                            <p>Greetings from <strong>Road to SDET</strong>! Hope you’re doing well. We’re excited to let you know that <strong>batch ${
                              course.batch_no
                            }</strong> is starting soon.</p>
                            
                            <h3 style="color: #2d7cff;">Class Schedule and Related Information:</h3>
                            <ul>
                                <li><strong>Orientation date &amp; time:</strong> ${formatDate(
                                  course.orientation_date
                                )} from ${formatTime(course.class_time)}</li>
                                <li><strong>Class start date:</strong> ${formatDate(
                                  course.class_start_date
                                )} from ${formatTime(course.class_time)}</li>
                            </ul>
                            <h4>Class schedule:</h4>
                            <ul>
                                <li><strong>Day:</strong> ${formattedClassDays}</li>
                                <li><strong>Time:</strong> ${formatTime(
                                  course.class_time
                                )}</li>
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
                                <li><strong>Payment Deadline:</strong> ${formatDate(
                                  course.orientation_date
                                )} at 11:59 PM</li>
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

      await sendEmail(
        email,
        `Road to SDET- Batch ${course.batch_no} Welcome to our Course!`,
        studentEmailBody
      );
      // Check if course title contains "Full Stack SQA" (case-insensitive, flexible with hyphens/spacing)
      const courseTitle = course.course_title
        .toLowerCase()
        .replace(/[-\s]+/g, " ");
      if (courseTitle.includes("full stack sqa")) {
        await sendEmail(
          email,
          `Road to SDET- Batch ${course.batch_no} Course payment procedure and class schedule`,
          paymentEmailBody,
          "text/html"
        );
      }
    } catch (emailError) {
      console.error("❌ Error sending email to student:", emailError);
      return res
        .status(500)
        .json({
          message:
            "Student registered but email sending failed. Please contact admin.",
        });
    }

    // ✅ Fetch Admin Users and Send Notification Email
    try {
      const adminUsers = await User.findAll({ where: { role: "admin" } });

      if (adminUsers.length > 0) {
        const adminEmails = adminUsers.map((admin) => admin.email);

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

        await sendEmail(
          adminEmails.join(","),
          "New Student Enrollment",
          adminEmailBody
        );
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
      studentDetails: newStudent,
    });
  } catch (error) {
    console.error("Error in student signup:", error);

    // ✅ Proper Error Handling
    const errorMessage =
      error.response?.data?.message ||
      "An unexpected error occurred. Please contact admin.";
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
      limit = 10,
    } = req.query;

    const pageNumber = parseInt(page) || 1;
    const limitNumber = parseInt(limit) || 10;
    const offset = (pageNumber - 1) * limitNumber;

    let whereClause = {};

    if (courseId) whereClause.CourseId = courseId;
    if (batch_no) whereClause.batch_no = batch_no;
    if (studentId) whereClause.StudentId = { [Op.like]: `%${studentId}%` };
    if (salutation) whereClause.salutation = { [Op.like]: `%${salutation}%` };
    if (student_name)
      whereClause.student_name = { [Op.like]: `%${student_name}%` };
    if (email) whereClause.email = { [Op.like]: `%${email}%` };
    if (mobile) whereClause.mobile = { [Op.like]: `%${mobile}%` };
    if (university) whereClause.university = { [Op.like]: `%${university}%` };
    if (profession) whereClause.profession = { [Op.like]: `%${profession}%` };
    if (company) whereClause.company = { [Op.like]: `%${company}%` };
    if (remark) whereClause.remark = { [Op.like]: `%${remark}%` };
    if (isEnrolled !== undefined && isEnrolled !== "")
      whereClause.isEnrolled = parseInt(isEnrolled);

    // ✅ Build include clause for isValid filter
    const includeClause = [
      {
        model: Course,
        attributes: ["courseId", "course_title"],
      },
      {
        model: User,
        attributes: ["isValid"],
        required: isValid !== undefined && isValid !== "",
        where:
          isValid !== undefined && isValid !== ""
            ? {
                isValid: parseInt(isValid),
              }
            : undefined,
      },
    ];

    // ✅ First get total count with same filters
    const totalStudents = await Student.count({
      where: whereClause,
      include: includeClause,
    });

    // ✅ Now fetch paginated data
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
        "employment",
        "skill",
        "lookingForJob",
        "isISTQBCertified",
        "knowMe",
        "remark",
        "due",
        "isEnrolled",
        "photo",
        "certificate",
        "get_certificate",
        "passingYear",
        "linkedin",
        "github",
        "isMobilePublic",
        "isEmailPublic",
        "isLinkedInPublic",
        "isGithubPublic",
        "createdAt",
      ],
      include: includeClause,
      order: [
        ["get_certificate", "DESC"],
        ["createdAt", "DESC"],
      ],
      offset,
      limit: limitNumber,
    });

    return res.status(200).json({
      totalStudents,
      totalPages: Math.ceil(totalStudents / limitNumber),
      currentPage: pageNumber,
      students,
    });
  } catch (error) {
    console.error("Error fetching students:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.getQaTalent = async (req, res) => {
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
      limit = 10,
    } = req.query;

    const pageNumber = parseInt(page) || 1;
    const limitNumber = parseInt(limit) || 10;
    const offset = (pageNumber - 1) * limitNumber;

    let whereClause = {};

    if (courseId) whereClause.CourseId = courseId;
    if (batch_no) whereClause.batch_no = batch_no;
    if (studentId) whereClause.StudentId = { [Op.like]: `%${studentId}%` };
    if (salutation) whereClause.salutation = { [Op.like]: `%${salutation}%` };
    if (student_name)
      whereClause.student_name = { [Op.like]: `%${student_name}%` };
    if (email) whereClause.email = { [Op.like]: `%${email}%` };
    if (mobile) whereClause.mobile = { [Op.like]: `%${mobile}%` };
    if (university) whereClause.university = { [Op.like]: `%${university}%` };
    if (profession) whereClause.profession = { [Op.like]: `%${profession}%` };
    if (company) whereClause.company = { [Op.like]: `%${company}%` };
    if (remark) whereClause.remark = { [Op.like]: `%${remark}%` };
    if (isEnrolled !== undefined && isEnrolled !== "")
      whereClause.isEnrolled = parseInt(isEnrolled);

    // ✅ Filter: Only show students with non-empty technical_skill array
    // Check if skill field is not null and technical_skill array is not empty
    whereClause[Op.and] = Sequelize.literal(
      "skill IS NOT NULL AND JSON_LENGTH(skill, '$.technical_skill') > 0"
    );

    // ✅ Build include clause for isValid filter
    const includeClause = [
      {
        model: Course,
        attributes: ["courseId", "course_title"],
      },
      {
        model: User,
        attributes: ["isValid"],
        required: isValid !== undefined && isValid !== "",
        where:
          isValid !== undefined && isValid !== ""
            ? {
                isValid: parseInt(isValid),
              }
            : undefined,
      },
    ];

    // ✅ First get total count with same filters
    const totalStudents = await Student.count({
      where: whereClause,
      include: includeClause,
    });

    // ✅ Now fetch paginated data
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
        "employment",
        "education",
        "skill",
        "projects",
        "lookingForJob",
        "isISTQBCertified",
        "istqb_certificate",
        "knowMe",
        "remark",
        "due",
        "isEnrolled",
        "photo",
        "certificate",
        "get_certificate",
        "passingYear",
        "linkedin",
        "github",
        "isMobilePublic",
        "isEmailPublic",
        "isLinkedInPublic",
        "isGithubPublic",
        "createdAt",
      ],
      include: includeClause,
      order: [
        ["get_certificate", "DESC"],
        ["createdAt", "DESC"],
      ],
      offset,
      limit: limitNumber,
    });

    return res.status(200).json({
      totalStudents,
      totalPages: Math.ceil(totalStudents / limitNumber),
      currentPage: pageNumber,
      students,
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
        "education",
        "skill",
        "projects",
        "lookingForJob",
        "isISTQBCertified",
        "istqb_certificate",
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
        "aboutMe",
        "createdAt",
        "get_certificate",
      ],
      include: [
        {
          model: Course,
          attributes: ["courseId", "course_title", "drive_folder_id"],
        },
        {
          model: User, // ✅ Join with users table
          attributes: ["isValid"],
          required: false, // LEFT JOIN (so that it doesn't fail if no user exists)
          on: {
            col1: Sequelize.where(
              Sequelize.col("User.username"),
              "=",
              Sequelize.col("Student.StudentId")
            ),
          },
        },
        {
          model: Package,
          attributes: [
            "courseId",
            "packageName",
            "studentFee",
            "jobholderFee",
            "installment",
          ],
          required: false, // LEFT JOIN to avoid errors
          on: {
            col1: Sequelize.where(
              Sequelize.col("Package.courseId"),
              "=",
              Sequelize.col("Student.CourseId")
            ),
            col2: Sequelize.where(
              Sequelize.col("Package.packageName"),
              "=",
              Sequelize.col("Student.package")
            ),
          },
        },
      ],
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
      courseFee, // ✅ Only return the correct fee dynamically
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
      previous_batch_no,
    } = req.body; // Extract fields from request body

    // ✅ Find Student by StudentId
    const student = await Student.findOne({ where: { StudentId: studentId } });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // ✅ Check if get_certificate changed from false to true
    const certificateJustEnabled = !student.get_certificate && (get_certificate === true || get_certificate === 1);
    
    // ✅ Check if get_certificate changed from true to false
    const certificateJustDisabled = student.get_certificate && (get_certificate === false || get_certificate === 0);

    // ✅ Find Corresponding User by username (mapped to StudentId)
    const user = await User.findOne({ where: { username: studentId } });

    // ✅ If certificate is being disabled, clear the certificate URL
    let finalCertificateUrl = certificate;
    if (certificateJustDisabled) {
      finalCertificateUrl = null;
      console.log("Certificate disabled, clearing certificate URL");
    }

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
      education: req.body.education,
      skill: req.body.skill,
      projects: req.body.projects,
      lookingForJob: req.body.lookingForJob,
      isISTQBCertified: req.body.isISTQBCertified,
      istqb_certificate: req.body.istqb_certificate,
      knowMe,
      remark,
      opinion,
      isEnrolled,
      certificate: finalCertificateUrl,
      photo: req.body.photo,
      linkedin: req.body.linkedin,
      github: req.body.github,
      isMobilePublic: req.body.isMobilePublic,
      isEmailPublic: req.body.isEmailPublic,
      isLinkedInPublic: req.body.isLinkedInPublic,
      isGithubPublic: req.body.isGithubPublic,
      aboutMe: req.body.aboutMe,
      get_certificate,
      previous_course_id,
      previous_batch_no,
    });

    // ✅ If email is updated, also update it in the User table
    if (email && user) {
      await user.update({ email });
    }

    // ✅ Send email notification when certificate is enabled
    if (certificateJustEnabled) {
      try {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const certificateEmailBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 20px; border-radius: 8px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h1 style="color: #1e40af; margin-bottom: 10px;">🎉 Congratulations ${student.student_name || student_name}!</h1>
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 8px; color: white;">
                <h2 style="margin: 0; font-size: 1.5rem;">Your Course Certificate is Ready!</h2>
              </div>
            </div>

            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="font-size: 1.1rem; color: #2d3748; margin-bottom: 15px;">
                We are delighted to inform you that you have successfully completed the course and your certificate is now available!
              </p>
              
              <div style="background: white; padding: 15px; border-left: 4px solid #28a745; margin: 15px 0;">
                <p style="margin: 0; color: #495057;">
                  <strong>How to access your certificate:</strong>
                </p>
                <ol style="margin: 10px 0 0 0; padding-left: 20px; color: #495057;">
                  <li>Login to your student portal at <a href="${frontendUrl}" style="color: #1e40af;">${frontendUrl}</a></li>
                  <li>Navigate to the <strong>"View Certificate"</strong> menu</li>
                  <li>Click on <strong>"View Certificate"</strong> button</li>
                  <li>Your certificate will be displayed and you can download it</li>
                </ol>
              </div>

              <div style="text-align: center; margin: 25px 0;">
                <a href="${frontendUrl}/certificate" 
                   style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 1.1rem;">
                  🎓 View My Certificate Now
                </a>
              </div>

              <div style="background: #e3f2fd; padding: 15px; border-radius: 6px; margin-top: 20px;">
                <p style="margin: 0; color: #1565c0; font-size: 0.95rem;">
                  <strong>💡 Tip:</strong> Download your certificate and add it to your LinkedIn profile and resume to showcase your achievement!
                </p>
              </div>
            </div>

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #e2e8f0;">
              <p style="color: #64748b; margin-bottom: 10px;">
                Congratulations on completing the course! We wish you all the best in your career journey.
              </p>
              <p style="color: #64748b; font-size: 0.9rem;">
                <strong>Best regards,</strong><br>
                Road to SDET Team<br>
                <a href="https://www.roadtocareer.net" style="color: #1e40af;">www.roadtocareer.net</a>
              </p>
            </div>
          </div>
        `;

        await sendEmail(
          student.email || email,
          "Your Course Certificate is Ready! - Road to SDET",
          certificateEmailBody,
          "text/html"
        );
        console.log("📧 Certificate ready notification email sent successfully to:", student.email || email);
      } catch (emailError) {
        console.error("❌ Error sending certificate notification email:", emailError);
        // Don't fail the update if email fails, just log the error
      }
    }

    return res.status(200).json({
      message: "Student details updated successfully",
      student,
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
      return res
        .status(400)
        .json({ message: "Missing required fields: studentId, date, time." });
    }

    // ✅ Fetch Student Details
    const student = await Student.findOne({ where: { StudentId: studentId } });

    if (!student) {
      return res.status(404).json({ message: "Student not found." });
    }

    // ✅ Fetch Course Details for Class Time Validation
    const course = await Course.findOne({
      where: { courseId: student.CourseId },
    });

    if (!course) {
      return res.status(404).json({ message: "Course not found." });
    }

    // ✅ Get student's timezone offset (in minutes) or default to Asia/Dhaka
    const studentTimezone = timezone || "Asia/Dhaka";

    // ✅ Parse submitted time in student's timezone and convert to UTC
    const submittedTimeLocal = moment.tz(
      `${date} ${time}`,
      "DD-MM-YYYY hh:mm:ss A",
      studentTimezone
    );
    const submittedTimeUTC = submittedTimeLocal.clone().utc();

    // ✅ Parse class time as Bangladesh time (Asia/Dhaka) and convert to UTC
    const classTimeLocal = moment.tz(
      `${date} ${course.class_time}`,
      "DD-MM-YYYY HH:mm:ss",
      "Asia/Dhaka"
    );
    const classTimeUTC = classTimeLocal.clone().utc();
    const maxAllowedTimeUTC = classTimeUTC.clone().add(2, "hours");

    // ✅ If submitted time is outside the valid window, reject the request
    if (
      submittedTimeUTC.isBefore(classTimeUTC) ||
      submittedTimeUTC.isAfter(maxAllowedTimeUTC)
    ) {
      return res.status(400).json({
        message:
          "Please give attendance during class time (within 2 hours of class start).",
        debug: {
          submittedTime: submittedTimeUTC.format(),
          classTime: classTimeUTC.format(),
          maxAllowedTime: maxAllowedTimeUTC.format(),
        },
      });
    }

    // ✅ Check if Attendance Exists for Student
    let attendance = await Attendance.findOne({
      where: { StudentId: studentId },
    });

    if (!attendance) {
      // ✅ Create Attendance Record if Not Exists
      attendance = await Attendance.create({
        courseId: student.CourseId,
        courseTitle: student.courseTitle,
        batch_no: student.batch_no,
        StudentId: student.StudentId,
        student_name: student.student_name,
        attendanceList: JSON.stringify([]), // Ensure it's initialized properly
      });
    }

    // ✅ Parse Existing Attendance List
    let updatedAttendanceList = attendance.attendanceList
      ? JSON.parse(attendance.attendanceList)
      : [];

    // ✅ Check if student already marked attendance within the valid window
    const lastAttendanceEntry =
      updatedAttendanceList.length > 0
        ? updatedAttendanceList[updatedAttendanceList.length - 1]
        : null;

    if (lastAttendanceEntry) {
      // Parse last attendance time (stored in student's local timezone)
      const lastAttendanceTime = moment.tz(
        lastAttendanceEntry.time,
        "DD-MM-YYYY hh:mm:ss A",
        lastAttendanceEntry.timezone || "Asia/Dhaka"
      );
      const lastAttendanceUTC = lastAttendanceTime.clone().utc();

      // ✅ If last attendance falls within class time window, reject new attendance
      if (
        lastAttendanceUTC.isSameOrAfter(classTimeUTC) &&
        lastAttendanceUTC.isSameOrBefore(maxAllowedTimeUTC)
      ) {
        return res
          .status(400)
          .json({
            message: "You have already given attendance for this session.",
          });
      }
    }

    // ✅ Append New Attendance Record with timezone info
    updatedAttendanceList.push({
      time: `${date} ${time}`,
      timezone: studentTimezone,
      utcTime: submittedTimeUTC.format("DD-MM-YYYY hh:mm:ss A"),
    });

    // ✅ Update Attendance Table
    await attendance.update({
      attendanceList: JSON.stringify(updatedAttendanceList), // Convert back to string if using LONGTEXT
    });

    // ✅ Calculate Attendance Percentage
    const totalClicks = updatedAttendanceList.length;
    const attendancePercentage = ((totalClicks / 30) * 100).toFixed(2);

    return res.status(200).json({
      message: "Attendance marked successfully!",
      attendancePercentage: `${attendancePercentage}%`,
      totalClicks,
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
    const attendance = await Attendance.findOne({
      where: { StudentId: studentId },
    });

    if (!attendance) {
      return res
        .status(404)
        .json({ message: "No attendance record found for this student." });
    }

    // ✅ Parse attendance list using helper function
    const parsedAttendanceList = parseAttendanceList(attendance.attendanceList);

    // ✅ Calculate attendance stats using helper function
    const { totalClicks, attendancePercentage } = calculateAttendancePercentage(
      parsedAttendanceList.length
    );

    return res.status(200).json({
      studentId: attendance.StudentId,
      studentName: attendance.student_name,
      courseId: attendance.courseId,
      courseTitle: attendance.courseTitle,
      batch_no: attendance.batch_no,
      attendanceList: attendance.attendanceList, // ✅ Keep raw string format in response
      totalClicks,
      attendancePercentage,
    });
  } catch (error) {
    console.error("❌ Error fetching attendance:", error);
    return res.status(500).json({ message: "Internal Server Error." });
  }
};

exports.getAllAttendance = async (req, res) => {
  try {
    const {
      courseId,
      batch_no,
      student_name,
      limit = 10,
      offset = 0,
    } = req.query;

    const whereCondition = {};
    if (courseId) whereCondition.courseId = courseId;
    if (batch_no) whereCondition.batch_no = batch_no;
    if (student_name)
      whereCondition.student_name = { [Op.like]: `%${student_name}%` };

    const totalRecords = await Attendance.count({ where: whereCondition });

    const attendanceRecords = await Attendance.findAll({
      where: whereCondition,
      attributes: [
        "courseId",
        "courseTitle",
        "batch_no",
        "StudentId",
        "student_name",
        "attendanceList",
      ],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    const formattedAttendanceRecords = attendanceRecords.map((record) => {
      // ✅ Parse attendance list using helper function
      const parsedAttendanceList = parseAttendanceList(record.attendanceList);

      // ✅ Calculate attendance stats using helper function
      const { totalClicks, attendancePercentage } =
        calculateAttendancePercentage(parsedAttendanceList.length);

      return {
        courseId: record.courseId,
        courseTitle: record.courseTitle,
        batch_no: record.batch_no,
        StudentId: record.StudentId,
        student_name: record.student_name,
        attendanceList: record.attendanceList, // ✅ Keep as string in response
        totalClicks,
        attendancePercentage,
      };
    });

    return res.status(200).json({
      success: true,
      totalRecords,
      totalPages: Math.ceil(totalRecords / limit),
      currentPage: Math.floor(offset / limit) + 1,
      attendanceRecords: formattedAttendanceRecords,
    });
  } catch (error) {
    console.error("❌ Error fetching attendance records:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
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
      return res
        .status(404)
        .json({ message: `No student found with ID: ${studentId}` });
    }
    const oldBatch = student.batch_no;
    const oldCourseId = student.CourseId;

    //Update student migration info
    await Student.update(
      {
        quiz_answer: null,
        remark: remark || `Migrated from batch ${oldBatch} to ${batch_no}`,
        CourseId, // Update courseId
        package, // Update package
        batch_no, // Update new batch
        previous_batch_no: oldBatch, // Save old batch to previous_batch_no
        previous_course_id: oldCourseId, // Save old course ID to previous_course_id
      },
      { where: { studentId } }
    );

    //Reset attendance
    await Attendance.update({ attendanceList: null }, { where: { studentId } });

    // Lookup the course's drive folder ID
    const course = await Course.findOne({ where: { courseId: CourseId } });
    if (!course || !course.drive_folder_id) {
      // Handle missing folder gracefully
      return res.status(200).json({
        message: `Attendance and quiz answer reset, but no Drive folder found for CourseId: ${CourseId}`,
        updatedCourse: CourseId,
        updatedBatch: batch_no,
      });
    }

    // Grant drive access to student
    const driveResult = await grantDriveAccess(
      course.drive_folder_id,
      student.email
    );
    console.log("Drive access result:", driveResult);

    if (!driveResult.success) {
      return res.status(200).json({
        message: `Migration done, but failed to grant Drive access: ${driveResult.error}`,
        updatedCourse: CourseId,
        updatedBatch: batch_no,
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
                ${remark ? `Remark: ${remark}` : ""}

                Your attendance records and quiz answers have been reset for the new batch. You now have access to the course materials through Google Drive.

                If you have any questions about this migration, please contact our support team.

                Best regards,
                Road to SDET Team
            `;

      await sendEmail(
        student.email,
        "Course Migration Notification - Road to SDET",
        migrationEmailBody
      );
      console.log(
        "📧 Migration notification email sent to student successfully."
      );
    } catch (emailError) {
      console.error(
        "❌ Error sending migration notification email:",
        emailError
      );
      // Don't fail the migration if email fails, just log the error
    }

    return res.status(200).json({
      message: `Attendance and quiz answer reset, Drive access granted for ${studentId}`,
      updatedCourse: CourseId,
      updatedBatch: batch_no,
      drivePermissionId: driveResult.permissionId,
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

exports.getCourseProgress = async (req, res) => {
  try {
    const { studentId } = req.params;

    // 1. Get all attendance records for the student
    const attendanceRecords = await Attendance.findAll({
      where: { StudentId: studentId },
    });

    // 2. Calculate total attendance count by parsing attendanceList arrays
    let attendanceCount = 0;
    attendanceRecords.forEach((record) => {
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
      where: { StudentId: studentId, Score: { [Op.ne]: null } },
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
      courseCompletionPercentage,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.deleteAttendance = async (req, res) => {
  try {
    const { studentId, index } = req.params;

    if (!studentId || index === undefined) {
      return res
        .status(400)
        .json({ message: "Missing required fields: studentId, index." });
    }

    // ✅ Fetch Student Attendance Record
    const attendance = await Attendance.findOne({
      where: { StudentId: studentId },
    });

    if (!attendance) {
      return res.status(404).json({ message: "Attendance record not found." });
    }

    // ✅ Parse Attendance List using helper function
    const attendanceList = parseAttendanceList(attendance.attendanceList);

    if (attendanceList.length === 0) {
      return res
        .status(400)
        .json({ message: "Invalid attendance data format." });
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
      attendanceList: JSON.stringify(attendanceList),
    });

    // ✅ Calculate Updated Stats using helper function
    const stats = calculateAttendancePercentage(attendanceList.length);

    return res.status(200).json({
      message: "Attendance deleted successfully!",
      ...stats,
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
      return res
        .status(400)
        .json({ error: "Student ID, subject, and message body are required." });
    }

    // ✅ Fetch Student by ID
    const student = await Student.findOne({ where: { StudentId: studentId } });

    if (!student) {
      return res.status(404).json({ error: "Student not found." });
    }

    if (!student.email) {
      return res
        .status(400)
        .json({ error: "Student does not have an email address." });
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
                    <strong>Batch:</strong> ${student.batch_no || "N/A"}
                </p>
            </div>
        `;

    // ✅ Send Email using existing emailHelper (with HTML content type)
    await sendEmail(student.email, emailSubject, emailBody, "text/html");

    return res.status(200).json({
      message: "Email sent successfully!",
      studentName: student.student_name,
    });
  } catch (error) {
    console.error("Error sending contact email:", error);
    return res.status(500).json({
      error: error.message || "Failed to send email. Please try again.",
    });
  }
};

// ✅ Save Auto-Generated Certificate PNG
exports.saveCertificate = async (req, res) => {
  console.log("🎓 ============ SAVE CERTIFICATE REQUEST ============");
  console.log("  - Student ID:", req.params.studentId);
  console.log("  - Request body keys:", Object.keys(req.body));
  
  try {
    const { studentId } = req.params;
    const { imageData } = req.body;

    if (!imageData) {
      console.error("❌ No image data provided in request");
      return res.status(400).json({ message: "Image data is required." });
    }

    console.log("  - Image data size:", imageData.length, "bytes");

    // ✅ Fetch Student
    const student = await Student.findOne({ where: { StudentId: studentId } });

    if (!student) {
      console.error("❌ Student not found:", studentId);
      return res.status(404).json({ message: "Student not found." });
    }

    console.log("  - Student found:", student.student_name);
    console.log("  - Existing certificate:", student.certificate || "None");

    // ✅ Don't overwrite manually uploaded certificates or existing auto-generated ones
    if (student.certificate && student.certificate.includes('/images/certificates/')) {
      console.log("⏭️ Auto-generated certificate already exists, skipping");
      return res.status(200).json({
        message: "Certificate already exists",
        certificateUrl: student.certificate
      });
    }

    const fs = require('fs');
    const path = require('path');

    // ✅ Remove base64 prefix
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, 'base64');
    console.log("  - Buffer size:", buffer.length, "bytes");

    // ✅ Create certificates directory in backend if it doesn't exist
    const certificatesDir = path.join(__dirname, '../images/certificates');
    console.log("  - Target directory:", certificatesDir);
    
    if (!fs.existsSync(certificatesDir)) {
      console.log("  - Directory doesn't exist, creating...");
      try {
        fs.mkdirSync(certificatesDir, { recursive: true });
        console.log("✅ Created certificates directory successfully");
      } catch (mkdirError) {
        console.error("❌ Failed to create directory:", mkdirError);
        throw new Error(`Failed to create directory: ${mkdirError.message}`);
      }
    } else {
      console.log("  - Directory exists");
    }

    // ✅ Generate filename: StudentName-StudentId.png
    const sanitizedName = student.student_name.replace(/[^a-zA-Z0-9]/g, '-');
    const filename = `${sanitizedName}-${studentId}.png`;
    const filepath = path.join(certificatesDir, filename);
    console.log("  - Target filename:", filename);
    console.log("  - Target filepath:", filepath);

    // ✅ Save file to backend
    try {
      fs.writeFileSync(filepath, buffer);
      console.log("✅ Certificate PNG saved successfully to filesystem");
      
      // Verify file exists
      if (fs.existsSync(filepath)) {
        const stats = fs.statSync(filepath);
        console.log("  - File size on disk:", stats.size, "bytes");
      } else {
        console.error("❌ File write reported success but file doesn't exist!");
      }
    } catch (writeError) {
      console.error("❌ Failed to write file:", writeError);
      throw new Error(`Failed to write file: ${writeError.message}`);
    }

    // ✅ Generate full URL path using BASE_URL from environment
    const baseUrl = process.env.BASE_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const certificateUrl = `${baseUrl}/api/images/certificates/${filename}`;
    console.log("  - Generated certificate URL:", certificateUrl);
    console.log("  - BASE_URL from env:", process.env.BASE_URL);

    // ✅ Update student record with full URL
    try {
      await student.update({ certificate: certificateUrl });
      console.log("✅ Certificate URL saved to database successfully");
      
      // Verify update
      const updatedStudent = await Student.findOne({ where: { StudentId: studentId } });
      console.log("  - Verified certificate in DB:", updatedStudent.certificate);
    } catch (dbError) {
      console.error("❌ Failed to update database:", dbError);
      throw new Error(`Failed to update database: ${dbError.message}`);
    }

    console.log("🎉 ============ CERTIFICATE SAVE COMPLETE ============");

    return res.status(200).json({
      message: "Certificate saved successfully!",
      certificateUrl,
      debug: {
        filename,
        filepath,
        baseUrl,
        fileSize: buffer.length
      }
    });
  } catch (error) {
    console.error("❌ ============ ERROR IN SAVE CERTIFICATE ============");
    console.error("  - Error name:", error.name);
    console.error("  - Error message:", error.message);
    console.error("  - Error stack:", error.stack);
    
    return res.status(500).json({ 
      message: "Failed to save certificate.",
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
