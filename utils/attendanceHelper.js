const moment = require("moment-timezone");

/**
 * Parse attendance list safely from various formats
 * @param {string|array} rawList - Raw attendance list data
 * @returns {array} - Parsed attendance list array
 */
const parseAttendanceList = (rawList) => {
    let parsedList = [];

    try {
        if (typeof rawList === "string") {
            parsedList = JSON.parse(rawList);

            // Handle double-stringified edge case
            if (typeof parsedList === "string") {
                parsedList = JSON.parse(parsedList);
            }
        } else if (Array.isArray(rawList)) {
            parsedList = rawList;
        }

        if (!Array.isArray(parsedList)) {
            parsedList = [];
        }
    } catch (err) {
        console.warn("⚠️ Failed to parse attendanceList:", err.message);
        parsedList = [];
    }

    return parsedList;
};

/**
 * Calculate attendance percentage based on total clicks
 * @param {number} totalClicks - Total number of attendance entries
 * @param {number} maxClicks - Maximum expected clicks (default: 30)
 * @returns {object} - Object containing totalClicks and attendancePercentage
 */
const calculateAttendancePercentage = (totalClicks, maxClicks = 30) => {
    const percentage = ((totalClicks / maxClicks) * 100).toFixed(2);
    
    return {
        totalClicks,
        attendancePercentage: `${percentage}%`
    };
};

/**
 * Determine whether a reference date falls on one of a course's scheduled class days.
 * Mirrors the class-day check inside markAttendance (studentController.js).
 * @param {string|array} classDays - Raw course.class_days value (array, JSON string, or malformed)
 * @param {moment.Moment} referenceMoment - A moment-timezone instance representing "today"
 * @returns {boolean}
 */
const isTodayAClassDay = (classDays, referenceMoment) => {
    let allowedClassDays = classDays;

    if (typeof allowedClassDays === "string") {
        try {
            allowedClassDays = JSON.parse(allowedClassDays);
        } catch {
            allowedClassDays = [];
        }
    }

    if (!Array.isArray(allowedClassDays)) {
        allowedClassDays = [];
    }

    const todayDayName = referenceMoment.format("dddd");
    return allowedClassDays.includes(todayDayName);
};

/**
 * Determine whether any attendance entry falls on the same local calendar date as the reference date.
 * Mirrors the duplicate-attendance date parsing inside markAttendance (studentController.js).
 * @param {string|array} rawAttendanceList - Raw Attendance.attendanceList value
 * @param {moment.Moment} referenceMoment - A moment-timezone instance representing "today"
 * @returns {boolean}
 */
const hasAttendedOnDate = (rawAttendanceList, referenceMoment) => {
    const entries = parseAttendanceList(rawAttendanceList);
    const targetDateStr = referenceMoment.format("YYYY-MM-DD");

    return entries.some((entry) => {
        if (!entry || !entry.time) return false;
        const entryLocal = moment.tz(
            entry.time,
            "DD-MM-YYYY hh:mm:ss A",
            entry.timezone || "Asia/Dhaka"
        );
        return entryLocal.isValid() && entryLocal.format("YYYY-MM-DD") === targetDateStr;
    });
};

/**
 * Find the most recent scheduled class day strictly before the reference date.
 * Walks backward day-by-day (bounded by lookbackDays) since class_days may skip
 * several calendar days (e.g. a Mon/Wed/Fri schedule).
 * @param {string|array} classDays - Raw course.class_days value (array, JSON string, or malformed)
 * @param {moment.Moment} referenceMoment - A moment-timezone instance representing "today"
 * @param {number} lookbackDays - How many days back to search before giving up (default 14)
 * @returns {moment.Moment|null} - The previous class day, or null if none found within the window
 */
const getPreviousClassDay = (classDays, referenceMoment, lookbackDays = 14) => {
    for (let i = 1; i <= lookbackDays; i++) {
        const candidate = referenceMoment.clone().subtract(i, "days");
        if (isTodayAClassDay(classDays, candidate)) {
            return candidate;
        }
    }
    return null;
};

/**
 * Normalizes any stored attendanceList shape (null / legacy flat array / new per-batch
 * object) into a { [courseId]: [entries] } object. A legacy flat array is assumed to
 * belong to `rowCourseId` — the only courseId that array could ever have been recorded under.
 * @param {string|array|object} rawList - Raw Attendance.attendanceList value
 * @param {string} rowCourseId - The Attendance row's own courseId column
 * @returns {object} - { [courseId]: [entries] }
 */
const parseAttendanceByBatch = (rawList, rowCourseId) => {
    let parsed;

    try {
        parsed = typeof rawList === "string" ? JSON.parse(rawList) : rawList;
        if (typeof parsed === "string") {
            parsed = JSON.parse(parsed); // Handle double-stringified edge case
        }
    } catch (err) {
        console.warn("⚠️ Failed to parse attendanceList by batch:", err.message);
        return {};
    }

    if (Array.isArray(parsed)) {
        return rowCourseId ? { [rowCourseId]: parsed } : {};
    }

    return parsed && typeof parsed === "object" ? parsed : {};
};

/**
 * Get the attendance entries recorded for one batch.
 * `rowCourseId` and `targetCourseId` are distinct on purpose: the first only decides which
 * batch a legacy (unkeyed) array is attributed to, the second is the batch being read.
 * @param {string|array|object} rawList - Raw Attendance.attendanceList value
 * @param {string} rowCourseId - The Attendance row's own courseId column
 * @param {string} targetCourseId - The batch/course to read
 * @returns {array}
 */
const getBatchEntries = (rawList, rowCourseId, targetCourseId) => {
    const byBatch = parseAttendanceByBatch(rawList, rowCourseId);
    return Array.isArray(byBatch[targetCourseId]) ? byBatch[targetCourseId] : [];
};

/**
 * Set the attendance entries for one batch, preserving every other batch's entries
 * already stored in the JSON blob.
 * @param {string|array|object} rawList - Raw Attendance.attendanceList value (before this write)
 * @param {string} rowCourseId - The Attendance row's own courseId column
 * @param {string} targetCourseId - The batch/course being written
 * @param {array} newEntries - The full updated entries array for that batch
 * @returns {string} - JSON-stringified { [courseId]: [entries] } object
 */
const setBatchEntries = (rawList, rowCourseId, targetCourseId, newEntries) => {
    const byBatch = parseAttendanceByBatch(rawList, rowCourseId);
    byBatch[targetCourseId] = newEntries;
    return JSON.stringify(byBatch);
};

module.exports = {
    parseAttendanceList,
    calculateAttendancePercentage,
    isTodayAClassDay,
    hasAttendedOnDate,
    getPreviousClassDay,
    parseAttendanceByBatch,
    getBatchEntries,
    setBatchEntries
};
