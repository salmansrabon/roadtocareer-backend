const express = require("express");
const router = express.Router();
const {getPaymentHistory, addPayment, getPaymentsList, getStudentPayments} = require("../controllers/paymentController");
const { authenticateUser, requireAdmin } = require("../middlewares/authMiddleware");

router.post("/add", authenticateUser, requireAdmin, addPayment);
router.get("/history/:studentId", authenticateUser, requireAdmin, getPaymentHistory); 
router.get("/", authenticateUser, requireAdmin, getPaymentsList);
router.post("/details", authenticateUser, getStudentPayments);

module.exports = router;
