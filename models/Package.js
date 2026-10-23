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
    discountedFee: {
        type: DataTypes.DECIMAL(10,2),
        allowNull: false
    },
    regularFee: {
        type: DataTypes.DECIMAL(10,2),
        allowNull: false
    },
    installment: {
        type: DataTypes.JSON,
        allowNull: false
    },
    // Marks the recorded-course ("Self-Learning") package of a course. The package NAME is
    // free text; this flag is what makes the public card show a Self-Learning button.
    // At most one package per course has it (enforced in packageController).
    is_self_learning: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    }
}, {
    tableName: "packages",
    timestamps: true
});

module.exports = Package;
