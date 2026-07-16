const { google } = require("googleapis");
const path = require("path");

const SERVICE_ACCOUNT_FILE = path.join(__dirname, "../config/gmail-service-account.json");
const SCOPES = ["https://www.googleapis.com/auth/gmail.send"];

// Set up OAuth2 client
const auth = new google.auth.GoogleAuth({
    keyFile: SERVICE_ACCOUNT_FILE,
    scopes: SCOPES,
    clientOptions: {
        subject: "salman@roadtocareer.net", // ✅ The email of the user you want to impersonate
    },
});

// Function to send email
async function sendEmail(to, subject, text, contentType = "text/plain") {
    try {
        const client = await auth.getClient();
        const gmail = google.gmail({ version: "v1", auth: client });

        // ✅ Set the "From" field with custom alias
        const senderName = "Road to SDET"; // ✅ Alias name
        const senderEmail = "salman@roadtocareer.net";

        // ✅ Encode the email with correct formatting
        const encodedMessage = Buffer.from(
            `From: ${senderName} <${senderEmail}>\r\n` +  // ✅ Properly formatted alias
            `To: ${to}\r\n` +
            `Subject: ${subject}\r\n` +
            "MIME-Version: 1.0\r\n" +
            `Content-Type: ${contentType}; charset=UTF-8\r\n\r\n` +
            `${text}`
        ).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

        // ✅ Send the email
        console.log(process.env.SEND_MAIL);
        if(process.env.SEND_MAIL === "false") {
            console.log("📧 Email send configuration is set to false", text);
            return true;
        }
        const response = await gmail.users.messages.send({
            userId: "me",
            requestBody: {
                raw: encodedMessage,
            },
        });

        console.log("✅ Email sent successfully:", response.data);
        return true;
    } catch (error) {
        console.error("❌ Error sending email:", error);
        return false;
    }
}

// Function to send an email with a single file attachment (e.g. a CSV report)
async function sendEmailWithAttachment(to, subject, text, attachment) {
    try {
        const client = await auth.getClient();
        const gmail = google.gmail({ version: "v1", auth: client });

        const senderName = "Road to SDET";
        const senderEmail = "salman@roadtocareer.net";
        const boundary = `boundary_${Date.now()}`;

        const base64Attachment = Buffer.from(attachment.content, "utf-8").toString("base64");

        const rawMessage =
            `From: ${senderName} <${senderEmail}>\r\n` +
            `To: ${to}\r\n` +
            `Subject: ${subject}\r\n` +
            "MIME-Version: 1.0\r\n" +
            `Content-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n` +
            `--${boundary}\r\n` +
            "Content-Type: text/plain; charset=UTF-8\r\n\r\n" +
            `${text}\r\n\r\n` +
            `--${boundary}\r\n` +
            `Content-Type: ${attachment.mimeType || "text/csv"}; name="${attachment.filename}"\r\n` +
            `Content-Disposition: attachment; filename="${attachment.filename}"\r\n` +
            "Content-Transfer-Encoding: base64\r\n\r\n" +
            `${base64Attachment}\r\n\r\n` +
            `--${boundary}--`;

        const encodedMessage = Buffer.from(rawMessage)
            .toString("base64")
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "");

        console.log(process.env.SEND_MAIL);
        if (process.env.SEND_MAIL === "false") {
            console.log("📧 Email send configuration is set to false", text, `[attachment: ${attachment.filename}]`);
            return true;
        }

        const response = await gmail.users.messages.send({
            userId: "me",
            requestBody: {
                raw: encodedMessage,
            },
        });

        console.log("✅ Email with attachment sent successfully:", response.data);
        return true;
    } catch (error) {
        console.error("❌ Error sending email with attachment:", error);
        return false;
    }
}

module.exports = { sendEmail, sendEmailWithAttachment };
