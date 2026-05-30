const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const EventForm = sequelize.define("EventForm", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    title: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    short_description: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    event_date: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    fields_json: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
    },
    created_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    google_calendar_event_link: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: null,
    },
}, {
    tableName: "event_forms",
    timestamps: true,
});

module.exports = EventForm;
