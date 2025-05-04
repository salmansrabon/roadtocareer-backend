const { DataTypes } = require("sequelize");
const sequelize = require("../config/db"); // Import Sequelize instance

const User = sequelize.define("User", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    role: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "student"
    },
    isValid: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 0
    },
    resetToken: {
        type: DataTypes.STRING,
        allowNull: true
    },
    resetTokenExpires: {
        type: DataTypes.DATE,
        allowNull: true
    },
}, {
    tableName: "users",
    timestamps: false
});

module.exports = User;
