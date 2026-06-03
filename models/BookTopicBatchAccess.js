const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const BookTopicBatchAccess = sequelize.define("BookTopicBatchAccess", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    topic_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
    },
    course_ids: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
    },
    unlocked_by: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
}, {
    tableName: "book_topic_batch_access",
    timestamps: true, // createdAt + updatedAt
});

module.exports = BookTopicBatchAccess;
