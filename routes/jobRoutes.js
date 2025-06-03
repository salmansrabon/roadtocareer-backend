const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');

// POST /api/jobs
router.post('/create', jobController.createJob);
router.get('/', jobController.getJobs);
router.put('/update/:id', jobController.updateJob);
router.delete('/delete/:id', jobController.deleteJob);

module.exports = router;
