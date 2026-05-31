const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Course = require("./Course");

const BookTopicBatchAccess = sequelize.define("BookTopicBatchAccess", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    topic_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    course_id: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    unlocked_by: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
}, {
    tableName: "book_topic_batch_access",
    timestamps: true,
    updatedAt: false,
});

BookTopicBatchAccess.belongsTo(Course, { foreignKey: "course_id", targetKey: "courseId" });

module.exports = BookTopicBatchAccess;
