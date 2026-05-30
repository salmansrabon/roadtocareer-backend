const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const EventForm = require("./EventForm");

const Audience = sequelize.define("Audience", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    event_form_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: EventForm,
            key: "id",
        },
    },
    submitted_data: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {},
    },
}, {
    tableName: "audience",
    timestamps: true,
});

EventForm.hasMany(Audience, { foreignKey: "event_form_id" });
Audience.belongsTo(EventForm, { foreignKey: "event_form_id" });

module.exports = Audience;
