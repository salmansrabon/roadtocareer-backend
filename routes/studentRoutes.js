const express = require("express");
const { studentSignup } = require("../controllers/studentController");

const router = express.Router();

// ✅ Student Signup Route
router.post("/signup", studentSignup);

module.exports = router;