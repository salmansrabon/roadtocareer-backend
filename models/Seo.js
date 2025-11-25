const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Seo = sequelize.define("Seo", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    page_route: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true
    },
    page_title: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    meta_description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    meta_keywords: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    og_title: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    og_description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    og_image: {
        type: DataTypes.STRING(500),
        allowNull: true
    },
    twitter_title: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    twitter_description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    twitter_image: {
        type: DataTypes.STRING(500),
        allowNull: true
    },
    canonical_url: {
        type: DataTypes.STRING(500),
        allowNull: true
    },
    robots: {
        type: DataTypes.STRING(100),
        defaultValue: 'index, follow'
    },
    author: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    language: {
        type: DataTypes.STRING(10),
        defaultValue: 'en'
    },
    geo_region: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    geo_placename: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    geo_position: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    schema_type: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    schema_data: {
        type: DataTypes.JSON,
        allowNull: true
    },
    priority: {
        type: DataTypes.DECIMAL(2, 1),
        defaultValue: 0.5
    },
    change_frequency: {
        type: DataTypes.STRING(20),
        defaultValue: 'monthly'
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: "seo",
    timestamps: true // Includes createdAt & updatedAt
});

module.exports = Seo;
