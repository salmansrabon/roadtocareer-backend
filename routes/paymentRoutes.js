const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");

router.post("/add", paymentController.addPayment); // ✅ Add Payment API
router.get("/history/:studentId", paymentController.getPaymentHistory); // ✅ Get Payment History API

module.exports = router;
