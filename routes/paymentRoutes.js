const express = require("express");
const router = express.Router();
const {getPaymentHistory, addPayment, updatePayment, getPaymentsList, getStudentPayments, getUnpaidStudents, deletePaymentById} = require("../controllers/paymentController");
const { authenticateUser, requireAdmin } = require("../middlewares/authMiddleware");

router.post("/add", authenticateUser, requireAdmin, addPayment);
router.put("/update/:id", authenticateUser, requireAdmin, updatePayment);
router.get("/history/:studentId", authenticateUser, requireAdmin, getPaymentHistory); 
router.get("/paid", authenticateUser, requireAdmin, getPaymentsList);
router.get("/unpaid", authenticateUser, requireAdmin, getUnpaidStudents);
router.post("/details", authenticateUser, getStudentPayments);
router.delete("/delete/:id", authenticateUser, requireAdmin, deletePaymentById);

module.exports = router;
