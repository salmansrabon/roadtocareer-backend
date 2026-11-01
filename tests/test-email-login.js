/**
 * Verification script for email login (emailLoginHelper + authController.login email branch).
 * Run with: node tests/test-email-login.js   (from backend/)
 *
 * READ-ONLY against whichever DB backend/.env points at (use local sdetdb):
 * it only SELECTs. Password checks use an injected `compare`, so no real password
 * is needed. It does not start the server, so no cron jobs, seeders or emails run.
 */
require("dotenv").config();
const assert = require("node:assert");
const { QueryTypes } = require("sequelize");
const sequelize = require("../config/db");
const {
    looksLikeEmail,
    sortByLatestEnrolled,
    findStudentAccountsByEmail,
    decideEmailLogin,
    resolveEmailLogin,
} = require("../utils/emailLoginHelper");
const { login, switchAccount } = require("../controllers/authController");
const { getLinkedStudentAccounts } = require("../utils/linkedAccountsHelper");

const mockRes = () => {
    const res = { statusCode: 200, body: null, cookies: [] };
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (payload) => { res.body = payload; return res; };
    res.cookie = (name, value, opts) => { res.cookies.push({ name, value, opts }); return res; };
    return res;
};

let passed = 0;
const check = (name, fn) => Promise.resolve(fn()).then(
    () => { passed++; console.log(`  ok  ${name}`); },
    (err) => { console.error(`  FAIL ${name}\n       ${err.message}`); process.exitCode = 1; }
);

const acct = (username, enrolledAt, studentRowId, isValid = 1, role = "student", id = 0) => ({
    user: { id, username, role, password: `hash-${username}`, isValid },
    enrolledAt: enrolledAt ? new Date(enrolledAt) : null,
    studentRowId,
});
const staffAcct = (username, role, isValid = 1, id = 0) => acct(username, null, 0, isValid, role, id);
// A fake bcrypt.compare that accepts exactly the listed usernames' hashes.
const acceptOnly = (...usernames) => async (_plain, hash) => usernames.some((u) => hash === `hash-${u}`);

