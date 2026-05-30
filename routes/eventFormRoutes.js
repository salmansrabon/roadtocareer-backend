const express = require("express");
const router = express.Router();
const {
    createEventForm,
    getAllEventForms,
    getEventFormById,
    updateEventForm,
    deleteEventForm,
    submitAudience,
    getAudienceByForm,
    exportAudienceCSV,
} = require("../controllers/eventFormController");
const { authenticateUser, requireAdmin } = require("../middlewares/authMiddleware");

// Admin-only: form CRUD
router.post("/admin/event-forms", authenticateUser, requireAdmin, createEventForm);
router.get("/admin/event-forms", authenticateUser, requireAdmin, getAllEventForms);
router.get("/admin/event-forms/:id", authenticateUser, requireAdmin, getEventFormById);
router.put("/admin/event-forms/:id", authenticateUser, requireAdmin, updateEventForm);
router.delete("/admin/event-forms/:id", authenticateUser, requireAdmin, deleteEventForm);

// Admin-only: audience management
router.get("/admin/event-forms/:id/audience", authenticateUser, requireAdmin, getAudienceByForm);
router.get("/admin/event-forms/:id/audience/export-csv", authenticateUser, requireAdmin, exportAudienceCSV);

// Public: audience submission and form view
router.post("/event-forms/:id/submit", submitAudience);
router.get("/event-forms/:id", getEventFormById);

module.exports = router;
