const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const { authenticateUser, requireAdmin } = require('../middlewares/authMiddleware');

// POST /api/jobs
router.post('/create', authenticateUser, requireAdmin, jobController.createJob);
router.get('/', jobController.getJobs);
router.put('/update/:id', authenticateUser, requireAdmin, jobController.updateJob);
router.delete('/delete/:id', authenticateUser, requireAdmin, jobController.deleteJob);
router.post('/:id/view', jobController.incrementJobView);

module.exports = router;