(async () => {
    console.log(`DB: ${process.env.DB_HOST}/${process.env.DB_NAME}`);

    await check("looksLikeEmail: only strings containing @", () => {
        assert.strictEqual(looksLikeEmail("a@b.com"), true);
        assert.strictEqual(looksLikeEmail("SA98974"), false);
        assert.strictEqual(looksLikeEmail(undefined), false);
        assert.strictEqual(looksLikeEmail(42), false);
    });

    await check("sortByLatestEnrolled: newest first, ties by higher student row id, no-row last", () => {
        const input = [
            acct("old", "2025-03-27T05:53:26Z", 1),
            acct("none", null, 0),
            acct("tieLow", "2025-11-11T15:22:54Z", 5),
            acct("tieHigh", "2025-11-11T15:22:54Z", 9),
        ];
        const out = sortByLatestEnrolled(input).map((a) => a.user.username);
        assert.deepStrictEqual(out, ["tieHigh", "tieLow", "old", "none"]);
        assert.strictEqual(input[0].user.username, "old", "input must not be mutated");
    });

    await check("decideEmailLogin: the typed password of an OLDER account opens the NEWEST account", async () => {
        const accounts = [acct("older", "2025-03-27T00:00:00Z", 1), acct("newer", "2025-11-11T00:00:00Z", 2)];
        const r = await decideEmailLogin(accounts, "pw", acceptOnly("older"));
        assert.strictEqual(r.status, "ok");
        assert.strictEqual(r.user.username, "newer");
    });

    await check("decideEmailLogin: wrong password is invalid", async () => {
        const accounts = [acct("a", "2025-03-27T00:00:00Z", 1)];
        assert.deepStrictEqual(await decideEmailLogin(accounts, "pw", acceptOnly()), { status: "invalid" });
    });

    await check("decideEmailLogin: a disabled (isValid 0) account never opens, and is never 'latest'", async () => {
        const accounts = [acct("active", "2025-03-27T00:00:00Z", 1), acct("disabledNewest", "2026-01-01T00:00:00Z", 2, 0)];
        const ok = await decideEmailLogin(accounts, "pw", acceptOnly("active"));
        assert.strictEqual(ok.user.username, "active");
        const onlyDisabledMatches = await decideEmailLogin(accounts, "pw", acceptOnly("disabledNewest"));
        assert.deepStrictEqual(onlyDisabledMatches, { status: "disabled" });
    });

    await check("decideEmailLogin: inactive means anything but 1 (0, null, undefined all fail closed)", async () => {
        for (const bad of [0, null, undefined]) {
            const accounts = [acct("x", "2025-03-27T00:00:00Z", 1)];
            accounts[0].user.isValid = bad; // set after building: passing undefined to acct() would hit its default of 1
            const r = await decideEmailLogin(accounts, "pw", acceptOnly("x"));
            assert.deepStrictEqual(r, { status: "disabled" }, `isValid=${bad} must not log in`);
        }
    });

    await check("decideEmailLogin: no accounts, or a non-string password, is invalid", async () => {
        assert.deepStrictEqual(await decideEmailLogin([], "pw", acceptOnly()), { status: "invalid" });
        const accounts = [acct("a", "2025-03-27T00:00:00Z", 1)];
        assert.deepStrictEqual(await decideEmailLogin(accounts, undefined, acceptOnly("a")), { status: "invalid" });
    });

    await check("decideEmailLogin (staff): a teacher's OWN password opens the teacher, even with newer student accounts on the same email", async () => {
        const accounts = [staffAcct("t1", "teacher"), acct("stuOld", "2025-03-27T00:00:00Z", 1), acct("stuNew", "2025-11-11T00:00:00Z", 2)];
        const r = await decideEmailLogin(accounts, "pw", acceptOnly("t1"));
        assert.strictEqual(r.status, "ok");
        assert.strictEqual(r.user.username, "t1");
    });

    await check("decideEmailLogin (staff): a STUDENT password on a shared email never opens the teacher/admin", async () => {
        const accounts = [staffAcct("t1", "teacher"), staffAcct("adm", "admin"), acct("stuOld", "2025-03-27T00:00:00Z", 1), acct("stuNew", "2025-11-11T00:00:00Z", 2)];
        const r = await decideEmailLogin(accounts, "pw", acceptOnly("stuOld"));
        assert.strictEqual(r.status, "ok");
        assert.strictEqual(r.user.role, "student");
        assert.strictEqual(r.user.username, "stuNew");
    });

    await check("decideEmailLogin (staff): one password matching both staff and a student opens the STAFF account; admin before teacher", async () => {
        const both = [staffAcct("t1", "teacher"), acct("stu", "2025-03-27T00:00:00Z", 1)];
        assert.strictEqual((await decideEmailLogin(both, "pw", acceptOnly("t1", "stu"))).user.username, "t1");
        const twoStaff = [staffAcct("tch", "teacher", 1, 2), staffAcct("adm", "admin", 1, 9)];
        assert.strictEqual((await decideEmailLogin(twoStaff, "pw", acceptOnly("tch", "adm"))).user.username, "adm");
    });

    await check("decideEmailLogin (staff): an inactive teacher/admin never opens (403), and an active student on the email still can", async () => {
        const accounts = [staffAcct("t1", "teacher", 0), acct("stu", "2025-03-27T00:00:00Z", 1)];
        assert.deepStrictEqual(await decideEmailLogin(accounts, "pw", acceptOnly("t1")), { status: "disabled" });
        assert.strictEqual((await decideEmailLogin(accounts, "pw", acceptOnly("stu"))).user.username, "stu");
    });

    // ---- read-only DB checks ------------------------------------------------
    // Student-only fixtures below use emails with no admin/teacher account; staff
    // emails (all 3 teachers also hold student accounts) are covered further down.
    const NOT_STAFF_EMAIL = "LOWER(TRIM(email)) NOT IN (SELECT LOWER(TRIM(email)) FROM users WHERE role IN ('admin','teacher'))";
    const multi = await sequelize.query(
        `SELECT LOWER(TRIM(email)) AS email FROM users
         WHERE role='student' AND isValid=1 AND ${NOT_STAFF_EMAIL} GROUP BY LOWER(TRIM(email)) HAVING COUNT(*) > 1 LIMIT 1`,
        { type: QueryTypes.SELECT }
    ).then((rows) => rows[0]);
    assert(multi, "local DB needs at least one email shared by 2+ active student accounts");

    const expectedLatest = await sequelize.query(
        `SELECT u.username FROM users u JOIN students s ON s.StudentId = u.username
         WHERE u.role='student' AND u.isValid=1 AND LOWER(TRIM(u.email)) = :email
         ORDER BY s.createdAt DESC, s.id DESC LIMIT 1`,
        { type: QueryTypes.SELECT, replacements: { email: multi.email } }
    ).then((rows) => rows[0].username);

    await check("findStudentAccountsByEmail: returns every student account for the email, case/space-insensitive", async () => {
        const plain = await findStudentAccountsByEmail(multi.email);
        const messy = await findStudentAccountsByEmail(`  ${multi.email.toUpperCase()} `);
        assert(plain.length >= 2);
        assert.strictEqual(plain.every((a) => a.user.role === "student"), true);
        assert.deepStrictEqual(messy.map((a) => a.user.username).sort(), plain.map((a) => a.user.username).sort());
    });

    await check("resolveEmailLogin (real DB, fake compare): lands on the latest-enrolled account", async () => {
        const r = await resolveEmailLogin(multi.email, "pw", { compare: async () => true });
        assert.strictEqual(r.status, "ok");
        assert.strictEqual(r.user.username, expectedLatest);
    });

    await check("resolveEmailLogin: unknown email is invalid", async () => {
        const r = await resolveEmailLogin("nobody-here@example.invalid", "pw", { compare: async () => true });
        assert.deepStrictEqual(r, { status: "invalid" });
    });

    // ---- inactive students, against the real data ---------------------------
    // Every student email that has at least one inactive (isValid = 0) account.
    const emailsWithInactive = await sequelize.query(
        `SELECT LOWER(TRIM(email)) AS email, SUM(isValid = 1) AS active, SUM(isValid = 0) AS inactive
         FROM users WHERE role='student' AND ${NOT_STAFF_EMAIL} GROUP BY LOWER(TRIM(email)) HAVING SUM(isValid = 0) > 0`,
        { type: QueryTypes.SELECT }
    );
    assert(emailsWithInactive.length > 0, "local DB needs students with isValid = 0");

    await check(`NEVER opens an inactive account: every one of ${emailsWithInactive.length} emails with an inactive account, with a compare that accepts every password`, async () => {
        for (const row of emailsWithInactive) {
            const r = await resolveEmailLogin(row.email, "pw", { compare: async () => true });
            if (r.status === "ok") {
                assert.strictEqual(Number(r.user.isValid), 1, `${row.email} opened inactive account ${r.user.username}`);
                assert(Number(row.active) > 0, `${row.email} has no active account but status was ok`);
            } else {
                assert.strictEqual(Number(row.active), 0, `${row.email} has an active account but status was ${r.status}`);
                assert.strictEqual(r.status, "disabled");
            }
        }
    });

    const mixed = emailsWithInactive.find((row) => Number(row.active) > 0);
    if (mixed) {
        await check("email with one active + one inactive account: lands on the ACTIVE one even when the inactive one is newer", async () => {
            const accounts = await findStudentAccountsByEmail(mixed.email);
            const inactiveHashes = accounts.filter((a) => Number(a.user.isValid) !== 1).map((a) => a.user.password);
            const r = await resolveEmailLogin(mixed.email, "pw", { compare: async () => true });
            assert.strictEqual(r.status, "ok");
            assert.strictEqual(Number(r.user.isValid), 1);
            // the inactive account's own password alone must never log in
            const onlyInactive = await resolveEmailLogin(mixed.email, "pw", {
                compare: async (_p, hash) => inactiveHashes.includes(hash),
            });
            assert.deepStrictEqual(onlyInactive, { status: "disabled" });
        });
    }

    // The exact scenario: the NEWEST enrollment is inactive, an OLDER one is active.
    const newestIsInactive = [];
    for (const row of emailsWithInactive.filter((r) => Number(r.active) > 0)) {
        const accounts = sortByLatestEnrolled(await findStudentAccountsByEmail(row.email));
        if (Number(accounts[0].user.isValid) !== 1) newestIsInactive.push({ email: row.email, accounts });
    }
    assert(newestIsInactive.length > 0, "local DB needs an email whose newest enrollment is inactive and an older one is active");

    await check(`newest enrollment inactive + older active (${newestIsInactive.length} emails): email login lands on the active account`, async () => {
        for (const { email, accounts } of newestIsInactive) {
            const r = await resolveEmailLogin(email, "pw", { compare: async () => true });
            assert.strictEqual(r.status, "ok", `${email}`);
            assert.strictEqual(Number(r.user.isValid), 1, `${email} landed on an inactive account`);
            assert.notStrictEqual(r.user.username, accounts[0].user.username, `${email} landed on the newest (inactive) account`);
        }
    });

    await check("switching: an active account cannot switch to its inactive sibling (not listed, 403, no token, no cookie)", async () => {
        for (const { email, accounts } of newestIsInactive) {
            const active = accounts.find((a) => Number(a.user.isValid) === 1).user;
            const inactive = accounts.filter((a) => Number(a.user.isValid) !== 1).map((a) => a.user);
            const linked = await getLinkedStudentAccounts(active.username);
            for (const target of inactive) {
                assert(!linked.some((l) => l.username === target.username), `${email}: ${target.username} must not be listed`);
                const res = mockRes();
                await switchAccount({
                    user: { id: active.id, username: active.username, role: "student", exp: Math.floor(Date.now() / 1000) + 3600 },
                    body: { username: target.username },
                    secure: false,
                }, res);
                assert.strictEqual(res.statusCode, 403, `${email}: switch to ${target.username}`);
                assert.strictEqual(res.cookies.length, 0);
                assert.strictEqual(res.body.token, undefined);
            }
        }
    });

    const allInactive = emailsWithInactive.find((row) => Number(row.active) === 0);
    if (allInactive) {
        await check("email with only inactive accounts: controller gives 401 on a wrong password and never a token", async () => {
            const res = mockRes();
            await login({ body: { username: allInactive.email, password: "definitely-not-the-password" }, secure: false }, res);
            assert.strictEqual(res.statusCode, 401);
            assert.strictEqual(res.cookies.length, 0);
            assert.strictEqual(res.body.token, undefined);
        });
    }

    // ---- admin / teacher email login, against the real data -------------------
    const staffRows = await sequelize.query(
        `SELECT id, username, role, email, password FROM users WHERE role IN ('admin','teacher') AND isValid=1`,
        { type: QueryTypes.SELECT }
    );
    assert(staffRows.length > 0, "local DB needs at least one active admin/teacher");

    await check(`staff email login (${staffRows.length} accounts): the account's own password opens it; no student password ever does`, async () => {
        for (const s of staffRows) {
            const own = await resolveEmailLogin(s.email, "pw", { compare: async (_p, hash) => hash === s.password });
            assert.strictEqual(own.status, "ok", `${s.username} own password`);
            assert.strictEqual(own.user.username, s.username);
            assert.strictEqual(own.user.role, s.role);

            // every OTHER hash on that email "matches": must land on a student or fail, never on staff
            const others = await resolveEmailLogin(s.email, "pw", { compare: async (_p, hash) => hash !== s.password });
            if (others.status === "ok") {
                assert.strictEqual(others.user.role, "student", `${s.username}'s email opened ${others.user.role} with a non-staff password`);
            } else {
                assert(["invalid", "disabled"].includes(others.status), `${s.username}: unexpected ${others.status}`);
            }
        }
    });

    await check("login controller: admin/teacher email + wrong password -> 401, no cookie", async () => {
        const res = mockRes();
        await login({ body: { username: staffRows[0].email, password: "definitely-not-the-password" }, secure: false }, res);
        assert.strictEqual(res.statusCode, 401);
        assert.strictEqual(res.cookies.length, 0);
    });

    // ---- controller success paths (bcrypt.compare patched in memory, restored after) ----
    const bcrypt = require("bcryptjs");
    const jwt = require("jsonwebtoken");
    const withPatchedCompare = async (accept, fn) => {
        const original = bcrypt.compare;
        bcrypt.compare = async (_plain, hash) => accept(hash);
        try { return await fn(); } finally { bcrypt.compare = original; }
    };

    await check("login controller: email (messy case) + OLDER account's password -> 200, JWT and cookie for the LATEST active account", async () => {
        const activeByAge = sortByLatestEnrolled(await findStudentAccountsByEmail(multi.email))
            .filter((a) => Number(a.user.isValid) === 1);
        const older = activeByAge[activeByAge.length - 1];
        assert.notStrictEqual(older.user.username, expectedLatest, "fixture must have an older account");
        const res = await withPatchedCompare((hash) => hash === older.user.password, async () => {
            const r = mockRes();
            await login({ body: { username: ` ${multi.email.toUpperCase()} `, password: "pw" }, secure: false }, r);
            return r;
        });
        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(res.body.user.username, expectedLatest);
        assert.strictEqual(res.body.user.role, "student");
        const payload = jwt.verify(res.body.token, process.env.JWT_SECRET);
        assert.strictEqual(payload.username, expectedLatest);
        assert.strictEqual(res.cookies.length, 1);
        assert.strictEqual(res.cookies[0].name, "token");
    });

    await check("login controller: teacher email + teacher's own password -> 200 as the TEACHER; + a student's password -> a STUDENT", async () => {
        const teacher = staffRows.find((s) => s.role === "teacher" && s.email);
        const studentsOnSameEmail = await findStudentAccountsByEmail(teacher.email);
        const asTeacher = await withPatchedCompare((hash) => hash === teacher.password, async () => {
            const r = mockRes();
            await login({ body: { username: teacher.email, password: "pw" }, secure: false }, r);
            return r;
        });
        assert.strictEqual(asTeacher.statusCode, 200);
        assert.strictEqual(asTeacher.body.user.role, "teacher");
        assert.strictEqual(jwt.verify(asTeacher.body.token, process.env.JWT_SECRET).role, "teacher");

        const active = studentsOnSameEmail.filter((a) => Number(a.user.isValid) === 1);
        if (active.length > 0) {
            const asStudent = await withPatchedCompare((hash) => hash === active[0].user.password, async () => {
                const r = mockRes();
                await login({ body: { username: teacher.email, password: "pw" }, secure: false }, r);
                return r;
            });
            assert.strictEqual(asStudent.statusCode, 200);
            assert.strictEqual(asStudent.body.user.role, "student", "a student password must never open the teacher");
        }
    });

    // ---- controller: only paths that need no real password -------------------
    await check("login controller: unknown email -> 401 'Invalid credentials'", async () => {
        const res = mockRes();
        await login({ body: { username: "nobody-here@example.invalid", password: "x" }, secure: false }, res);
        assert.strictEqual(res.statusCode, 401);
        assert.strictEqual(res.body.message, "Invalid credentials");
    });

    await check("login controller: real email + wrong password -> 401, no cookie", async () => {
        const res = mockRes();
        await login({ body: { username: multi.email, password: "definitely-not-the-password" }, secure: false }, res);
        assert.strictEqual(res.statusCode, 401);
        assert.strictEqual(res.cookies.length, 0);
    });

    await check("login controller: username path unchanged (unknown username -> 401)", async () => {
        const res = mockRes();
        await login({ body: { username: "NO-SUCH-STUDENT-ID", password: "x" }, secure: false }, res);
        assert.strictEqual(res.statusCode, 401);
        assert.strictEqual(res.body.message, "Invalid credentials");
    });

    console.log(`\n${passed} checks passed${process.exitCode ? " (with failures above)" : ""}`);
    await sequelize.close();
})();
