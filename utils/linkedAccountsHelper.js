const { Op, fn, col, where } = require("sequelize");
const User = require("../models/User");
const Student = require("../models/Student");

// Registering for a second course creates a new User/Student pair that shares the
// student's email (see studentController.studentSignup). Those accounts are
// "linked" for account switching. Nothing enforces email casing/whitespace at
// signup, so every comparison goes through this normalizer.
const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

/**
 * Other active student accounts registered with the same email as `username`.
 *
 * The email is always read from the caller's `users` row — never taken from a
 * request body or token — so a caller can only ever see accounts tied to their
 * own email. Admin/teacher callers get [] (they are never linked), and
 * disabled / not-yet-approved accounts (isValid = 0) are left out.
 *
 * @param {string} username - the caller's users.username (= students.StudentId)
 * @returns {Promise<Array<{username: string, courseTitle: string, batch_no: *, courseId: string}>>}
 */
async function getLinkedStudentAccounts(username) {
  if (!username) return [];

  const caller = await User.findOne({
    where: { username },
    attributes: ["username", "email", "role"],
  });
  if (!caller || caller.role !== "student") return [];

  const email = normalizeEmail(caller.email);
  if (!email) return [];

  const siblings = await User.findAll({
    where: {
      [Op.and]: [
        where(fn("LOWER", fn("TRIM", col("email"))), email),
        { role: "student", isValid: 1, username: { [Op.ne]: caller.username } },
      ],
    },
    attributes: ["username"],
  });
  if (siblings.length === 0) return [];

  const students = await Student.findAll({
    where: { StudentId: siblings.map((s) => s.username) },
    attributes: ["StudentId", "courseTitle", "batch_no", "CourseId"],
    order: [["createdAt", "ASC"]],
  });

  return students.map((s) => ({
    username: s.StudentId,
    courseTitle: s.courseTitle,
    batch_no: s.batch_no,
    courseId: s.CourseId,
  }));
}

module.exports = { normalizeEmail, getLinkedStudentAccounts };
