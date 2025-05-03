const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const AssignmentQuestion = require('./AssignmentQuestion');
const Student = require('./Student');

const AssignmentAnswer = sequelize.define('AssignmentAnswer', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    AssignmentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: AssignmentQuestion,
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    StudentId:{
        type: DataTypes.STRING,
        allowNull: false
    },
    Submission_Url: {
        type: DataTypes.STRING,
        allowNull: false
    },
    Comments: {
        type: DataTypes.JSON, // ✅ Storing comments as an array
        allowNull: true
    },
    Score: {
        type: DataTypes.INTEGER,
        allowNull: true
    },

}, {
    tableName: 'assignment_answers',
    timestamps: true
});

// ✅ Associations
AssignmentAnswer.belongsTo(AssignmentQuestion, {
    foreignKey: 'AssignmentId',
    as: 'Assignment'
});

AssignmentAnswer.belongsTo(Student, {
    foreignKey: 'StudentId',
    targetKey: 'StudentId', // important because Student's PK is not 'id'
    as: 'Student'
});

module.exports = AssignmentAnswer;
