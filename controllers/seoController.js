const Seo = require('../models/Seo');
const { Op } = require('sequelize');
const OpenAI = require('openai');

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

class SeoController {
    // Get SEO data by route
    static async getSeoByRoute(req, res) {
        try {
            const { route } = req.params;
            const seoData = await Seo.findOne({
                where: { 
                    page_route: route,
                    is_active: true 
                }
            });
            
            if (!seoData) {
                return res.status(404).json({
                    success: false,
                    message: 'SEO data not found for this route'
                });
            }

            res.json({
                success: true,
                data: seoData
            });
        } catch (error) {
            console.error('Error getting SEO data by route:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Get all SEO data
    static async getAllSeo(req, res) {
        try {
            const seoData = await Seo.findAll({
                where: { is_active: true },
                order: [['priority', 'DESC'], ['page_route', 'ASC']]
            });

            res.json({
                success: true,
                data: seoData,
                count: seoData.length
            });
        } catch (error) {
            console.error('Error getting all SEO data:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Create new SEO record
    static async createSeo(req, res) {
        try {
            const seoData = req.body;
            
            // Validate required fields
            if (!seoData.page_route || !seoData.page_title) {
                return res.status(400).json({
                    success: false,
                    message: 'Page route and title are required'
                });
            }

            const newSeoRecord = await Seo.create(seoData);
            
            res.status(201).json({
                success: true,
                data: newSeoRecord,
                message: 'SEO record created successfully'
            });
        } catch (error) {
            console.error('Error creating SEO record:', error);
            if (error.name === 'SequelizeUniqueConstraintError') {
                return res.status(400).json({
                    success: false,
                    message: 'SEO record for this route already exists'
                });
            }
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Update SEO record
    static async updateSeo(req, res) {
        try {
            const { id } = req.params;
            const seoData = req.body;
            
            // Validate required fields
            if (!seoData.page_route || !seoData.page_title) {
                return res.status(400).json({
                    success: false,
                    message: 'Page route and title are required'
                });
            }

            const seoRecord = await Seo.findByPk(id);
            if (!seoRecord) {
                return res.status(404).json({
                    success: false,
                    message: 'SEO record not found'
                });
            }

            await seoRecord.update(seoData);
            
            res.json({
                success: true,
                data: seoRecord,
                message: 'SEO record updated successfully'
            });
        } catch (error) {
            console.error('Error updating SEO record:', error);
            if (error.name === 'SequelizeUniqueConstraintError') {
                return res.status(400).json({
                    success: false,
                    message: 'SEO record for this route already exists'
                });
            }
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Delete SEO record (soft delete)
    static async deleteSeo(req, res) {
        try {
            const { id } = req.params;
            const seoRecord = await Seo.findByPk(id);
            
            if (!seoRecord) {
                return res.status(404).json({
                    success: false,
                    message: 'SEO record not found'
                });
            }

            await seoRecord.update({ is_active: false });
            
            res.json({
                success: true,
                message: 'SEO record deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting SEO record:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Get SEO record by ID
    static async getSeoById(req, res) {
        try {
            const { id } = req.params;
            const seoData = await Seo.findByPk(id);
            
            if (!seoData) {
                return res.status(404).json({
                    success: false,
                    message: 'SEO record not found'
                });
            }

            res.json({
                success: true,
                data: seoData
            });
        } catch (error) {
            console.error('Error getting SEO record by ID:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Search SEO records
    static async searchSeo(req, res) {
        try {
            const { q } = req.query;
            
            if (!q || q.trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: 'Search query is required'
                });
            }

            const searchTerm = q.trim();
            const seoData = await Seo.findAll({
                where: {
                    [Op.and]: [
                        { is_active: true },
                        {
                            [Op.or]: [
                                { page_route: { [Op.like]: `%${searchTerm}%` } },
                                { page_title: { [Op.like]: `%${searchTerm}%` } },
                                { meta_description: { [Op.like]: `%${searchTerm}%` } }
                            ]
                        }
                    ]
                },
                order: [['priority', 'DESC']]
            });

            res.json({
                success: true,
                data: seoData,
                count: seoData.length,
                query: q
            });
        } catch (error) {
            console.error('Error searching SEO records:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Get sitemap data
    static async getSitemapData(req, res) {
        try {
            const sitemapData = await Seo.findAll({
                where: {
                    is_active: true,
                    robots: { [Op.notLike]: '%noindex%' }
                },
                attributes: ['page_route', 'canonical_url', 'priority', 'change_frequency', 'updatedAt'],
                order: [['priority', 'DESC']]
            });
            
            res.json({
                success: true,
                data: sitemapData,
                count: sitemapData.length
            });
        } catch (error) {
            console.error('Error getting sitemap data:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Bulk update SEO records
    static async bulkUpdateSeo(req, res) {
        try {
            const { updates } = req.body;
            
            if (!Array.isArray(updates) || updates.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Updates array is required and must not be empty'
                });
            }

            const results = [];
            const errors = [];

            for (const update of updates) {
                try {
                    if (!update.id || !update.data) {
                        errors.push({
                            id: update.id || 'unknown',
                            error: 'ID and data are required for each update'
                        });
                        continue;
                    }

                    const seoRecord = await Seo.findByPk(update.id);
                    if (!seoRecord) {
                        errors.push({
                            id: update.id,
                            error: 'SEO record not found'
                        });
                        continue;
                    }

                    await seoRecord.update(update.data);
                    results.push(seoRecord);
                } catch (error) {
                    errors.push({
                        id: update.id,
                        error: error.message
                    });
                }
            }

            res.json({
                success: errors.length === 0,
                data: {
                    updated: results,
                    errors: errors
                },
                message: `${results.length} records updated successfully${errors.length > 0 ? `, ${errors.length} errors` : ''}`
            });
        } catch (error) {
            console.error('Error bulk updating SEO records:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Generate AI-powered SEO suggestions
    static async generateSeoSuggestions(req, res) {
        try {
            console.log('🔥 SEO Suggestions endpoint called');
            console.log('Request body:', req.body);
            const { page_route, content } = req.body;
            
            if (!page_route) {
                console.log('❌ No page_route provided');
                return res.status(400).json({
                    success: false,
                    message: 'Page route is required'
                });
            }

            console.log('✅ Processing AI suggestions for route:', page_route);

            // Create AI prompt for SEO suggestions
            const prompt = `You are an SEO expert. Generate SEO-optimized content for a webpage with the route "${page_route}" for "Road to Career" - a software testing and QA training institute in Bangladesh that offers SDET courses, QA training, and software testing education.

Please generate:
1. A compelling page title (50-60 characters)
2. A meta description (140-160 characters)
3. Meta keywords (5-8 relevant keywords, comma-separated)
4. OpenGraph title for social media
5. OpenGraph description for social media
6. OpenGraph image URL (use: https://roadtocareer.net/og-image.jpg)
7. Twitter title for Twitter cards
8. Twitter description for Twitter cards
9. Twitter image URL (use: https://roadtocareer.net/og-image.jpg)
10. SEO priority (0.1-1.0 based on page importance)
11. Change frequency for sitemap

Context about Road to Career:
- Offers industry-ready SQA training
- Provides full stack testing courses
- Expert mentorship and hands-on projects
- Focuses on SDET, QA, automation testing, manual testing
- Located in Bangladesh
- Helps students get QA jobs
- Website: https://roadtocareer.net

Priority Guidelines:
- Homepage/main pages: 1.0
- Course pages: 0.8
- Job/career pages: 0.8
- About/contact: 0.5
- Blog/news: 0.5
- Other pages: 0.3

Change Frequency Guidelines:
- Homepage: daily
- Course pages: weekly
- Job listings: daily
- Static pages (about/contact): monthly
- Blog/news: weekly

Based on the page route "${page_route}", understand what type of page this is and generate appropriate SEO content with suitable priority and frequency.

Return ONLY a valid JSON object in this exact format (no markdown, no extra text):
{
    "page_title": "Your generated title",
    "meta_description": "Your generated description",
    "meta_keywords": "keyword1, keyword2, keyword3, keyword4, keyword5",
    "og_title": "Your OG title",
    "og_description": "Your OG description",
    "og_image": "https://roadtocareer.net/og-image.jpg",
    "twitter_title": "Your Twitter title",
    "twitter_description": "Your Twitter description",
    "twitter_image": "https://roadtocareer.net/og-image.jpg",
    "priority": 0.8,
    "change_frequency": "weekly"
}`;

            console.log('🤖 Calling OpenAI API...');

            // Call OpenAI API for suggestions
            const completion = await openai.chat.completions.create({
                model: "gpt-4o", // Using GPT-4 as requested
                messages: [
                    {
                        role: "system",
                        content: "You are an expert SEO specialist who generates high-quality, engaging SEO content. Always respond with valid JSON only."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                max_tokens: 500,
                temperature: 0.7,
            });

            console.log('✅ OpenAI Response received');
            
            const aiResponse = completion.choices[0].message.content.trim();
            console.log('AI Response:', aiResponse);

            // Parse AI response
            let suggestions;
            try {
                suggestions = JSON.parse(aiResponse);
                
                // Ensure all required fields are present, fill in missing ones
                const defaultValues = {
                    page_title: `${page_route.replace('/', '').replace('-', ' ').toUpperCase()} | Road to Career`,
                    meta_description: `Explore our ${page_route.replace('/', '').replace('-', ' ')} page at Road to Career - your destination for quality software testing education.`,
                    meta_keywords: 'Road to Career, software testing, QA training, SDET course, automation testing',
                    og_title: suggestions.page_title || `${page_route.replace('/', '').replace('-', ' ').toUpperCase()} | Road to Career`,
                    og_description: suggestions.meta_description || `Discover quality software testing education at Road to Career`,
                    og_image: 'https://roadtocareer.net/og-image.jpg',
                    twitter_title: suggestions.page_title || suggestions.og_title || `${page_route.replace('/', '').replace('-', ' ').toUpperCase()} | Road to Career`,
                    twitter_description: suggestions.meta_description || suggestions.og_description || `Discover quality software testing education at Road to Career`,
                    twitter_image: 'https://roadtocareer.net/og-image.jpg',
                    priority: 0.5,
                    change_frequency: 'monthly'
                };

                // Merge AI suggestions with defaults for missing fields
                suggestions = {
                    ...defaultValues,
                    ...suggestions
                };
                
                console.log('✅ Suggestions after ensuring all fields:', suggestions);
                
            } catch (parseError) {
                console.error('❌ Failed to parse AI response:', parseError);
                console.log('Raw AI response:', aiResponse);
                
                // Fallback to basic suggestions if AI parsing fails
                suggestions = {
                    page_title: `${page_route.replace('/', '').replace('-', ' ').toUpperCase()} | Road to Career`,
                    meta_description: `Explore our ${page_route.replace('/', '').replace('-', ' ')} page at Road to Career - your destination for quality software testing education.`,
                    meta_keywords: 'Road to Career, software testing, QA training, SDET course, automation testing',
                    og_title: `${page_route.replace('/', '').replace('-', ' ').toUpperCase()} | Road to Career`,
                    og_description: `Discover quality software testing education at Road to Career`,
                    og_image: 'https://roadtocareer.net/og-image.jpg',
                    twitter_title: `${page_route.replace('/', '').replace('-', ' ').toUpperCase()} | Road to Career`,
                    twitter_description: `Discover quality software testing education at Road to Career`,
                    twitter_image: 'https://roadtocareer.net/og-image.jpg',
                    priority: 0.5,
                    change_frequency: 'monthly'
                };
            }

            // Add canonical URL
            suggestions.canonical_url = `https://roadtocareer.net${page_route}`;

            console.log('✅ Final suggestions:', suggestions);

            res.json({
                success: true,
                data: suggestions,
                message: 'AI SEO suggestions generated successfully'
            });

        } catch (error) {
            console.error('❌ Error generating AI SEO suggestions:', error);
            
            // Fallback suggestions in case of API error
            const fallbackSuggestions = {
                page_title: `${page_route.replace('/', '').replace('-', ' ').toUpperCase()} | Road to Career`,
                meta_description: `Learn software testing and QA skills with Road to Career's comprehensive training programs.`,
                meta_keywords: 'Road to Career, software testing, QA training, SDET course, automation testing, manual testing',
                og_title: `${page_route.replace('/', '').replace('-', ' ').toUpperCase()} | Road to Career`,
                og_description: 'Join Bangladesh\'s leading software testing training institute',
                og_image: 'https://roadtocareer.net/og-image.jpg',
                twitter_title: `${page_route.replace('/', '').replace('-', ' ').toUpperCase()} | Road to Career`,
                twitter_description: 'Join Bangladesh\'s leading software testing training institute',
                twitter_image: 'https://roadtocareer.net/og-image.jpg',
                canonical_url: `https://roadtocareer.net${page_route}`,
                priority: 0.5,
                change_frequency: 'monthly'
            };

            res.json({
                success: true,
                data: fallbackSuggestions,
                message: 'SEO suggestions generated (using fallback due to AI service unavailable)',
                fallback: true
            });
        }
    }
}

module.exports = SeoController;
