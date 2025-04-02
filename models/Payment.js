const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Course = require("./Course");
const Package = require("./Package");

const Payment = sequelize.define("Payment", {
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
    packageId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Package,
            key: "id"
        },
        onDelete: "CASCADE"
    },
    studentId: {
        type: DataTypes.STRING,
        allowNull: false
    },
    studentName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    installmentNumber: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    installmentAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    paidAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    dueAdjustmentType: {
        type: DataTypes.STRING,
        allowNull: true
    },
    dueAdjustmentAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    remainingBalance: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    month: {
        type: DataTypes.STRING,
        allowNull: false
    },
    remarks: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    paymentDateTime: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: "payments",
    timestamps: true
});

module.exports = Payment;
