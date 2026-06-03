const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const BookTopic = require("./BookTopic");

const BookTopicStudentAccess = sequelize.define("BookTopicStudentAccess", {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    topic_id: { type: DataTypes.INTEGER, allowNull: false },
    student_id: { type: DataTypes.STRING(255), allowNull: false },
    unlocked_by: { type: DataTypes.STRING(255), allowNull: false },
}, {
    tableName: "book_topic_student_access",
    timestamps: true,
    indexes: [{ unique: true, fields: ["topic_id", "student_id"] }],
});

BookTopicStudentAccess.belongsTo(BookTopic, { foreignKey: "topic_id" });
BookTopic.hasMany(BookTopicStudentAccess, { foreignKey: "topic_id" });

module.exports = BookTopicStudentAccess;
