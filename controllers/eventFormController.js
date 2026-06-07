const EventForm = require("../models/EventForm");
const Audience = require("../models/Audience");
const { sendEmail } = require("../utils/emailHelper");
const { addAttendeeToCalendarEvent } = require("../utils/googleCalendarHelper");

// POST /api/admin/event-forms
const createEventForm = async (req, res) => {
    try {
        const { title, short_description, event_date, fields, google_calendar_event_link } = req.body;

        if (!title || !short_description) {
            return res.status(400).json({ message: "title and short_description are required." });
        }
        if (!fields || !Array.isArray(fields) || fields.length === 0) {
            return res.status(400).json({ message: "At least one dynamic field is required." });
        }

        const validationError = validateFields(fields);
        if (validationError) return res.status(400).json({ message: validationError });

        const form = await EventForm.create({
            title,
            short_description,
            event_date,
            fields_json: fields,
            created_by: req.user.id,
            ...(google_calendar_event_link && { google_calendar_event_link }),
        });

        res.status(201).json({ message: "Event form created successfully.", form });
    } catch (error) {
        console.error("Error creating event form:", error);
        res.status(500).json({ message: "Internal server error." });
    }
};

// GET /api/admin/event-forms
const getAllEventForms = async (req, res) => {
    try {
        const forms = await EventForm.findAll({ order: [["createdAt", "DESC"]] });

        const formsWithCount = await Promise.all(
            forms.map(async (form) => {
                const audienceCount = await Audience.count({ where: { event_form_id: form.id } });
                return { ...form.toJSON(), audienceCount };
            })
        );

        res.status(200).json({ forms: formsWithCount });
    } catch (error) {
        console.error("Error fetching event forms:", error);
        res.status(500).json({ message: "Internal server error." });
    }
};

// GET /api/admin/event-forms/:id  (admin)
// GET /api/event-forms/:id        (public — same handler, no auth middleware on public route)
const getEventFormById = async (req, res) => {
    try {
        const form = await EventForm.findByPk(req.params.id);
        if (!form) return res.status(404).json({ message: "Event form not found." });
        res.status(200).json({ form });
    } catch (error) {
        console.error("Error fetching event form:", error);
        res.status(500).json({ message: "Internal server error." });
    }
};

// PUT /api/admin/event-forms/:id
const updateEventForm = async (req, res) => {
    try {
        const form = await EventForm.findByPk(req.params.id);
        if (!form) return res.status(404).json({ message: "Event form not found." });

        const { title, short_description, event_date, fields, google_calendar_event_link } = req.body;

        if (fields !== undefined) {
            if (!Array.isArray(fields) || fields.length === 0) {
                return res.status(400).json({ message: "At least one dynamic field is required." });
            }
            const validationError = validateFields(fields);
            if (validationError) return res.status(400).json({ message: validationError });
        }

        await form.update({
            ...(title && { title }),
            ...(short_description && { short_description }),
            ...(event_date && { event_date }),
            ...(fields && { fields_json: fields }),
            ...(google_calendar_event_link !== undefined && { google_calendar_event_link: google_calendar_event_link || null }),
        });

        res.status(200).json({ message: "Event form updated successfully.", form });
    } catch (error) {
        console.error("Error updating event form:", error);
        res.status(500).json({ message: "Internal server error." });
    }
};

// DELETE /api/admin/event-forms/:id
const deleteEventForm = async (req, res) => {
    try {
        const form = await EventForm.findByPk(req.params.id);
        if (!form) return res.status(404).json({ message: "Event form not found." });

        await form.destroy();
        res.status(200).json({ message: "Event form deleted successfully." });
    } catch (error) {
        console.error("Error deleting event form:", error);
        res.status(500).json({ message: "Internal server error." });
    }
};

// POST /api/event-forms/:id/submit  (public)
const submitAudience = async (req, res) => {
    try {
        const form = await EventForm.findByPk(req.params.id);
        if (!form) return res.status(404).json({ message: "Event form not found." });

        const { submitted_data } = req.body;
        if (!submitted_data || typeof submitted_data !== "object") {
            return res.status(400).json({ message: "submitted_data is required." });
        }

        const fields = form.fields_json;
        const submissionError = validateSubmission(fields, submitted_data);
        if (submissionError) return res.status(400).json({ message: submissionError });

        const audience = await Audience.create({
            event_form_id: form.id,
            submitted_data,
        });

        res.status(201).json({ message: "Submission received successfully.", audience });

        // Send greeting email if an email-type field exists in the submission
        setImmediate(async () => {
            try {
                const emailField = fields.find((f) => f.type === "email");
                if (!emailField) return;
                const recipientEmail = submitted_data[emailField.name];
                if (!recipientEmail) return;

                const isGeneric = !form.event_date && !form.google_calendar_event_link;

                let subject, text;
                if (isGeneric) {
                    subject = "Form Submission Confirmation";
                    text =
`Hello,

Your form submission is recorded.

Best regards,
Road to SDET Team`;
                } else {
                    const eventDateLine = form.event_date
                        ? `Date: ${new Date(form.event_date).toLocaleDateString("en-US", {
                            weekday: "long", year: "numeric", month: "long", day: "numeric",
                            hour: "numeric", minute: "2-digit", hour12: true,
                            timeZone: "Asia/Dhaka",
                        })}\n`
                        : "";
                    subject = `You're registered for ${form.title}!`;
                    text =
`Hello,

Thank you for registering for "${form.title}"!

Event Details:
${eventDateLine}${form.short_description}

We look forward to seeing you there.

Best regards,
Road to SDET Team`;
                }

                const emailSent = await sendEmail(recipientEmail, subject, text, "text/plain");

                // Only add to Google Calendar if the greeting email was delivered successfully
                if (emailSent && form.google_calendar_event_link) {
                    await addAttendeeToCalendarEvent(form.google_calendar_event_link, recipientEmail);
                } else if (!emailSent && form.google_calendar_event_link) {
                    console.warn(`⚠️ Skipping calendar invite for ${recipientEmail} — greeting email failed.`);
                }
            } catch (err) {
                console.error("❌ Error in post-submission tasks:", err);
            }
        });
    } catch (error) {
        console.error("Error submitting audience data:", error);
        res.status(500).json({ message: "Internal server error." });
    }
};

