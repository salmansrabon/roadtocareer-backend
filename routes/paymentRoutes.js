const express = require("express");
const router = express.Router();
const {getPaymentHistory, addPayment, getPaymentsList} = require("../controllers/paymentController");
const { authenticateUser, requireAdmin } = require("../middlewares/authMiddleware");

router.post("/add", authenticateUser, requireAdmin, addPayment); // ✅ Add Payment API
router.get("/history/:studentId", authenticateUser, requireAdmin, getPaymentHistory); // ✅ Get Payment History API
router.get("/", authenticateUser, requireAdmin, getPaymentsList);

module.exports = router;
