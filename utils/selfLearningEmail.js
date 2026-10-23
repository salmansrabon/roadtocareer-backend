// Payment-instruction email for a Self-Learning (recorded course) purchase. Unlike the
// live-batch email it has no orientation date, class schedule, calendar invite or
// installments: the student pays once and gets portal access after admin confirms.

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const buildSelfLearningPaymentEmail = ({ studentName, course, packageData }) => {
  const fee = Number(packageData.discountedFee);
  const feeLabel = `Tk ${fee.toLocaleString("en-US")}`;
  const title = escapeHtml(course.course_title);
  const packageName = escapeHtml(packageData.packageName);

  const subject = `Road to SDET - ${course.course_title} (${packageData.packageName}) payment instruction`;

  const html = `
    <div style="font-family: Arial, sans-serif; color: #222;">
      <p>Assalamu Alaikum ${escapeHtml(studentName)},</p>
      <p>Thank you for choosing the <strong>${packageName}</strong> plan of <strong>${title}</strong> (Batch ${escapeHtml(course.batch_no)}).</p>

      <h4>Payment:</h4>
      <ul>
        <li><strong>Total Fee:</strong> ${feeLabel} (one payment)</li>
      </ul>

      <h4>How to Pay:</h4>
      <ol>
        <li>Send money via <strong>Bkash / Nagad</strong> to <strong>01686606909</strong>. Write your name in the reference field.</li>
        <li>Send a screenshot of your transaction by WhatsApp to <strong>01782808778</strong>.</li>
      </ol>

      <h4>What happens next:</h4>
      <p>We confirm your payment. Then your student portal account is activated. You can log in and watch your course.</p>

      <p>If you have a question, ask on our support WhatsApp <strong>01782808778</strong>.</p>
      <hr>
      <p>
        Regards,<br>
        <strong>Team, Road to SDET</strong><br>
        <a href="https://www.roadtocareer.net">Website</a> | WhatsApp: +8801782808778
      </p>
    </div>
  `;

  return { subject, html };
};

module.exports = { buildSelfLearningPaymentEmail };
