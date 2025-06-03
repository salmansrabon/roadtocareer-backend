const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Job = sequelize.define("Job", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    companyName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    positionName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    workType: {
        type: DataTypes.ENUM('Remote', 'Hybrid', 'Offline'),
        allowNull: false
    },
    experience: {
        type: DataTypes.STRING,
        allowNull: false
    },
    salary: {
        type: DataTypes.STRING,
        allowNull: true
    },
    level: {
        type: DataTypes.ENUM('Entry', 'Mid', 'Senior', 'Lead'),
        allowNull: false
    },
    companyLocation: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    deadline: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW // Default to current date if not provided
    }
}, {
    tableName: "jobs",
    timestamps: true
});

module.exports = Job;
