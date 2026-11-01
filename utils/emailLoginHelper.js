const bcrypt = require("bcryptjs");
const { Op, fn, col, where } = require("sequelize");
const User = require("../models/User");
const Student = require("../models/Student");
const { normalizeEmail } = require("./linkedAccountsHelper");

// StudentIds never contain "@" (0 of the local users do), so "@" means email.
const looksLikeEmail = (identifier) => typeof identifier === "string" && identifier.includes("@");

// Newest enrollment first. Ties (the March 2025 import created several rows within
// minutes of each other) fall back to the higher students.id; an account with no
// students row has enrolledAt = null and sorts last.
const enrolledMs = (account) => (account.enrolledAt ? new Date(account.enrolledAt).getTime() : 0);
const sortByLatestEnrolled = (accounts) =>
  [...accounts].sort(
    (a, b) => enrolledMs(b) - enrolledMs(a) || (b.studentRowId || 0) - (a.studentRowId || 0)
  );

/**
 * Every student account (any isValid) registered with `email`.
 *
 * @param {string} email - raw user input; normalized here
 * @returns {Promise<Array<{user: object, enrolledAt: (Date|null), studentRowId: number}>>}
 */
async function findStudentAccountsByEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return [];

  const users = await User.findAll({
    where: {
      [Op.and]: [where(fn("LOWER", fn("TRIM", col("email"))), normalized), { role: "student" }],
    },
  });
  if (users.length === 0) return [];

  const students = await Student.findAll({
    where: { StudentId: users.map((u) => u.username) },
    attributes: ["id", "StudentId", "createdAt"],
  });

  return users.map((user) => {
    const rows = students
      .filter((s) => s.StudentId === user.username)
      .map((s) => ({ user, enrolledAt: s.createdAt, studentRowId: s.id }));
    return sortByLatestEnrolled(rows)[0] || { user, enrolledAt: null, studentRowId: 0 };
  });
}

/**
 * Every admin/teacher account (any isValid) registered with `email`. Staff have no
 * students row, so enrolledAt is null.
 */
async function findStaffAccountsByEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return [];

  const users = await User.findAll({
    where: {
      [Op.and]: [
        where(fn("LOWER", fn("TRIM", col("email"))), normalized),
        { role: { [Op.in]: ["admin", "teacher"] } },
      ],
    },
  });
  return users.map((user) => ({ user, enrolledAt: null, studentRowId: 0 }));
}

const isStaff = (account) => account.user.role === "admin" || account.user.role === "teacher";
const adminFirst = (a, b) =>
  (a.user.role === "admin" ? 0 : 1) - (b.user.role === "admin" ? 0 : 1) || (a.user.id || 0) - (b.user.id || 0);

/**
 * Decide an email login from the accounts that share the email.
 *
 * Order of checks:
 *  1. Staff (admin/teacher): only that account's OWN password opens it. Staff are
 *     not linked to other accounts, so a student password on a shared email can
 *     never open staff. If one password matches staff and a student, staff wins.
 *  2. Students: the password may match ANY active student account; the session then
 *     opens on the most recently enrolled active student account. That grants
 *     nothing /auth/switch-account does not already allow.
 *  3. A password that matches only an inactive account is "disabled".
 *
 * An inactive account can never be the result: "active" is exactly isValid === 1
 * (fail closed), so 0, null or any other value is inactive.
 *
 * @returns {Promise<{status: "ok", user: object} | {status: "disabled"} | {status: "invalid"}>}
 */
async function decideEmailLogin(accounts, password, compare = bcrypt.compare) {
  if (typeof password !== "string" || password === "") return { status: "invalid" };

  const isActive = (account) => Number(account.user.isValid) === 1;

  for (const account of accounts.filter((a) => isStaff(a) && isActive(a)).sort(adminFirst)) {
    if (await compare(password, account.user.password)) return { status: "ok", user: account.user };
  }

  const activeStudents = accounts.filter((a) => !isStaff(a) && isActive(a));
  for (const account of activeStudents) {
    if (await compare(password, account.user.password)) {
      return { status: "ok", user: sortByLatestEnrolled(activeStudents)[0].user };
    }
  }

  for (const account of accounts.filter((a) => !isActive(a))) {
    if (await compare(password, account.user.password)) return { status: "disabled" };
  }
  return { status: "invalid" };
}

async function resolveEmailLogin(identifier, password, { compare } = {}) {
  const [staff, students] = await Promise.all([
    findStaffAccountsByEmail(identifier),
    findStudentAccountsByEmail(identifier),
  ]);
  return decideEmailLogin([...staff, ...students], password, compare);
}

module.exports = {
  looksLikeEmail,
  sortByLatestEnrolled,
  findStudentAccountsByEmail,
  findStaffAccountsByEmail,
  decideEmailLogin,
  resolveEmailLogin,
};
