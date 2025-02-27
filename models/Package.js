const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Course = require("./Course"); 

const Package = sequelize.define("Package", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    courseId: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
            model: Course,
            key: "courseId"
        },
        onDelete: "CASCADE"
    },
    packageName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    studentFee: {
        type: DataTypes.DECIMAL(10,2),
        allowNull: false
    },
    jobholderFee: {
        type: DataTypes.DECIMAL(10,2),
        allowNull: false
    },
    installment: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
}, {
    tableName: "packages",
    timestamps: true
});

module.exports = Package;