// GET /api/admin/event-forms/:id/audience
const getAudienceByForm = async (req, res) => {
    try {
        const form = await EventForm.findByPk(req.params.id);
        if (!form) return res.status(404).json({ message: "Event form not found." });

        const audienceList = await Audience.findAll({
            where: { event_form_id: req.params.id },
            order: [["createdAt", "DESC"]],
        });

        res.status(200).json({ form, audience: audienceList });
    } catch (error) {
        console.error("Error fetching audience list:", error);
        res.status(500).json({ message: "Internal server error." });
    }
};

// GET /api/admin/event-forms/:id/audience/export-csv
const exportAudienceCSV = async (req, res) => {
    try {
        const form = await EventForm.findByPk(req.params.id);
        if (!form) return res.status(404).json({ message: "Event form not found." });

        const audienceList = await Audience.findAll({
            where: { event_form_id: req.params.id },
            order: [["createdAt", "ASC"]],
        });

        const fields = form.fields_json;

        // Build CSV header row
        const headers = ["Audience ID", ...fields.map((f) => f.label), "Submission Date"];
        const csvRows = [headers.map(escapeCSV).join(",")];

        // Build CSV data rows
        audienceList.forEach((entry) => {
            const data = entry.submitted_data;
            const row = [
                entry.id,
                ...fields.map((f) => {
                    const val = data[f.name];
                    if (Array.isArray(val)) return escapeCSV(val.join(", "));
                    return escapeCSV(val ?? "");
                }),
                escapeCSV(new Date(entry.createdAt).toISOString().replace("T", " ").slice(0, 19)),
            ];
            csvRows.push(row.join(","));
        });

        const csvString = csvRows.join("\n");
        const filename = `audience_${form.id}_${Date.now()}.csv`;

        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.setHeader("Content-Type", "text/csv");
        res.send(csvString);
    } catch (error) {
        console.error("Error exporting CSV:", error);
        res.status(500).json({ message: "Internal server error." });
    }
};

// DELETE /api/admin/event-forms/:id/audience/:audienceId
const deleteAudience = async (req, res) => {
    try {
        const entry = await Audience.findOne({
            where: { id: req.params.audienceId, event_form_id: req.params.id },
        });
        if (!entry) return res.status(404).json({ message: "Audience entry not found." });

        await entry.destroy();
        res.status(200).json({ message: "Audience entry deleted successfully." });
    } catch (error) {
        console.error("Error deleting audience entry:", error);
        res.status(500).json({ message: "Internal server error." });
    }
};

// --- Helpers ---

function escapeCSV(value) {
    const str = String(value);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

function validateFields(fields) {
    const names = new Set();
    for (const field of fields) {
        if (!field.type) return "Each field must have a type.";
        if (!["text", "email", "dropdown", "checkbox", "radio"].includes(field.type)) {
            return `Invalid field type: ${field.type}`;
        }
        if (!field.label || !field.label.trim()) return "Each field must have a label.";
        if (!field.name || !field.name.trim()) return "Each field must have a name.";
        if (names.has(field.name)) return `Duplicate field name: ${field.name}`;
        names.add(field.name);
        if (["dropdown", "checkbox", "radio"].includes(field.type)) {
            if (!field.options || !Array.isArray(field.options) || field.options.length === 0) {
                return `Field "${field.label}" must have at least one option.`;
            }
            const opts = field.options.filter((o) => o && o.trim());
            if (opts.length !== field.options.length) return `Field "${field.label}" has empty options.`;
            if (new Set(opts).size !== opts.length) return `Field "${field.label}" has duplicate options.`;
        }
    }
    return null;
}

function validateSubmission(fields, submitted_data) {
    for (const field of fields) {
        const value = submitted_data[field.name];
        if (field.required && (value === undefined || value === null || value === "")) {
            return `Field "${field.label}" is required.`;
        }
        if (value === undefined || value === null || value === "") continue;

        if (field.type === "email") {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) return `"${field.label}" must be a valid email address.`;
        }

        if (field.type === "dropdown" || field.type === "radio") {
            if (!field.options.includes(value)) {
                return `Invalid value for "${field.label}".`;
            }
        }
        if (field.type === "checkbox") {
            if (!Array.isArray(value)) return `"${field.label}" must be an array.`;
            for (const v of value) {
                if (!field.options.includes(v)) return `Invalid option "${v}" for "${field.label}".`;
            }
        }
    }
    return null;
}

module.exports = {
    createEventForm,
    getAllEventForms,
    getEventFormById,
    updateEventForm,
    deleteEventForm,
    submitAudience,
    getAudienceByForm,
    exportAudienceCSV,
    deleteAudience,
};
