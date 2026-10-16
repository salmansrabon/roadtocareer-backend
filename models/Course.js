const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Package = require("./Package");

const Course = sequelize.define("Course", {
    courseId: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        primaryKey: true
    },
    batch_no: {
        type: DataTypes.STRING,
        allowNull: false
    },
    course_title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    course_initial: {
        type: DataTypes.STRING,
        allowNull: false
    },
    drive_folder_id: {
        type: DataTypes.STRING,
        allowNull: false
    },
    short_description: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    is_enabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    is_latest: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    // Admin start/stop switch (course config page). false => the attendance
    // reminder cron skips this course even when is_latest is true. Defaults to
    // stopped because new courses are never is_latest; the migration backfills
    // existing rows to match is_latest.
    attendance_tracking: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    enrollment: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    enrollment_start_date: {
        type: DataTypes.DATEONLY, // ✅ Ensures only date (YYYY-MM-DD)
        allowNull: false
    },
    enrollment_end_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    orientation_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    class_start_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    class_days: {
        type: DataTypes.JSON, // ✅ Store class days as an array
        allowNull: false
    },
    class_time: {
        type: DataTypes.TIME, // ✅ Ensures HH:MM:SS format
        allowNull: false
    },
    course_image: {
        type: DataTypes.STRING,
        allowNull: false
    },
    total_class: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 30
    },
    // Optional instructor details shown at the top of the public course card.
    instructor_name: {
        type: DataTypes.STRING,
        allowNull: true
    },
    instructor_designation: {
        type: DataTypes.STRING,
        allowNull: true
    },
    instructor_company: {
        type: DataTypes.STRING,
        allowNull: true
    },
    instructor_bio: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    instructor_photo: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: "courses",
    timestamps: true
});

// ✅ Define Relationship (One Course has Many Packages)
Course.hasMany(Package, { foreignKey: "courseId", onDelete: "CASCADE" });
Package.belongsTo(Course, { foreignKey: "courseId" });

module.exports = Course;
