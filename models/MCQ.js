const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Course = require("./Course");

const MCQ = sequelize.define("MCQ", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    CourseId: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
            model: Course,
            key: "courseId"
        },
        onDelete: "CASCADE"
    },
    mcq_question: {
        type: DataTypes.JSON, // ✅ Store MCQs in JSON format
        allowNull: false
    }
}, {
    tableName: "mcq_questions",
    timestamps: true
});

module.exports = MCQ;
