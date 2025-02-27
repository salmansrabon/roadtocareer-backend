const { DataTypes } = require("sequelize");
const sequelize = require("../config/db"); // Import Sequelize instance

const User = sequelize.define("User", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false
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
    }
}, {
    tableName: "users", // Ensure it matches your database table
    timestamps: false   // Disable createdAt & updatedAt if they don't exist in DB
});

module.exports = User;
