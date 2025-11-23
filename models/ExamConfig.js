const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Course = require("./Course");

const ExamConfig = sequelize.define("ExamConfig", {
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
    exam_title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    exam_description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    totalQuestion: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    start_datetime: {
        type: DataTypes.DATE,
        allowNull: false
    },
    end_datetime: {
        type: DataTypes.DATE,
        allowNull: false
    },
    totalTime: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Exam duration in minutes'
    }
}, {
    tableName: "exam_config",
    timestamps: true
});

// Define Relationships
Course.hasMany(ExamConfig, { foreignKey: "courseId", onDelete: "CASCADE" });
ExamConfig.belongsTo(Course, { foreignKey: "courseId" });

module.exports = ExamConfig;
