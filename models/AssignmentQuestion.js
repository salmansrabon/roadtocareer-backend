const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AssignmentQuestion = sequelize.define('AssignmentQuestion', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    batch_no: {
        type: DataTypes.STRING,
        allowNull: false
    },
    topic_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    Assignment_Title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    courseId: {
        type: DataTypes.STRING,
        allowNull: true
    },
    Description: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    SubmissionDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    TotalScore: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    createDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    updateDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'assignment_questions',
    timestamps: false
});

module.exports = AssignmentQuestion;
