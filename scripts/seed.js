const Course = require("../models/Course");
const Package = require("../models/Package");
const Module = require("../models/Module");
const User = require("../models/User");
const Student = require("../models/Student");

async function seedCourse(courseData) {
    const existing = await Course.findOne({ where: { courseId: courseData.courseId } });

    if (existing) {
        console.log(`✅ Course "${courseData.courseId}" already exists.`);
    } else {
        await Course.create(courseData);
        console.log(`✅ Course "${courseData.courseId}" seeded.`);
    }
}

async function seedPackage(packageData) {
    const existing = await Package.findOne({
        where: {
            courseId: packageData.courseId,
            packageName: packageData.packageName,
        },
    });

    if (existing) {
        console.log(`✅ Package "${packageData.packageName}" already exists for course ${packageData.courseId}.`);
        return existing.id;
    } else {
        const created = await Package.create(packageData);
        console.log(`✅ Package "${packageData.packageName}" seeded.`);
        return created.id;
    }
}

async function seedModule(moduleData) {
    const existing = await Module.findOne({
        where: {
            courseId: moduleData.courseId,
            packageId: moduleData.packageId,
        },
    });

    if (existing) {
        console.log(`✅ Module already exists for courseId: ${moduleData.courseId}`);
    } else {
        await Module.create(moduleData);
        console.log("✅ Module seeded successfully.");
    }
}
async function seedUser(users) {
    for (const user of users) {
        const existing = await User.findOne({ where: { username: user.username } });
        if (existing) {
            console.log(`✅ User "${user.username}" already exists.`);
        } else {
            await User.create(user);
            console.log(`✅ User "${user.username}" seeded.`);
        }
    }
}
async function seedStudent(studentData) {
    const existing = await Student.findOne({
        where: {
            StudentId: studentData.StudentId,
            CourseId: studentData.CourseId
        }
    });

    if (existing) {
        console.log(`✅ Student "${studentData.StudentId}" already exists for course "${studentData.CourseId}".`);
    } else {
        await Student.create(studentData);
        console.log(`✅ Student "${studentData.StudentId}" seeded.`);
    }
}


async function runSeeders() {
    if (process.env.NODE_ENV === "prod") {
        console.log("Skipping seed data insertion in production environment.");
        return;
    }
    try {
        const seedCourseData = {
            courseId: "sdet152025",
            batch_no: "15",
            course_title: "Full Stack SQA",
            course_initial: "sdet",
            drive_folder_id: "abc123driveid",
            short_description: "Industry-ready SQA training with real projects.",
            is_enabled: true,
            enrollment_start_date: "2025-03-01",
            enrollment_end_date: "2025-03-25",
            orientation_date: "2025-03-26",
            class_start_date: "2025-03-28",
            class_days: ["Friday", "Saturday"],
            class_time: "20:00:00",
            course_image: "http://localhost:3000/og-image.jpg",
        };

        const seedPackageData = {
            courseId: seedCourseData.courseId,
            packageName: "Diamond",
            studentFee: 3000.00,
            jobholderFee: 4500.00,
            installment: 2,
        };

        const seedModuleData = {
            courseId: seedCourseData.courseId,
            packageId: null, // will set dynamically
            module: [
                { title: "Manual Testing 1", description: "Writing test cases hurreh" },
                { title: "Programming", description: "Java, NodeJS, Python" },
                { title: "API Testing", description: "API Architectures, Postman, Newman" },
                { title: "Performance Testing", description: "JMeter, k6, Load & Stress Testing" },
                { title: "Database Testing", description: "MySQL, Query Optimization, Indexing" },
                { title: "OOP & Design Patterns", description: "SOLID Principles, Best Coding Practices" },
                { title: "Web Automation", description: "Selenium, Playwright, Cypress" },
                { title: "API Automation", description: "Rest Assured, Playwright API Testing" },
                { title: "Git & CI/CD", description: "GitHub, Jenkins, GitHub Actions" },
                { title: "Mock Interviews", description: "Interview preparation, Resume review" }
            ],
            createdAt: new Date("2025-03-02T22:29:30"),
            updatedAt: new Date("2025-03-12T18:38:05"),
        };
        const seedUserData = [
            {
                id: 1,
                username: "admin",
                email: "roadtosdet@gmail.com",
                password: "$2b$10$6ofjVO5J.niYXCfWL0jHYey/oZux28uAOto6eUsv.ddRjVIORDyha",
                role: "admin",
                isValid: 1,
                createdAt: new Date("2025-02-27T01:11:52"),
                updatedAt: new Date("2025-03-19T23:59:25"),
                resetToken: null,
                resetTokenExpires: null,
            },
            {
                id: 2,
                username: "sdetsr1001",
                email: "salmansrabon+120@gmail.com",
                password: "$2b$10$mvzUGXHP/xA3QyIsL.918.utPwD./S4wVC67tT5IPVdnP6gvsjGfW",
                role: "student",
                isValid: 1,
                createdAt: new Date("2025-03-01T17:20:03"),
                updatedAt: new Date("2025-03-21T00:05:00"),
                resetToken: null,
                resetTokenExpires: null,
            },
        ];
        const seedStudentData = {
            id: 1,
            StudentId: "sdetsr1001",
            CourseId: "sdet152025",
            package: "Diamond",
            batch_no: "15",
            courseTitle: "Full-Stack SQA",
            salutation: "Mr",
            student_name: "Tanvir Ahmed",
            university: "Dhaka International University",
            profession: "Job Holder",
            passingYear: "2022",
            experience: "",
            company: "Tech Solutions Ltd.",
            designation: "Senior QA Engineer",
            address: "123 Main St, City",
            mobile: "01934567890",
            email: "salmansrabon@gmail.com",
            certificate: "http://localhost:5000/api/images/1742494667129-cert.png",
            isEnrolled: true,
            facebook: "https://facebook.com/johndoe",
            whatsapp: "0123456789",
            linkedin: "https://linkedin.com/in/johndoe",
            github: "https://github.com/johndoe",
            knowMe: "LinkedIn",
            opinion: "Excited to learn! yeahooo",
            google_access_id: "02151883815151971379",
            createdAt: new Date("2025-03-01T17:20:03"),
            updatedAt: new Date("2025-03-25T22:57:37"),
            remark: "Very good student",
            due: null,
            quiz_answer: null,
        };



        await seedCourse(seedCourseData);
        const pkgId = await seedPackage(seedPackageData);
        seedModuleData.packageId = pkgId;
        await seedModule(seedModuleData);
        await seedUser(seedUserData);
        await seedStudent(seedStudentData);

        console.log("🎯 All seed data inserted.");
    } catch (err) {
        console.error("❌ Seeding error:", err.message);
    }
}

module.exports = {
    seedCourse,
    seedPackage,
    seedModule,
    runSeeders,
};
