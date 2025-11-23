const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Course = require("./Course");

const ExamQuestion = sequelize.define("ExamQuestion", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    courseId: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
            model: Course,
            key: "courseId"
        }
    },
    questions: {
        type: DataTypes.JSON,
        allowNull: false,
        comment: 'Array of {question, hint, score} objects'
    }
}, {
    tableName: "exam_question",
    timestamps: true
});

// Define Relationships
Course.hasMany(ExamQuestion, { foreignKey: "courseId", onDelete: "CASCADE" });
ExamQuestion.belongsTo(Course, { foreignKey: "courseId" });

module.exports = ExamQuestion;
