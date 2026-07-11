const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const JobView = sequelize.define("JobView", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    jobId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    ipAddress: {
        type: DataTypes.STRING(45),
        allowNull: false
    }
}, {
    tableName: "job_views",
    updatedAt: false
});

module.exports = JobView;
