const Payment = require("../models/Payment");
const Package = require("../models/Package");
const Student = require("../models/Student");

exports.addPayment = async (req, res) => {
    try {
        const { courseId, packageId, studentId, studentName, installmentNumber, installmentAmount, paidAmount, month } = req.body;

        // 🔹 Get Course Fee
        const packageDetails = await Package.findOne({ where: { id: packageId } });

        if (!packageDetails) {
            return res.status(404).json({ success: false, message: "Package not found!" });
        }

        const courseFee = parseFloat(packageDetails.studentFee); // ✅ Assuming studentFee is applicable

        // 🔹 Get Previous Payments for the Student
        const previousPayments = await Payment.findAll({ where: { studentId, packageId } });

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
            month
        });

        res.status(201).json({ success: true, message: "Payment recorded successfully!", payment: newPayment });

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






