CREATE TABLE IF NOT EXISTS blogs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500) NOT NULL UNIQUE,
    excerpt TEXT NOT NULL,
    content LONGTEXT NOT NULL,
    coverImage VARCHAR(1000) DEFAULT NULL,
    author VARCHAR(255) NOT NULL DEFAULT 'Admin',
    status ENUM('draft', 'published') NOT NULL DEFAULT 'draft',
    publishedAt DATETIME DEFAULT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_blogs_status (status),
    INDEX idx_blogs_publishedAt (publishedAt)
);
