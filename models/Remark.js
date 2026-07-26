const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Student = require("./Student");

const Remark = sequelize.define("Remark", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    studentId: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
            model: Student,
            key: "StudentId"
        },
        onDelete: "CASCADE"
    },
    remark: {
        type: DataTypes.JSON,
        allowNull: false,
        comment: "Array of remark entries: [{text, date}]"
    }
}, {
    tableName: "remarks",
    timestamps: true
});

Student.hasOne(Remark, { foreignKey: "studentId", sourceKey: "StudentId" });
Remark.belongsTo(Student, { foreignKey: "studentId", targetKey: "StudentId" });

module.exports = Remark;
