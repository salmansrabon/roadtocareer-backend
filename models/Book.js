const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Book = sequelize.define("Book", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    title: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    slug: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: null,
    },
    cover_image: {
        type: DataTypes.STRING(500),
        allowNull: true,
        defaultValue: null,
    },
    status: {
        type: DataTypes.ENUM("draft", "published"),
        allowNull: false,
        defaultValue: "draft",
    },
    sort_order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
}, {
    tableName: "books",
    timestamps: true,
});

const BookChapter = require("./BookChapter");
Book.hasMany(BookChapter, { foreignKey: "book_id", onDelete: "CASCADE" });
BookChapter.belongsTo(Book, { foreignKey: "book_id" });

module.exports = Book;
