const { google } = require("googleapis");
const path = require("path");

const SERVICE_ACCOUNT_FILE = path.join(__dirname, "../config/gmail-service-account.json");

const auth = new google.auth.GoogleAuth({
    keyFile: SERVICE_ACCOUNT_FILE,
    scopes: ["https://www.googleapis.com/auth/calendar"],
    clientOptions: {
        subject: "salman@roadtocareer.net",
    },
});

/**
 * Parses a Google Calendar event URL to extract eventId and calendarId.
 *
 * Google Calendar event/edit URLs encode the event ID and calendar ID as a
 * base64 string in the path: /eventedit/<base64> where the decoded value is
 * "<eventId> <calendarId>" (space-separated).
 */
function parseCalendarEventUrl(url) {
    const match = url.match(/\/(?:eventedit|event)\/([A-Za-z0-9+/=_-]+)/);
    if (!match) return null;

    // Normalise base64url → standard base64
    const b64 = match[1].replace(/-/g, "+").replace(/_/g, "/");
    let decoded;
    try {
        decoded = Buffer.from(b64, "base64").toString("utf-8").trim();
    } catch {
        return null;
    }

    const spaceIdx = decoded.indexOf(" ");
    if (spaceIdx === -1) {
        return { eventId: decoded, calendarId: "primary" };
    }
    return {
        eventId: decoded.slice(0, spaceIdx),
        calendarId: decoded.slice(spaceIdx + 1),
    };
}

/**
 * Adds an attendee email to an existing Google Calendar event.
 * Skips silently if the email is already an attendee.
 * Uses sendUpdates: "all" so Google sends the new attendee a calendar invite.
 */
async function addAttendeeToCalendarEvent(calendarEventLink, attendeeEmail) {
    const parsed = parseCalendarEventUrl(calendarEventLink);
    if (!parsed) {
        console.error("❌ Could not parse Google Calendar event URL:", calendarEventLink);
        return;
    }

    const { eventId, calendarId } = parsed;

    const client = await auth.getClient();
    const calendar = google.calendar({ version: "v3", auth: client });

    // Fetch existing event to preserve current attendees list
    const existing = await calendar.events.get({
        calendarId,
        eventId,
    });

    const currentAttendees = existing.data.attendees || [];

    // Skip if already registered
    if (currentAttendees.some((a) => a.email === attendeeEmail)) {
        console.log(`ℹ️ ${attendeeEmail} is already an attendee of calendar event ${eventId}`);
        return;
    }

    await calendar.events.patch({
        calendarId,
        eventId,
        sendUpdates: "all",
        requestBody: {
            attendees: [...currentAttendees, { email: attendeeEmail }],
        },
    });

    console.log(`✅ Added ${attendeeEmail} as attendee to calendar event ${eventId}`);
}

module.exports = { addAttendeeToCalendarEvent };
