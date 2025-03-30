const Payment = require("../models/Payment");
const Package = require("../models/Package");
const Student = require("../models/Student");
const Course = require("../models/Course");
const { Op } = require("sequelize");
const { sendEmail } = require("../utils/emailHelper");

exports.addPayment = async (req, res) => {
    try {
        const { courseId, packageId, studentId, studentName, installmentNumber, installmentAmount, paidAmount, month, remarks } = req.body;

        // 🔹 Get Course Fee
        const packageDetails = await Package.findOne({ where: { id: packageId } });

        if (!packageDetails) {
            return res.status(404).json({ success: false, message: "Package not found!" });
        }

        const courseFee = parseFloat(packageDetails.studentFee);

        // 🔹 Get Previous Payments for the Student
        const previousPayments = await Payment.findAll({ where: { studentId, packageId } });
         // 🔹 Get Student Details
         const student = await Student.findOne({ where: { StudentId: studentId } });

         if (!student) {
             return res.status(404).json({ success: false, message: "Student not found!" });
         }
 
        // 🔹 Calculate Remaining Balance
        const totalPaid = previousPayments.reduce((sum, payment) => sum + parseFloat(payment.paidAmount), 0) + parseFloat(paidAmount);
        const remainingBalance = courseFee - totalPaid;

        // 🔹 Create New Payment Record
        const newPayment = await Payment.create({
            courseId,
            packageId,
            studentId,
            studentName,
            installmentNumber,
            installmentAmount,
            paidAmount,
            remainingBalance: remainingBalance >= 0 ? remainingBalance : 0, // ✅ Ensure it never goes negative
            month,
            remarks
        });
        await student.update({ due: remainingBalance });
        res.status(201).json({ success: true, message: "Payment recorded successfully!", payment: newPayment });
        sendEmail(student.email, "Road to SDET Payment Confirmation", `Dear ${student.student_name},\n\nYour payment of ${paidAmount} Tk has been received successfully for the month of ${month}.\n\nThank you for your payment.\n\nRegards,\nRoad to SDET Team`);

    } catch (error) {
        console.error("Error adding payment:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

exports.getPaymentHistory = async (req, res) => {
    try {
        const { studentId } = req.params;

        // 🔹 Fetch Student details first
        const student = await Student.findOne({
            where: { StudentId: studentId }
        });

        if (!student) {
            return res.status(404).json({ success: false, message: "Student not found!" });
        }

        const { student_name, CourseId: courseId, package: packageName } = student; // ✅ Correctly accessing CourseId

        if (!courseId) {
            return res.status(404).json({ success: false, message: "Course ID is missing for this student!" });
        }

        // 🔹 Fetch Package details
        const packageDetails = await Package.findOne({
            where: { courseId, packageName }
        });

        if (!packageDetails) {
            return res.status(404).json({ success: false, message: "Package details not found!" });
        }

        const { id: packageId, studentFee } = packageDetails;
        const courseFee = parseFloat(studentFee); // ✅ Ensures the courseFee is properly formatted

        // 🔹 Fetch Payment records for the student
        const payments = await Payment.findAll({
            where: { studentId },
            order: [["installmentNumber", "ASC"]]
        });

        // 🔹 Calculate Total Paid Amount
        const totalPaid = payments.reduce((sum, payment) => sum + parseFloat(payment.paidAmount), 0);

        // 🔹 Calculate Remaining Balance
        const remainingBalance = courseFee - totalPaid;

        res.status(200).json({
            success: true,
            studentId,
            student_name,
            courseId,
            packageId,
            courseFee,
            totalPaid,
            remainingBalance, // ✅ Added Remaining Balance
            payments: payments.length ? payments : [] // ✅ Ensures empty array instead of null
        });

    } catch (error) {
        console.error("Error fetching payment history:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};



/**
 * ✅ Get Payment List API
 * @route GET /api/payments
 */
exports.getPaymentsList = async (req, res) => {
    try {
        const { studentId, courseId, month, page = 1, limit = 10 } = req.query;

        const pageNumber = parseInt(page) || 1;
        const limitNumber = parseInt(limit) || 10;
        const offset = (pageNumber - 1) * limitNumber;

        let whereClause = {};
        if (studentId) whereClause.studentId = studentId;
        if (courseId) whereClause.courseId = courseId;
        if (month) whereClause.month = { [Op.like]: `%${month}%` };

        // ✅ Count total matching payments (unaffected by pagination)
        const totalPayments = await Payment.count({ where: whereClause });

        // ✅ Calculate total paid amount from all matching payments
        const allMatchingPayments = await Payment.findAll({
            where: whereClause,
            attributes: ["paidAmount"]
        });

        const totalPaidAmount = allMatchingPayments.reduce((sum, payment) => sum + parseFloat(payment.paidAmount || 0), 0);

        // ✅ Fetch paginated payments
        const payments = await Payment.findAll({
            where: whereClause,
            attributes: [
                "id",
                "courseId",
                "studentId",
                "studentName",
                "installmentNumber",
                "installmentAmount",
                "paidAmount",
                "remainingBalance",
                "month",
                "paymentDateTime",
                "createdAt",
            ],
            order: [["paymentDateTime", "DESC"]],
            offset,
            limit: limitNumber,
        });

        return res.status(200).json({ 
            totalPayments,
            totalPages: Math.ceil(totalPayments / limitNumber),
            currentPage: pageNumber,
            totalPaidAmount,
            payments
        });

    } catch (error) {
        console.error("Error fetching payment list:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};


exports.getStudentPayments = async (req, res) => {
    try {
        const { username } = req.body; // ✅ Get studentId from request payload

        if (!username) {
            return res.status(400).json({ success: false, message: "Student ID (username) is required." });
        }

        // ✅ Fetch Payments for the Given Student
        const payments = await Payment.findAll({
            where: { studentId: username },
            order: [["installmentNumber", "ASC"]],
            attributes: ["installmentNumber", "installmentAmount", "paidAmount", "remainingBalance", "month", "paymentDateTime"],
        });

        if (!payments || payments.length === 0) {
            return res.status(404).json({ success: false, message: "No payments found for this student." });
        }

        // ✅ Calculate Total Paid & Remaining Balance
        const totalPaid = payments.reduce((sum, payment) => sum + parseFloat(payment.paidAmount), 0);
        const remainingBalance = payments[payments.length - 1].remainingBalance;

        res.status(200).json({
            success: true,
            studentId: username,
            studentName: payments[0].studentName, // ✅ Get Name from first entry
            totalPaid: totalPaid.toFixed(2),
            remainingBalance: remainingBalance,
            installments: payments,
        });
    } catch (error) {
        console.error("Error fetching student payments:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

exports.getUnpaidStudents = async (req, res) => {
    try {
        const { courseId, month, batch_no, limit = 10, offset = 0 } = req.query;

        // ✅ Build Where Clause for Filtering
        let whereClause = {};
        if (courseId) whereClause.CourseId = courseId;
        if (batch_no) whereClause.batch_no = batch_no; // ✅ Filter by batch_no

        // ✅ Fetch All Students for the Given Course & Batch
        const allStudents = await Student.findAll({
            where: whereClause,
            attributes: ["StudentId", "student_name", "CourseId", "batch_no", "courseTitle", "mobile", "email"],
            include: [
                {
                    model: Course,
                    attributes: ["course_title", "batch_no"],
                }
            ]
        });

        // ✅ Extract Student IDs
        const studentIds = allStudents.map(student => student.StudentId);
        if (studentIds.length === 0) {
            return res.status(404).json({ success: false, message: "No students found for the given filters." });
        }

        // ✅ Fetch Paid Students (Only if Month is Provided)
        let paidStudentsQuery = { studentId: studentIds };
        if (month) paidStudentsQuery.month = month; // ✅ Filter by Month if provided

        const paidStudents = await Payment.findAll({
            where: paidStudentsQuery,
            attributes: ["studentId"],
            group: ["studentId"], // ✅ Ensure unique students
        });

        // ✅ Convert Paid Student IDs to a Set
        const paidStudentIds = new Set(paidStudents.map(p => p.studentId));

        // ✅ Filter Unpaid Students
        const unpaidStudents = allStudents
            .filter(student => !paidStudentIds.has(student.StudentId))
            .map(student => ({
                studentId: student.StudentId,
                student_name: student.student_name,
                courseId: student.CourseId,
                courseTitle: student.courseTitle,
                batch_no: student.batch_no,
                mobile: student.mobile,
                email: student.email,
            }));

        // ✅ Pagination Metadata
        const totalUnpaid = unpaidStudents.length;
        const totalPages = Math.ceil(totalUnpaid / limit);

        res.status(200).json({
            success: true,
            totalUnpaid,
            totalPages,
            limit: parseInt(limit),
            offset: parseInt(offset),
            unpaidStudents: unpaidStudents.slice(offset, offset + parseInt(limit)), // ✅ Paginate results
        });

    } catch (error) {
        console.error("❌ Error fetching unpaid students:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.deletePaymentById = async (req, res) => {
    const { id } = req.params;

    try {
        const payment = await Payment.findByPk(id);

        if (!payment) {
            return res.status(404).json({ message: "Payment not found" });
        }

        await payment.destroy();

        return res.status(200).json({ message: "Payment deleted successfully" });
    } catch (error) {
        console.error("❌ Error deleting payment:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};











