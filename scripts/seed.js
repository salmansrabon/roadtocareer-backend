const Course = require("../models/Course");
const Package = require("../models/Package");
const Module = require("../models/Module");
const User = require("../models/User");
const Student = require("../models/Student");
const Seo = require("../models/Seo");

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

async function seedSeo() {
    try {
        // First sync the table to ensure it exists
        await Seo.sync({ force: false });
        console.log('✅ SEO table synchronized');
        
        // Check if we already have SEO data
        const existingRecords = await Seo.findAll();
        
        if (existingRecords.length === 0) {
            console.log('📝 Inserting initial SEO data...');
            
            const initialSeoData = [
                {
                    page_route: '/',
                    page_title: 'Road to SDET - Empowering Software Testers',
                    meta_description: 'Road to SDET offers industry-ready SQA training, full stack testing courses, expert mentorship, and hands-on projects.',
                    meta_keywords: 'SQA Training, SQA Online Course, SQA Course Bangladesh, Best SQA course in Bangladesh, Full Stack SDET, Software Testing, QA Courses, Playwright Training Bangladesh, Selenium Training BD, Road to SDET',
                    og_title: 'Road to SDET - Empowering Software Testers',
                    og_description: 'Join the best SQA and full stack SDET hands-on courses in Bangladesh. Learn automation, manual testing, CI/CD, and more.',
                    og_image: 'https://roadtocareer.net/og-image.jpg',
                    canonical_url: 'https://roadtocareer.net',
                    robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
                    author: 'Road to SDET',
                    language: 'en',
                    geo_region: 'BD',
                    geo_placename: 'Dhaka',
                    geo_position: '23.8103, 90.4125',
                    schema_type: 'Organization',
                    priority: 1.0,
                    change_frequency: 'daily',
                    is_active: true
                },
                {
                    page_route: '/qa-talent',
                    page_title: 'Find Talented SQA - Road to Career | QA & SDET Professionals Bangladesh',
                    meta_description: 'Discover talented QA and SDET professionals from Bangladesh. Browse skilled software testers, automation engineers, and quality assurance specialists trained at Road to SDET.',
                    meta_keywords: 'hire QA engineers Bangladesh, SDET professionals Dhaka, software testing talent, quality assurance experts, automation testers Bangladesh, find QA talent, hire software testers, selenium experts, ISTQB certified professionals',
                    og_title: 'Find Talented SQA | Road to Career - QA & SDET Professionals',
                    og_description: 'Discover talented QA and SDET professionals from Bangladesh. Skilled in automation testing, API testing, manual testing, and more.',
                    og_image: 'https://roadtocareer.net/logo.png',
                    canonical_url: 'https://roadtocareer.net/qa-talent',
                    robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
                    author: 'Road to Career',
                    language: 'en',
                    geo_region: 'BD',
                    geo_placename: 'Dhaka',
                    geo_position: '23.8103, 90.4125',
                    schema_type: 'CollectionPage',
                    priority: 0.9,
                    change_frequency: 'daily',
                    is_active: true
                },
                {
                    page_route: '/jobs',
                    page_title: 'QA & SDET Jobs in Bangladesh | Road to SDET',
                    meta_description: 'Find the latest QA and SDET job opportunities in Bangladesh. Quality Assurance, Test Automation, Manual Testing, and Software Testing positions.',
                    meta_keywords: 'QA jobs Bangladesh, SDET jobs Dhaka, software testing jobs, quality assurance careers, automation testing jobs Bangladesh, manual testing jobs, QA engineer jobs, test automation careers',
                    og_title: 'QA & SDET Jobs in Bangladesh | Road to SDET',
                    og_description: 'Find the latest QA and SDET job opportunities in Bangladesh. Quality Assurance, Test Automation, and Software Testing positions.',
                    og_image: 'https://roadtocareer.net/logo.png',
                    canonical_url: 'https://roadtocareer.net/jobs',
                    robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
                    author: 'Road to SDET',
                    language: 'en',
                    geo_region: 'BD',
                    geo_placename: 'Dhaka',
                    geo_position: '23.8103, 90.4125',
                    schema_type: 'JobPosting',
                    priority: 0.9,
                    change_frequency: 'daily',
                    is_active: true
                },
                {
                    page_route: '/reviews',
                    page_title: 'Student Reviews & Success Stories - Road to SDET Bangladesh | Testimonials',
                    meta_description: 'Read real student reviews about Road to SDET\'s QA and SDET courses in Bangladesh. Verified success stories from students placed at top companies.',
                    meta_keywords: 'Road to SDET reviews, student testimonials Bangladesh, QA course reviews, SDET training feedback, software testing course Bangladesh, student success stories, QA engineer testimonials',
                    og_title: 'Student Reviews & Success Stories | Road to SDET Bangladesh',
                    og_description: 'Verified reviews from real students. Learn why Road to SDET is Bangladesh\'s top choice for QA and automation testing training.',
                    og_image: 'https://roadtocareer.net/logo.png',
                    canonical_url: 'https://roadtocareer.net/reviews',
                    robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
                    author: 'Road to SDET',
                    language: 'en',
                    geo_region: 'BD',
                    geo_placename: 'Dhaka',
                    geo_position: '23.8103, 90.4125',
                    schema_type: 'EducationalOrganization',
                    priority: 0.9,
                    change_frequency: 'weekly',
                    is_active: true
                },
                {
                    page_route: '/login',
                    page_title: 'Login | Road to SDET',
                    meta_description: 'Login to your Road to SDET student or admin dashboard to manage your courses, attendance, payments and more.',
                    meta_keywords: 'Road to SDET login, student login, admin login, dashboard access',
                    og_title: 'Login | Road to SDET',
                    og_description: 'Login to your Road to SDET student dashboard',
                    og_image: 'https://roadtocareer.net/logo.png',
                    canonical_url: 'https://roadtocareer.net/login',
                    robots: 'noindex, nofollow',
                    author: 'Road to SDET',
                    language: 'en',
                    geo_region: 'BD',
                    geo_placename: 'Dhaka',
                    geo_position: '23.8103, 90.4125',
                    schema_type: 'WebPage',
                    priority: 0.3,
                    change_frequency: 'monthly',
                    is_active: true
                }
            ];
            
            // Insert initial data
            for (const seoRecord of initialSeoData) {
                await Seo.create(seoRecord);
                console.log(`  ✅ Created SEO record for: ${seoRecord.page_route}`);
            }
            
            console.log('🎉 Initial SEO data inserted successfully!');
        } else {
            console.log(`ℹ️ SEO table already has ${existingRecords.length} records`);
        }
        
    } catch (error) {
        console.error('❌ Error setting up SEO table:', error);
        // Don't throw error to prevent breaking other seeders
    }
}


async function runSeeders() {
    if (process.env.NODE_ENV === "production") {
        console.log("Skipping seed data insertion in production environment.");
        return;
    }
    try {
        const seedCourseData = {
            courseId: "sdet12022",
            batch_no: "1",
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
                { title: "Manual Testing", description: "Writing test cases" },
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
            CourseId: "sdet12022",
            package: "Diamond",
            batch_no: "1",
            courseTitle: "Full-Stack SQA",
            salutation: "Mr",
            student_name: "Salman Rahman",
            university: "Seed University",
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
        await seedSeo(); // Setup SEO table and data

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
