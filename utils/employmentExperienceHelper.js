// Mirrors the date-math in frontend/pages/profile/index.js (TASK-34) — keep both in sync if either changes.
// The frontend recalculates live on every render, but that only reaches the DB when the student
// hits Save. This helper lets a scheduled job (see backend/cron/experienceRecalcJob.js) refresh
// stored `employment` values for students who haven't logged in, so admin/qa-talent pages don't
// show experience frozen at whatever it was on the student's last save.

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

// `employment` is unvalidated JSON — nothing stops a direct API/DB write from putting garbage in
// fromMonth/fromYear/toMonth/toYear. Number("garbage") is NaN, and NaN silently poisons any sum or
// string it touches (e.g. a single bad record turned totalExperience into "NaN.NaN" for the whole
// student). Parsing to a real, range-checked {month, year} here is what stops that at the source.
const parseMonthYear = (month, year) => {
    const m = Number(month);
    const y = Number(year);
    if (!Number.isInteger(m) || m < 1 || m > 12) return null;
    if (!Number.isInteger(y) || y < 1900 || y > 9999) return null;
    return { month: m, year: y };
};

const monthsBetween = (from, to) => (to.year - from.year) * 12 + (to.month - from.month);

const formatDuration = (totalMonths) => {
    const months = Math.max(0, totalMonths);
    const years = Math.floor(months / 12);
    const remMonths = months % 12;
    if (years === 0 && remMonths === 0) return "0 Months";
    const parts = [];
    if (years > 0) parts.push(`${years} Year${years === 1 ? "" : "s"}`);
    if (remMonths > 0) parts.push(`${remMonths} Month${remMonths === 1 ? "" : "s"}`);
    return parts.join(" ");
};

const hasDateFields = (entry) =>
    Boolean(entry?.fromMonth) && Boolean(entry?.fromYear) &&
    (entry?.currentlyWorking === true || (Boolean(entry?.toMonth) && Boolean(entry?.toYear)));

// Three outcomes, each handled differently by the caller:
//  - no date fields at all (legacy pre-TASK-34 record) -> months: null, invalid: false -> silently excluded
//  - date fields present but unparseable/out-of-range (corrupted) -> months: null, invalid: true -> excluded + flagged
//  - valid -> months: <number>
const getRecordExperienceMonths = (entry, now) => {
    if (!hasDateFields(entry)) return { months: null, invalid: false };

    const from = parseMonthYear(entry.fromMonth, entry.fromYear);
    if (!from) return { months: null, invalid: true };

    const to = entry.currentlyWorking === true
        ? { month: now.getMonth() + 1, year: now.getFullYear() }
        : parseMonthYear(entry.toMonth, entry.toYear);
    if (!to) return { months: null, invalid: true };

    const totalMonths = monthsBetween(from, to);
    if (!Number.isFinite(totalMonths) || totalMonths < 0) return { months: null, invalid: true };
    return { months: totalMonths, invalid: false };
};

const getRecordDurationLabel = (entry) => {
    const from = `${MONTH_NAMES[Number(entry.fromMonth) - 1]} ${entry.fromYear}`;
    if (entry.currentlyWorking === true) return `${from} - Present`;
    return `${from} - ${MONTH_NAMES[Number(entry.toMonth) - 1]} ${entry.toYear}`;
};

// Stored as years + months/10 (e.g. 4.6 = 4y6m) so qa-talent/portfolio, which parse
// employment.totalExperience with base-10 decimal math, keep displaying it correctly.
const toLegacyTotalExperienceValue = (totalMonths) => {
    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;
    if (months >= 10) return String(years + 1);
    if (months === 0) return String(years);
    return `${years}.${months}`;
};

// Returns { employment, invalidRecordCount }. `employment` is a refreshed copy (every complete
// record's experience/employmentDuration and the overall totalExperience recomputed against `now`),
// or null if nothing would change — so callers can skip the write instead of bumping updatedAt for
// no reason. A record with corrupted or unparseable dates is left byte-for-byte untouched and
// excluded from totalExperience — it never contributes to, or corrupts, any other record's result.
function recalculateEmployment(employment, now = new Date()) {
    if (!employment || !Array.isArray(employment.company)) {
        return { employment: null, invalidRecordCount: 0 };
    }

    let totalMonths = 0;
    let changed = false;
    let invalidRecordCount = 0;

    const company = employment.company.map((entry) => {
        try {
            const { months, invalid } = getRecordExperienceMonths(entry, now);
            if (invalid) invalidRecordCount++;
            if (months === null) return entry;

            totalMonths += months;
            const experience = formatDuration(months);
            const employmentDuration = getRecordDurationLabel(entry);
            if (entry.experience !== experience || entry.employmentDuration !== employmentDuration) {
                changed = true;
            }
            return { ...entry, experience, employmentDuration };
        } catch {
            // Never let one malformed record take down the rest of this student's employment history.
            invalidRecordCount++;
            return entry;
        }
    });

    const totalExperience = toLegacyTotalExperienceValue(totalMonths);
    if (totalExperience !== (employment.totalExperience || "")) changed = true;

    return {
        employment: changed ? { ...employment, totalExperience, company } : null,
        invalidRecordCount
    };
}

module.exports = { recalculateEmployment };
