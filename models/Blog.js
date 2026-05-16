const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Blog = sequelize.define("Blog", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    title: {
        type: DataTypes.STRING(500),
        allowNull: false,
    },
    slug: {
        type: DataTypes.STRING(500),
        allowNull: false,
        unique: true,
    },
    excerpt: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    content: {
        type: DataTypes.TEXT("long"),
        allowNull: false,
    },
    coverImage: {
        type: DataTypes.STRING(1000),
        allowNull: true,
        defaultValue: null,
    },
    author: {
        type: DataTypes.STRING(255),
        allowNull: false,
        defaultValue: "Admin",
    },
    status: {
        type: DataTypes.ENUM("draft", "published"),
        allowNull: false,
        defaultValue: "draft",
    },
    publishedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
    },
}, {
    tableName: "blogs",
    timestamps: true,
});

module.exports = Blog;
