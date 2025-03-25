const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Package = require("./Package");

const Module = sequelize.define("Module", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    courseId: {
        type: DataTypes.STRING,
        allowNull: false
    },
    packageId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Package,
            key: "id"
        },
        onDelete: "CASCADE"
    },
    module: {
        type: DataTypes.JSON, // ✅ Store as JSON
        allowNull: false
    }
}, {
    tableName: "modules",
    timestamps: true
});

module.exports = Module;
