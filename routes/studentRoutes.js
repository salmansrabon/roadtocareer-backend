const express = require("express");
const { studentSignup, getAllStudents, getStudentById, updateStudent, deleteStudentById  } = require("../controllers/studentController");

const router = express.Router();

// ✅ Student Signup Route
router.post("/signup", studentSignup);
router.get("/list", getAllStudents);
router.get("/:studentId", getStudentById);
router.put("/:studentId", updateStudent);
router.delete("/:studentId", deleteStudentById);

module.exports = router;