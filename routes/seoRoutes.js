const express = require('express');
const router = express.Router();
const SeoController = require('../controllers/seoController');

// Public routes (no authentication required)
// Get SEO data by route - used by frontend pages
router.get('/route/:route(*)', SeoController.getSeoByRoute);
router.get('/sitemap', SeoController.getSitemapData);

// Admin routes (would typically require authentication in production)
// Search SEO records (must come before /:id route)
router.get('/search', SeoController.searchSeo);

// Generate SEO suggestions (must come before other routes to avoid conflicts)
router.post('/suggestions', SeoController.generateSeoSuggestions);

// Get all SEO records
router.get('/', SeoController.getAllSeo);

// Get SEO record by ID (must come after specific routes)
router.get('/:id', SeoController.getSeoById);

// Create new SEO record
router.post('/', SeoController.createSeo);

// Update SEO record
router.put('/:id', SeoController.updateSeo);

// Bulk update SEO records
router.put('/bulk/update', SeoController.bulkUpdateSeo);

// Delete SEO record
router.delete('/:id', SeoController.deleteSeo);

module.exports = router;
