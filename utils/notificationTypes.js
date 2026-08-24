// Central registry of in-app notification types (SRS 24).
//
// `notifications.type` is a plain VARCHAR, so adding a type here requires NO
// database migration and NO frontend change -- the frontend renders title/body
// verbatim and falls back to a default icon for any type it doesn't recognise.

// notify() warns when it is handed a type that isn't listed here, since nothing
// at the DB level catches a typo in a free-form VARCHAR.
const NOTIFICATION_TYPES = Object.freeze({
        // → every student in a batch/course (fan-out; see notifyStudentsOfCourse)
    ASSIGNMENT_POSTED: "assignment_posted",
    // → admins/teachers
    ASSIGNMENT_SUBMITTED: "assignment_submitted",
    // → a single student
    ASSIGNMENT_REVIEWED: "assignment_reviewed",
    PAYMENT_RECORDED: "payment_recorded",
    CERTIFICATE_READY: "certificate_ready",

    EBOOK_ACCESS_GRANTED: "ebook_access_granted",

    // → students flagged absent (one per student, mirrors their reminder email)
    ATTENDANCE_ABSENT: "attendance_absent",
    // → admins only: the daily roll-up, mirroring the CSV summary email.
    // One row per admin, NOT one per absent student.
    ATTENDANCE_ABSENT_SUMMARY: "attendance_absent_summary",

    // → students under the profile-score threshold (one per student, personalised
    // with their own score; mirrors their weekly reminder email)
    PROFILE_INCOMPLETE: "profile_incomplete",
    // → admins only: the weekly roll-up, mirroring the CSV summary email.
    PROFILE_INCOMPLETE_SUMMARY: "profile_incomplete_summary",

    // Future types drop in here with no migration, e.g.:
    // EXAM_GRADED: "exam_graded",
});

// Entity types, used for dedupe/suppression lookups and deep-linking.
const ENTITY_TYPES = Object.freeze({
    ASSIGNMENT_ANSWER: "assignment_answer",
    ASSIGNMENT_QUESTION: "assignment_question",
    PAYMENT: "payment",
    CERTIFICATE: "certificate",
    BOOK_TOPIC: "book_topic",
    ATTENDANCE: "attendance",
    PROFILE: "profile",
});

module.exports = { NOTIFICATION_TYPES, ENTITY_TYPES };
