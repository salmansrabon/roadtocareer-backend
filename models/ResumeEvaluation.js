const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ResumeEvaluation = sequelize.define('ResumeEvaluation', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  candidate_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  company_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  job_title: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  resume_score: {
    type: DataTypes.DECIMAL(3, 1),
    allowNull: true
  },
  resume_text: {
    type: DataTypes.TEXT('long'),
    allowNull: true
  },
  ai_feedback: {
    type: DataTypes.JSON,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  }
}, {
  tableName: 'resume_evaluations',
  timestamps: false
});

module.exports = ResumeEvaluation;
