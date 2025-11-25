const Seo = require('../models/Seo');
const sequelize = require('../config/db');

// Initial SEO data for the main pages
const initialSeoData = [
    {
        page_route: '/',
        page_title: 'Road to SDET - Empowering Software Testers',
        meta_description: 'Road to SDET offers industry-ready SQA training, full stack testing courses, expert mentorship, and hands-on projects.',
        meta_keywords: 'SQA Training, SQA Online Course, SQA Course Bangladesh, SQA Course in Bangladesh, SQA Course Dhaka, SQA Course BD, SQA Course Online, SQA Course for Beginners, Best SQA course in Bangladesh, Full Stack SDET, Software Testing, QA Courses, Playwright Training Bangladesh, Selenium Training BD, Postman Training Bangladesh, Rest Assured Training, Manual Testing Course, Automation Testing Training, CI/CD Training Bangladesh, Test Automation BD, Quality Assurance Course, QA Certification Bangladesh, SDET Bangladesh, Road to SDET, Roadtocareer.net',
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
        meta_keywords: 'hire QA engineers Bangladesh, SDET professionals Dhaka, software testing talent, quality assurance experts, automation testers Bangladesh, find QA talent, hire software testers, selenium experts, automation testing professionals, manual testers Bangladesh, ISTQB certified professionals',
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
        meta_keywords: 'QA jobs Bangladesh, SDET jobs Dhaka, software testing jobs, quality assurance careers, automation testing jobs Bangladesh, manual testing jobs, QA engineer jobs, test automation careers, software QA jobs Dhaka',
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
        meta_keywords: 'Road to SDET reviews, student testimonials Bangladesh, QA course reviews, SDET training feedback, software testing course Bangladesh, student success stories, QA engineer testimonials, automation testing reviews Dhaka',
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

async function setupSeoTable() {
    try {
        console.log('🔧 Setting up SEO table...');
        
        // Sync the SEO table (this will create it if it doesn't exist)
        await Seo.sync({ force: false }); // force: false means don't drop existing table
        console.log('✅ SEO table synchronized');
        
        // Check if we already have data
        const existingRecords = await Seo.findAll();
        
        if (existingRecords.length === 0) {
            console.log('📝 Inserting initial SEO data...');
            
            // Insert initial data
            for (const seoRecord of initialSeoData) {
                await Seo.create(seoRecord);
                console.log(`  ✅ Created SEO record for: ${seoRecord.page_route}`);
            }
            
            console.log('🎉 Initial SEO data inserted successfully!');
        } else {
            console.log(`ℹ️ SEO table already has ${existingRecords.length} records`);
        }
        
        // Show current records
        const allRecords = await Seo.findAll({
            attributes: ['id', 'page_route', 'page_title', 'is_active'],
            order: [['priority', 'DESC']]
        });
        
        console.log('\n📊 Current SEO Records:');
        allRecords.forEach(record => {
            console.log(`  ${record.id}. ${record.page_route} - ${record.page_title} (${record.is_active ? 'Active' : 'Inactive'})`);
        });
        
    } catch (error) {
        console.error('❌ Error setting up SEO table:', error);
        throw error;
    }
}

// Run setup if this file is executed directly
if (require.main === module) {
    setupSeoTable()
        .then(() => {
            console.log('✅ SEO setup completed successfully');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ SEO setup failed:', error);
            process.exit(1);
        });
}

module.exports = { setupSeoTable, initialSeoData };
