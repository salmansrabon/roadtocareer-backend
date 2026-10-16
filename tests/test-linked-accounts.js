/**
 * Verification script for TASK-63 account switching (linkedAccountsHelper +
 * authController.getLinkedAccounts / switchAccount).
 * Run with: node tests/test-linked-accounts.js   (from backend/)
 *
 * READ-ONLY against whichever DB backend/.env points at (use local sdetdb):
 * it only SELECTs and signs in-memory JWTs. It does not start the server, so no
 * cron jobs, seeders or emails run.
 */
require("dotenv").config();
const assert = require("node:assert");
const jwt = require("jsonwebtoken");
const { QueryTypes } = require("sequelize");
const sequelize = require("../config/db");
const User = require("../models/User");
const { normalizeEmail, getLinkedStudentAccounts } = require("../utils/linkedAccountsHelper");
const { getLinkedAccounts, switchAccount } = require("../controllers/authController");

const mockRes = () => {
    const res = { statusCode: 200, body: null, cookies: [] };
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (payload) => { res.body = payload; return res; };
    res.cookie = (name, value, opts) => { res.cookies.push({ name, value, opts }); return res; };
    return res;
};

const callerReq = (user, body) => ({
    user: { ...user, exp: Math.floor(Date.now() / 1000) + 3600 },
    body,
    secure: false,
});

let passed = 0;
const check = (name, fn) => Promise.resolve(fn()).then(
    () => { passed++; console.log(`  ok  ${name}`); },
    (err) => { console.error(`  FAIL ${name}\n       ${err.message}`); process.exitCode = 1; }
);

(async () => {
    console.log(`DB: ${process.env.DB_HOST}/${process.env.DB_NAME}`);

    await check("normalizeEmail trims and lowercases", () => {
        assert.strictEqual(normalizeEmail("  Foo@Bar.COM "), "foo@bar.com");
        assert.strictEqual(normalizeEmail(null), "");
    });

    const [multi] = await sequelize.query(
        `SELECT LOWER(TRIM(email)) AS email, COUNT(*) AS n FROM users
         WHERE role='student' AND isValid=1 GROUP BY LOWER(TRIM(email)) HAVING n > 1 ORDER BY n DESC LIMIT 1`,
        { type: QueryTypes.SELECT, raw: true, plain: false }
    ).then((rows) => rows);
    const [single] = await sequelize.query(
        `SELECT u.username FROM users u WHERE u.role='student' AND u.isValid=1
         AND (SELECT COUNT(*) FROM users x WHERE LOWER(TRIM(x.email)) = LOWER(TRIM(u.email))) = 1 LIMIT 1`,
        { type: QueryTypes.SELECT }
    );
    const admin = await User.findOne({ where: { role: "admin" } });
    const outsider = await sequelize.query(
        `SELECT username FROM users WHERE role='student' AND isValid=1 AND LOWER(TRIM(email)) <> :email LIMIT 1`,
        { type: QueryTypes.SELECT, replacements: { email: multi.email } }
    ).then((rows) => rows[0]);

    assert(multi && single && admin && outsider, "local DB lacks the fixtures this script needs");
    const group = await User.findAll({ where: { role: "student", isValid: 1 }, raw: true })
        .then((rows) => rows.filter((u) => normalizeEmail(u.email) === multi.email));
    const a = group[0];
    const others = group.slice(1);
    console.log(`  fixtures: ${group.length} active accounts share ${multi.email}`);

    await check("multi-account student sees exactly the other active accounts", async () => {
        const linked = await getLinkedStudentAccounts(a.username);
        assert.deepStrictEqual(linked.map((l) => l.username).sort(), others.map((o) => o.username).sort());
        assert(linked.every((l) => l.courseTitle && l.batch_no !== undefined));
    });

    await check("single-account student sees nothing", async () => {
        assert.deepStrictEqual(await getLinkedStudentAccounts(single.username), []);
    });

    await check("admin sees nothing", async () => {
        assert.deepStrictEqual(await getLinkedStudentAccounts(admin.username), []);
    });

    await check("GET linked-accounts returns { accounts }", async () => {
        const res = mockRes();
        await getLinkedAccounts(callerReq({ id: a.id, username: a.username, role: "student" }), res);
        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(res.body.accounts.length, others.length);
    });

    await check("switch to a linked account issues a token with the SAME exp", async () => {
        const req = callerReq({ id: a.id, username: a.username, role: "student" }, { username: others[0].username });
        const res = mockRes();
        await switchAccount(req, res);
        assert.strictEqual(res.statusCode, 200);
        const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
        assert.strictEqual(decoded.username, others[0].username);
        assert.strictEqual(decoded.role, "student");
        assert.strictEqual(decoded.exp, req.user.exp);
        assert.deepStrictEqual(Object.keys(res.body.user).sort(), ["email", "id", "role", "username"]);
        assert.strictEqual(res.cookies[0].name, "token");
        assert(res.cookies[0].opts.httpOnly && res.cookies[0].opts.maxAge <= 3600 * 1000);
    });

    const rejected = [
        ["a student with a different email", { username: outsider.username }, "student"],
        ["an admin account", { username: admin.username }, "student"],
        ["self", { username: a.username }, "student"],
        ["an unknown username", { username: "NOPE00000" }, "student"],
        ["a missing username", {}, "student"],
        ["a non-string username", { username: { $ne: null } }, "student"],
    ];
    for (const [label, body] of rejected) {
        await check(`switch to ${label} -> 403`, async () => {
            const res = mockRes();
            await switchAccount(callerReq({ id: a.id, username: a.username, role: "student" }, body), res);
            assert.strictEqual(res.statusCode, 403);
            assert.strictEqual(res.body.message, "Cannot switch to this account");
            assert.strictEqual(res.cookies.length, 0);
        });
    }

    await check("admin caller cannot switch into a student -> 403", async () => {
        const res = mockRes();
        await switchAccount(callerReq({ id: admin.id, username: admin.username, role: "admin" }, { username: a.username }), res);
        assert.strictEqual(res.statusCode, 403);
    });

    console.log(`\n${passed} checks passed${process.exitCode ? " (with failures above)" : ""}.`);
    await sequelize.close();
})().catch((err) => {
    console.error(err);
    process.exit(1);
});
