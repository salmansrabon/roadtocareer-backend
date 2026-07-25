const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Event = sequelize.define("Event", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    event_title: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    event_description: {
        type: DataTypes.JSON,
        allowNull: true
    }
}, {
    tableName: "events",
    timestamps: true
});

module.exports = Event;
