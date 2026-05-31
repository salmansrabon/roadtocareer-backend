const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const BookChapter = sequelize.define("BookChapter", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    book_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    title: {
        type: DataTypes.STRING(255),
        allowNull: false,
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
    tableName: "book_chapters",
    timestamps: true,
});

const BookTopic = require("./BookTopic");
BookChapter.hasMany(BookTopic, { foreignKey: "chapter_id", onDelete: "CASCADE" });
BookTopic.belongsTo(BookChapter, { foreignKey: "chapter_id" });

module.exports = BookChapter;
