-- Add a views counter to jobs, and a job_views table to enforce
-- one counted view per (job, IP address) pair.
ALTER TABLE jobs ADD COLUMN views INT NOT NULL DEFAULT 0;

CREATE TABLE job_views (
  id INT AUTO_INCREMENT PRIMARY KEY,
  jobId INT NOT NULL,
  ipAddress VARCHAR(45) NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_job_ip (jobId, ipAddress),
  KEY idx_jobId (jobId)
);
