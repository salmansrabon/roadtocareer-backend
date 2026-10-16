/**
 * Verification script for the TASK-63 weekly-reminder rule (one reminder per
 * email; skipped when any linked account already meets the threshold).
 * Run with: node tests/test-select-reminder-targets.js   (from backend/)
 *
 * No DB reads and no emails: selectReminderTargets and
 * buildPersonalizedReminderBody are pure. (Requiring the job file does open the
 * Sequelize pool, hence the explicit process.exit.)
 */
process.env.SEND_MAIL = "false";
require("dotenv").config();
const assert = require("node:assert");
const { selectReminderTargets } = require("../cron/weeklyProfileReminderJob");
const { buildPersonalizedReminderBody, getProfileGapAnalysis } = require("../utils/profileGapHelper");

const T = 70;
const row = (StudentId, email, profile_score, createdAt) => ({
  StudentId, email, profile_score, createdAt: new Date(createdAt), courseTitle: `Course ${StudentId}`,
});
const ids = (result) => result.targets.map((t) => t.student.StudentId);

const cases = {
  "single account below threshold is a target": () => {
    const r = selectReminderTargets([row("A1", "a@x.com", 40, "2026-01-01")], T);
    assert.deepStrictEqual(ids(r), ["A1"]);
    assert.strictEqual(r.targets[0].accountCount, 1);
  },
  "single account at the threshold is skipped (>= counts as complete)": () => {
    const r = selectReminderTargets([row("A1", "a@x.com", 70, "2026-01-01")], T);
    assert.deepStrictEqual(ids(r), []);
    assert.strictEqual(r.skippedGroups, 1);
  },
  "THE BUG: earliest account low, newer account complete -> skipped": () => {
    const r = selectReminderTargets(
      [row("OLD", "a@x.com", 40, "2026-01-01"), row("NEW", "a@x.com", 90, "2026-06-01")], T);
    assert.deepStrictEqual(ids(r), []);
    assert.strictEqual(r.skippedGroups, 1);
  },
  "earliest account complete, newer low -> skipped": () => {
    const r = selectReminderTargets(
      [row("OLD", "a@x.com", 90, "2026-01-01"), row("NEW", "a@x.com", 40, "2026-06-01")], T);
    assert.deepStrictEqual(ids(r), []);
  },
  "all linked accounts low -> one target, the earliest-registered, with accountCount": () => {
    const r = selectReminderTargets(
      [row("NEW", "a@x.com", 10, "2026-06-01"), row("OLD", "a@x.com", 50, "2026-01-01"), row("MID", "a@x.com", 30, "2026-03-01")], T);
    assert.deepStrictEqual(ids(r), ["OLD"]);
    assert.strictEqual(r.targets[0].accountCount, 3);
  },
  "emails differing only by case/whitespace are one person": () => {
    const r = selectReminderTargets(
      [row("OLD", "A@X.com ", 40, "2026-01-01"), row("NEW", "a@x.com", 90, "2026-06-01")], T);
    assert.deepStrictEqual(ids(r), []);
    assert.strictEqual(r.uniqueEmails, 1);
  },
  "different emails are independent": () => {
    const r = selectReminderTargets(
      [row("A1", "a@x.com", 40, "2026-01-01"), row("B1", "b@x.com", 90, "2026-01-01"), row("C1", "c@x.com", 20, "2026-02-01")], T);
    assert.deepStrictEqual(ids(r).sort(), ["A1", "C1"]);
    assert.strictEqual(r.skippedGroups, 1);
    assert.strictEqual(r.uniqueEmails, 3);
  },
  "never emails more people than the old earliest-row rule did": () => {
    const rows = [
      row("A1", "a@x.com", 40, "2026-01-01"), row("A2", "a@x.com", 95, "2026-02-01"),
      row("B1", "b@x.com", 30, "2026-01-01"), row("B2", "b@x.com", 20, "2026-02-01"),
      row("C1", "c@x.com", 90, "2026-01-01"), row("C2", "c@x.com", 10, "2026-02-01"),
    ];
    const oldTargets = new Set();
    const earliest = new Map();
    rows.forEach((r) => { const e = earliest.get(r.email); if (!e || r.createdAt < e.createdAt) earliest.set(r.email, r); });
    [...earliest.values()].filter((r) => r.profile_score < T).forEach((r) => oldTargets.add(r.StudentId));
    const newIds = ids(selectReminderTargets(rows, T));
    assert(newIds.every((id) => oldTargets.has(id)), `new ${newIds} not a subset of old ${[...oldTargets]}`);
    assert.deepStrictEqual(newIds, ["B1"]);
  },
  "email body mentions the switch only when there are several accounts": () => {
    const student = { student_name: "Sam", StudentId: "SM12345", courseTitle: "SDET Batch 5" };
    const gap = getProfileGapAnalysis({ student_name: "Sam", profile_score: 20 }, T);
    const multi = buildPersonalizedReminderBody(student, gap, 3);
    const single = buildPersonalizedReminderBody(student, gap);
    assert(multi.includes("3 accounts") && multi.includes("SM12345") && multi.includes("Profile menu"));
    assert(!single.includes("accounts registered") && !single.includes("Profile menu"));
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(cases)) {
  try { fn(); console.log(`  ok  ${name}`); }
  catch (err) { failed++; console.error(`  FAIL ${name}\n       ${err.message}`); }
}
console.log(`\n${Object.keys(cases).length - failed}/${Object.keys(cases).length} checks passed.`);
process.exit(failed ? 1 : 0);
