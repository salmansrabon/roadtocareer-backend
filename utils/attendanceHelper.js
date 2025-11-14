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

module.exports = {
    parseAttendanceList,
    calculateAttendancePercentage
};
