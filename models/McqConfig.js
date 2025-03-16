const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const McqConfig = sequelize.define("McqConfig", {
    CourseId: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
            model: "courses",
            key: "courseId"
        },
        onDelete: "CASCADE"
    },
    quiz_title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    quiz_description: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    totalQuestion: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    totalTime: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    start_datetime: {
        type: DataTypes.DATE,
        allowNull: false
    },
    end_datetime: {
        type: DataTypes.DATE,
        allowNull: false
    }
}, {
    tableName: "mcq_config",
    timestamps: true
});

module.exports = McqConfig;
