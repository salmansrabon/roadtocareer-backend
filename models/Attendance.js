const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Student = require("./Student");

const Attendance = sequelize.define("Attendance", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    courseId: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
            model: Student,
            key: "CourseId"
        },
        onDelete: "CASCADE"
    },
    courseTitle: {
        type: DataTypes.STRING,
        allowNull: false
    },
    batch_no: {
        type: DataTypes.STRING,
        allowNull: false
    },
    StudentId: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
            model: Student,
            key: "StudentId"
        },
        onDelete: "CASCADE"
    },
    student_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    attendanceList: {
        type: DataTypes.JSON, // ✅ Stores JSON format
        defaultValue: [] // ✅ Default empty array
    }
}, {
    tableName: "attendance",
    timestamps: true
});

module.exports = Attendance;
