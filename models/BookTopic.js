const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const BookTopic = sequelize.define("BookTopic", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    chapter_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    title: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    content: {
        type: DataTypes.TEXT("long"),
        allowNull: true,
        defaultValue: null,
    },
    sort_order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    status: {
        type: DataTypes.ENUM("draft", "published"),
        allowNull: false,
        defaultValue: "draft",
    },
}, {
    tableName: "book_topics",
    timestamps: true,
});

const BookTopicBatchAccess = require("./BookTopicBatchAccess");
BookTopic.hasMany(BookTopicBatchAccess, { foreignKey: "topic_id", onDelete: "CASCADE" });
BookTopicBatchAccess.belongsTo(BookTopic, { foreignKey: "topic_id" });

module.exports = BookTopic;
