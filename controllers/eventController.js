const Event = require("../models/Event");

// page/limit + totalEvents/totalPages/currentPage matches the convention
// already used by studentController's paginated endpoints (getAllStudents,
// getQaTalent, getAllAttendance, etc).
const getAllEvents = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNumber = parseInt(page) || 1;
    const limitNumber = parseInt(limit) || 10;
    const offset = (pageNumber - 1) * limitNumber;

    const { count, rows } = await Event.findAndCountAll({
      order: [["createdAt", "DESC"]],
      limit: limitNumber,
      offset,
    });

    res.status(200).json({
      totalEvents: count,
      totalPages: Math.ceil(count / limitNumber),
      currentPage: pageNumber,
      events: rows,
    });
  } catch (error) {
    console.error("❌ Error fetching events:", error);
    res.status(500).json({ message: "Error fetching events" });
  }
};

module.exports = {
  getAllEvents,
};
