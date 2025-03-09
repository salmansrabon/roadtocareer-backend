const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Team = sequelize.define("Team", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    company: {
        type: DataTypes.STRING,
        allowNull: true
    },
    designation: {
        type: DataTypes.STRING,
        allowNull: true
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: { isEmail: true }
    },
    whatsapp: {
        type: DataTypes.STRING,
        allowNull: true
    },
    linkedin: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: { isUrl: true }
    },
    about: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    photo: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: "teams",
    timestamps: true
});

module.exports = Team;
