const Job = require('../models/Job');
const { Op } = require('sequelize');
const sequelize = require('../config/db');

exports.createJob = async (req, res) => {
  try {
    const {
      companyName,
      positionName,
      workType,
      experience,
      level,
      companyLocation,
      description,
      deadline
    } = req.body;

    // Basic validation
    if (!companyName || !positionName || !workType || !experience || !level || !companyLocation) {
      return res.status(400).json({ message: "All fields except description are required." });
    }

    // Enum checks (optional)
    const validWorkTypes = ['Remote', 'Hybrid', 'Onsite'];
    const validLevels = ['Entry', 'Mid', 'Senior', 'Lead'];
    if (!validWorkTypes.includes(workType)) {
      return res.status(400).json({ message: "Invalid workType value." });
    }
    if (!validLevels.includes(level)) {
      return res.status(400).json({ message: "Invalid level value." });
    }

    // Create Job
    const newJob = await Job.create({
      companyName,
      positionName,
      workType,
      experience,
      level,
      companyLocation,
      description,
      deadline: deadline ? new Date(deadline) : null // Convert to Date if provided
    });

    res.status(201).json({
      message: "Job posted successfully!",
      job: newJob
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to post job.", error: error.message });
  }
};

exports.getJobs = async (req, res) => {
  try {
    let {
      companyName,
      positionName,
      workType,
      experience,
      level,
      offset
    } = req.query;

    const limit = 20;
    const pageOffset = parseInt(offset, 10) || 0;
    let where = {};

    // String filters with LIKE for partial/case-insensitive search
    if (companyName) {
      where.companyName = { [Op.like]: `%${companyName}%` };
    }
    if (positionName) {
      where.positionName = { [Op.like]: `%${positionName}%` };
    }
    if (experience) {
      where.experience = { [Op.like]: `%${experience}%` };
    }

    // --- Multi-value, case-insensitive ENUM filters ---
    // For workType
    if (workType) {
      let types = workType.split(',').map(type => type.trim().toLowerCase());
      where[Op.and] = where[Op.and] || [];
      where[Op.and].push(
        { [Op.or]: types.map(type => {
            return {
              [Op.and]: [
                // LOWER() for case-insensitive matching
                sequelize.where(
                  sequelize.fn('LOWER', sequelize.col('workType')),
                  type
                )
              ]
            };
        })}
      );
    }
    // For level
    if (level) {
      let levels = level.split(',').map(l => l.trim().toLowerCase());
      where[Op.and] = where[Op.and] || [];
      where[Op.and].push(
        { [Op.or]: levels.map(lvl => {
            return {
              [Op.and]: [
                sequelize.where(
                  sequelize.fn('LOWER', sequelize.col('level')),
                  lvl
                )
              ]
            };
        })}
      );
    }

    // Get total count of all matches (before pagination)
    const total = await Job.count({ where });

    // Get page results
    const jobs = await Job.findAll({
      where,
      limit,
      offset: pageOffset,
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
      total,          // Total matching jobs (all pages)
      count: jobs.length, // Jobs in this page
      jobs
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch jobs.", error: error.message });
  }
};


exports.updateJob = async (req, res) => {
  try {
    const { id } = req.params;

    // Find existing job
    const job = await Job.findByPk(id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found.' });
    }

    // Only update the provided fields
    const allowedFields = [
      'companyName', 'positionName', 'workType',
      'experience', 'level', 'companyLocation',
      'description', 'deadline'
    ];
    const updates = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    await job.update(updates);

    res.status(200).json({
      message: 'Job updated successfully!',
      job
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update job.', error: error.message });
  }
};
exports.deleteJob = async (req, res) => {
  try {
    const { id } = req.params;

    const job = await Job.findByPk(id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found.' });
    }

    await job.destroy();

    res.status(200).json({ message: 'Job deleted successfully!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to delete job.', error: error.message });
  }
};