/**
 * Manual verification for selfLearningEmail.js.
 * Run with: node tests/test-self-learning-email.js
 */
const assert = require("node:assert");
const { buildSelfLearningPaymentEmail } = require("../utils/selfLearningEmail");

const course = { course_title: "Full Stack SDET", batch_no: "19" };
const packageData = { packageName: "Recorded", discountedFee: "3000.00" };

const { subject, html } = buildSelfLearningPaymentEmail({
  studentName: "Rahim <script>alert(1)</script>",
  course,
  packageData,
});

assert.ok(subject.includes("Full Stack SDET"), "subject names the course");
assert.ok(subject.includes("Recorded"), "subject names the package");
assert.ok(html.includes("Tk 3,000"), "html shows the fee");
assert.ok(html.includes("01686606909"), "html shows the payment number");
assert.ok(html.includes("01782808778"), "html shows the WhatsApp number");
assert.ok(!html.includes("<script>"), "student name is escaped");
assert.ok(!/orientation/i.test(html), "no live-class schedule");
assert.ok(!/calendar/i.test(html), "no calendar invitation text");

console.log("✅ selfLearningEmail checks passed");
