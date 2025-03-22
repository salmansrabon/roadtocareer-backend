const { DataTypes } = require("sequelize");
const sequelize = require("../config/db"); // Import Sequelize instance
const User = require("./User");
const Course = require("./Course");
const Package = require("./Package");

const Student = sequelize.define("Student", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    StudentId: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
            model: User,
            key: "username"
        }
    },
    CourseId: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
            model: Course,
            key: "courseId"
        }
    },
    package: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
            model: Package,
            key: "packageName"
        }
    },
    batch_no: {
        type: DataTypes.STRING,
        allowNull: false
    },
    courseTitle: {
        type: DataTypes.STRING,
        allowNull: false
    },
    salutation: {
        type: DataTypes.ENUM("Mr", "Mrs"),
        defaultValue: "Mr"
    },
    student_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    university: {
        type: DataTypes.STRING,
        allowNull: false
    },
    profession: {
        type: DataTypes.STRING
    },
    passingYear: {
        type: DataTypes.STRING
    },
    experience: {
        type: DataTypes.STRING
    },
    company: {
        type: DataTypes.STRING
    },
    designation: {
        type: DataTypes.STRING
    },
    address: {
        type: DataTypes.TEXT
    },
    mobile: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
            model: User,
            key: "email"
        }
    },
    certificate: {
        type: DataTypes.STRING,
        allowNull: true
    },
    isEnrolled: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    facebook: {
        type: DataTypes.STRING
    },
    whatsapp: {
        type: DataTypes.STRING
    },
    linkedin: {
        type: DataTypes.STRING
    },
    github: {
        type: DataTypes.STRING
    },
    knowMe: {
        type: DataTypes.TEXT
    },
    opinion: {
        type: DataTypes.TEXT
    },
    google_access_id: {
        type: DataTypes.STRING
    },
    remark: {
        type: DataTypes.TEXT
    },
    due: {
        type: DataTypes.INTEGER
    },
    quiz_answer: {
        type: DataTypes.JSON
    }
}, {
    tableName: "students",
    timestamps: true // ✅ Includes createdAt & updatedAt
});

// ✅ Define Relationships
User.hasMany(Student, { foreignKey: "StudentId" });
Student.belongsTo(User, { foreignKey: "StudentId" });

Course.hasMany(Student, { foreignKey: "CourseId" });
Student.belongsTo(Course, { foreignKey: "CourseId" });

Package.hasMany(Student, { foreignKey: "package" });
Student.belongsTo(Package, { foreignKey: "package" });

module.exports = Student;
