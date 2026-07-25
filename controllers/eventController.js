const Event = require("../models/Event");

const getAllEvents = async (req, res) => {
  try {
    const events = await Event.findAll({
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json({
      count: events.length,
      events,
    });
  } catch (error) {
    console.error("❌ Error fetching events:", error);
    res.status(500).json({ message: "Error fetching events" });
  }
};

module.exports = {
  getAllEvents,
};
