const Payment = require("../models/Payment");
const Package = require("../models/Package");
const Student = require("../models/Student");
const Course = require("../models/Course");
const { Op, Sequelize } = require("sequelize");
const { sendEmail } = require("../utils/emailHelper");
Payment.belongsTo(Student, { foreignKey: "studentId", targetKey: "StudentId" });

exports.addPayment = async (req, res) => {
    try {
        const {
            courseId,
            packageId,
            studentId,
            studentName,
            installmentNumber,
            installmentAmount,
            paidAmount,
            dueAdjustmentType,
            dueAdjustmentAmount,
            month,
            remarks
        } = req.body;

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

        // 🔹 Calculate Total Paid + Adjustments
        const totalPaid = previousPayments.reduce((sum, payment) => sum + parseFloat(payment.paidAmount || 0), 0) + parseFloat(paidAmount || 0);
        const previousAdjustment = previousPayments.reduce((sum, payment) => sum + parseFloat(payment.dueAdjustmentAmount || 0), 0);
        const totalAdjustment = previousAdjustment + parseFloat(dueAdjustmentAmount || 0);

        // 🔹 Final Remaining Balance
        const remainingBalance = courseFee - totalPaid - totalAdjustment;

        // 🔹 Create New Payment Record
        const newPayment = await Payment.create({
            courseId,
            packageId,
            studentId,
            studentName,
            installmentNumber,
            installmentAmount,
            paidAmount,
            dueAdjustmentType,
            dueAdjustmentAmount,
            remainingBalance: remainingBalance >= 0 ? remainingBalance : 0,
            month,
            remarks
        });

        // 🔹 Update Student's Due
        await student.update({ due: remainingBalance >= 0 ? remainingBalance : 0 });

        // 🔹 Send Email Notification
        sendEmail(
            student.email,
            "Road to SDET Payment Confirmation",
            `Dear ${student.student_name},\n\nYour payment of ${paidAmount} Tk has been received successfully for the month of ${month}.\n\nThank you for your payment.\n\nRegards,\nRoad to SDET Team`
        );

        return res.status(201).json({
            success: true,
            message: "Payment recorded successfully!",
            payment: newPayment
        });

    } catch (error) {
        console.error("Error adding payment:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
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

        const { student_name, CourseId: courseId, package: packageName } = student;

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

        // 🔹 Calculate total dueAdjustmentAmount
        const totalDueAdjustment = payments.reduce((sum, payment) => sum + parseFloat(payment.dueAdjustmentAmount || 0), 0);

        // 🔹 Calculate Remaining Balance
        const remainingBalance = courseFee - totalPaid - totalDueAdjustment;

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
        const { studentId, name, courseId, month, dueAdjustmentType, page = 1, limit = 10 } = req.query;

        const pageNumber = parseInt(page) || 1;
        const limitNumber = parseInt(limit) || 10;
        const offset = (pageNumber - 1) * limitNumber;

        let whereClause = {};
        if (studentId) whereClause.studentId = studentId;
        if (name) whereClause.studentName = { [Op.like]: `%${name}%` };
        if (courseId) whereClause.courseId = courseId;
        if (month) whereClause.month = { [Op.like]: `%${month}%` };
        if (dueAdjustmentType) whereClause.dueAdjustmentType = dueAdjustmentType;

        const totalPayments = await Payment.count({ where: whereClause });

        const allMatchingPayments = await Payment.findAll({
            where: whereClause,
            attributes: ["paidAmount"]
        });

        const totalPaidAmount = allMatchingPayments.reduce((sum, payment) => sum + parseFloat(payment.paidAmount || 0), 0);

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
                "dueAdjustmentType",
                "dueAdjustmentAmount",
                "remainingBalance",
                "month",
                "paymentDateTime",
                "createdAt",
            ],
            include: [
                {
                    model: Student,
                    attributes: ["email"],
                }
            ],
            order: [["paymentDateTime", "DESC"]],
            offset,
            limit: limitNumber,
        });

        // Optional: Flatten the email into each payment object
        const responsePayments = payments.map(payment => {
            const plain = payment.toJSON();
            const email = plain.Student?.email || null;
            delete plain.Student; // ❌ Remove nested Student object
            return {
                ...plain,
                email // ✅ Add email at root level
            };
        });

        return res.status(200).json({
            totalPayments,
            totalPages: Math.ceil(totalPayments / limitNumber),
            currentPage: pageNumber,
            totalPaidAmount,
            payments: responsePayments
        });

    } catch (error) {
        console.error("Error fetching payment list:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};



exports.getStudentPayments = async (req, res) => {
    try {
        const { username } = req.body; //Get studentId from request payload

        if (!username) {
            return res.status(400).json({ success: false, message: "Student ID (username) is required." });
        }

        // Fetch Payments for the Given Student
        const payments = await Payment.findAll({
            where: { studentId: username },
            order: [["installmentNumber", "ASC"]],
            attributes: ["installmentNumber", "installmentAmount", "paidAmount", "dueAdjustmentType", "dueAdjustmentAmount", "remainingBalance", "month", "paymentDateTime"],
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
            studentName: payments[0].studentName,
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

        // 🔍 Base filter for enrolled students
        let studentFilter = {
            isEnrolled: true,
        };
        if (courseId) studentFilter.CourseId = courseId;
        if (batch_no) studentFilter.batch_no = batch_no;

        // 🔍 Build dynamic where clause for payment match
        let paymentWhere = {};
        if (courseId) paymentWhere.courseId = courseId;
        if (month) paymentWhere.month = month;

        // 🔍 Find all studentIds who HAVE paid (to exclude them)
        const paidStudentRows = await Payment.findAll({
            attributes: ['studentId'],
            where: paymentWhere,
            raw: true,
        });
        const paidStudentIds = paidStudentRows.map(row => row.studentId);

        // 🔍 Final unpaid students list
        const unpaidStudents = await Student.findAll({
            where: {
                ...studentFilter,
                StudentId: {
                    [Op.notIn]: paidStudentIds
                }
            },
            attributes: ["StudentId", "student_name", "CourseId", "batch_no", "courseTitle", "mobile", "email", "remark"],
            include: [
                {
                    model: Course,
                    attributes: ["course_title", "batch_no"],
                }
            ],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        // 🔢 Get total count
        const totalUnpaid = await Student.count({
            where: {
                ...studentFilter,
                StudentId: {
                    [Op.notIn]: paidStudentIds
                }
            }
        });

        const totalPages = Math.ceil(totalUnpaid / limit);

        return res.status(200).json({
            success: true,
            totalUnpaid,
            totalPages,
            limit: parseInt(limit),
            offset: parseInt(offset),
            unpaidStudents,
        });

    } catch (error) {
        console.error("❌ Error fetching unpaid students:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
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











