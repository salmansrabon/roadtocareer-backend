const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const StudentResume = sequelize.define("StudentResume", {
    studentId: {
        type: DataTypes.STRING(100),
        primaryKey: true,
        allowNull: false
    },
    fullName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false
    },
    phoneNumber: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    linkedin: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    github: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    jobStatus: {
        type: DataTypes.ENUM("Employed", "Unemployed", "Looking"),
        allowNull: false
    },
    jobHistory: {
        type: DataTypes.TEXT("long"),
        allowNull: true,
        get() {
            const raw = this.getDataValue("jobHistory");
            if (!raw) return [];
            try {
                return typeof raw === "string" ? JSON.parse(raw) : raw;
            } catch (e) {
                return [];
            }
        },
        set(value) {
            this.setDataValue("jobHistory", JSON.stringify(value));
        }
    },
    skillSet: {
        type: DataTypes.TEXT("long"),
        allowNull: true,
        get() {
            const raw = this.getDataValue("skillSet");
            if (!raw) return [];
            try {
                return typeof raw === "string" ? JSON.parse(raw) : raw;
            } catch (e) {
                return [];
            }
        },
        set(value) {
            this.setDataValue("skillSet", JSON.stringify(value));
        }
    },
    personalProjects: {
        type: DataTypes.TEXT("long"),
        allowNull: true,
        get() {
            const raw = this.getDataValue("personalProjects");
            if (!raw) return [];
            try {
                return typeof raw === "string" ? JSON.parse(raw) : raw;
            } catch (e) {
                return [];
            }
        }
        ,
        set(value) {
            this.setDataValue("personalProjects", JSON.stringify(value));
        }
    },
    academicInfo: {
        type: DataTypes.TEXT("long"),
        allowNull: true,
        get() {
            const raw = this.getDataValue("academicInfo");
            if (!raw) return [];
            try {
                return typeof raw === "string" ? JSON.parse(raw) : raw;
            } catch (e) {
                return [];
            }
        }
        ,
        set(value) {
            this.setDataValue("academicInfo", JSON.stringify(value));
        }
    },
    trainingInfo: {
        type: DataTypes.TEXT("long"),
        allowNull: true,
        get() {
            const raw = this.getDataValue("trainingInfo");
            if (!raw) return [];
            try {
                return typeof raw === "string" ? JSON.parse(raw) : raw;
            } catch (e) {
                return [];
            }
        }
        ,
        set(value) {
            this.setDataValue("trainingInfo", JSON.stringify(value));
        }
    },
    primarySkill: {
        type: DataTypes.TEXT("long"),
        allowNull: true,
        get() {
            const raw = this.getDataValue("primarySkill");
            return raw ? raw.split(",") : [];
        },
        set(value) {
            this.setDataValue("primarySkill", Array.isArray(value) ? value.join(",") : value);
        }
    },
    secondarySkill: {
        type: DataTypes.TEXT("long"),
        allowNull: true,
        get() {
            const raw = this.getDataValue("secondarySkill");
            return raw ? raw.split(",") : [];
        },
        set(value) {
            this.setDataValue("secondarySkill", Array.isArray(value) ? value.join(",") : value);
        }
    },

    resumeFile: {
        type: DataTypes.STRING,
        allowNull: true
    },
    photo: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: "student_resumes",
    timestamps: true
});

module.exports = StudentResume;
