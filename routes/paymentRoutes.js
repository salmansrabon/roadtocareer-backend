const express = require("express");
const router = express.Router();
const {getPaymentHistory, addPayment, getPaymentsList} = require("../controllers/paymentController");

router.post("/add", addPayment); // ✅ Add Payment API
router.get("/history/:studentId", getPaymentHistory); // ✅ Get Payment History API
router.get("/", getPaymentsList);

module.exports = router;
