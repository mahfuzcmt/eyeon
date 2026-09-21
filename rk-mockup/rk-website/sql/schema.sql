-- =============================================================================
-- Rashed Khan Website Database Schema
-- =============================================================================

-- Drop tables if exist (for clean reinstall)
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS complaint_logs;
DROP TABLE IF EXISTS complaints;
DROP TABLE IF EXISTS appointments;
DROP TABLE IF EXISTS news;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS media;
DROP TABLE IF EXISTS contact_messages;
DROP TABLE IF EXISTS settings;
DROP TABLE IF EXISTS statistics;
DROP TABLE IF EXISTS admin_users;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. Admin Users
CREATE TABLE admin_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    role ENUM('super_admin', 'editor', 'viewer') DEFAULT 'editor',
    is_active TINYINT(1) DEFAULT 1,
    last_login DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. News Articles
CREATE TABLE news (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    summary TEXT,
    content LONGTEXT,
    featured_image VARCHAR(500),
    category ENUM('সরকারি_কার্যক্রম', 'উন্নয়ন', 'জনসভা', 'স্বাস্থ্য', 'শিক্ষা', 'যুব_কার্যক্রম', 'অন্যান্য') DEFAULT 'অন্যান্য',
    is_featured TINYINT(1) DEFAULT 0,
    status ENUM('draft', 'published') DEFAULT 'draft',
    views_count INT DEFAULT 0,
    published_at DATETIME,
    author_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES admin_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Projects
CREATE TABLE projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(500) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description LONGTEXT,
    category ENUM('অবকাঠামো', 'শিক্ষা', 'স্বাস্থ্য', 'কৃষি', 'কর্মসংস্থান', 'বিদ্যুৎ', 'অন্যান্য') DEFAULT 'অন্যান্য',
    status ENUM('পরিকল্পিত', 'চলমান', 'সম্পন্ন', 'বিলম্বিত') DEFAULT 'চলমান',
    progress_percent INT DEFAULT 0,
    budget_crore DECIMAL(10,2),
    location_district VARCHAR(100),
    location_upazila VARCHAR(100),
    location_union VARCHAR(100),
    responsible_dept VARCHAR(200),
    start_date DATE,
    end_date DATE,
    before_image VARCHAR(500),
    after_image VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Complaints
CREATE TABLE complaints (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_number VARCHAR(20) UNIQUE NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    nid_number VARCHAR(20),
    is_anonymous TINYINT(1) DEFAULT 0,
    district VARCHAR(100),
    upazila VARCHAR(100),
    union_name VARCHAR(100),
    village VARCHAR(200),
    category ENUM('অবকাঠামো', 'শিক্ষা', 'স্বাস্থ্য', 'কৃষি', 'কর্মসংস্থান', 'দুর্নীতি', 'বিদ্যুৎ', 'অন্যান্য') NOT NULL,
    subject VARCHAR(300) NOT NULL,
    description TEXT NOT NULL,
    attachments JSON,
    status ENUM('দাখিল', 'পর্যালোচনাধীন', 'কার্যক্রম', 'সমাধান') DEFAULT 'দাখিল',
    assigned_department VARCHAR(200),
    resolution_notes TEXT,
    resolved_at DATETIME,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Complaint Activity Log
CREATE TABLE complaint_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    complaint_id INT NOT NULL,
    action VARCHAR(100) NOT NULL,
    description TEXT,
    updated_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
    FOREIGN KEY (updated_by) REFERENCES admin_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Appointments
CREATE TABLE appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    appointment_number VARCHAR(20) UNIQUE NOT NULL,
    visitor_name VARCHAR(200) NOT NULL,
    visitor_phone VARCHAR(20) NOT NULL,
    visitor_email VARCHAR(100),
    visitor_organization VARCHAR(200),
    visitor_position VARCHAR(100),
    appointment_type ENUM('সাধারণ', 'এলাকাবাসী', 'মিডিয়া') DEFAULT 'সাধারণ',
    scheduled_date DATE NOT NULL,
    scheduled_time TIME NOT NULL,
    duration_minutes INT DEFAULT 15,
    purpose TEXT,
    status ENUM('বুকড', 'নিশ্চিত', 'সম্পন্ন', 'বাতিল', 'অনুপস্থিত') DEFAULT 'বুকড',
    admin_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Media Gallery
CREATE TABLE media (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(300) NOT NULL,
    description TEXT,
    media_type ENUM('youtube', 'photo') NOT NULL,
    url VARCHAR(500) NOT NULL,
    youtube_id VARCHAR(20),
    thumbnail VARCHAR(500),
    category ENUM('সাক্ষাৎকার', 'আন্দোলন', 'সংবাদ', 'বিশ্লেষণ', 'টক_শো', 'ইভেন্ট', 'অন্যান্য') DEFAULT 'অন্যান্য',
    is_featured TINYINT(1) DEFAULT 0,
    view_count INT DEFAULT 0,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Contact Messages
CREATE TABLE contact_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    email VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    subject VARCHAR(300),
    message TEXT NOT NULL,
    status ENUM('নতুন', 'পড়া', 'উত্তর_দেওয়া') DEFAULT 'নতুন',
    admin_reply TEXT,
    replied_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Site Settings
CREATE TABLE settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type ENUM('text', 'textarea', 'image', 'json') DEFAULT 'text',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Statistics Cache
CREATE TABLE statistics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    stat_key VARCHAR(50) UNIQUE NOT NULL,
    stat_value INT DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Indexes for performance
CREATE INDEX idx_news_status ON news(status, published_at DESC);
CREATE INDEX idx_news_category ON news(category);
CREATE INDEX idx_news_slug ON news(slug);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_slug ON projects(slug);
CREATE INDEX idx_complaints_ticket ON complaints(ticket_number);
CREATE INDEX idx_complaints_status ON complaints(status);
CREATE INDEX idx_complaints_phone ON complaints(phone);
CREATE INDEX idx_appointments_date ON appointments(scheduled_date, scheduled_time);
CREATE INDEX idx_media_type ON media(media_type, is_featured);
CREATE INDEX idx_contact_status ON contact_messages(status);

-- =============================================================================
-- Default Data
-- =============================================================================

-- Default admin user (password: admin123)
-- Note: Hash generated with password_hash('admin123', PASSWORD_BCRYPT)
INSERT INTO admin_users (username, email, password_hash, full_name, role)
VALUES ('admin', 'admin@rashedkhan.com.bd', '$2y$10$pBRHFVYGnewWDAyU0FZs8u0oBAixgS.9K6po7bn4/Yeldz7WVvZOy', 'Administrator', 'super_admin');

-- Default settings
INSERT INTO settings (setting_key, setting_value, setting_type) VALUES
('site_title', 'মো. রাশেদ খান', 'text'),
('site_tagline', 'মাননীয় প্রধানমন্ত্রীর রাজনৈতিক উপদেষ্টা (সচিব পদমর্যাদা)', 'text'),
('contact_email', 'info@rashedkhan.com.bd', 'text'),
('contact_phone', '+880 1700-000000', 'text'),
('office_address', 'প্রধানমন্ত্রীর কার্যালয়, তেজগাঁও, ঢাকা-১২১৫', 'textarea'),
('facebook_url', 'https://facebook.com/rashedkhan.com23', 'text'),
('youtube_url', '', 'text'),
('twitter_url', '', 'text'),
('about_text', 'মো. রাশেদ খান মাননীয় প্রধানমন্ত্রীর রাজনৈতিক উপদেষ্টা (সচিব পদমর্যাদা)। তিনি ২০২৬ সালের ২০ জুলাই এই পদে নিযুক্ত হন। ঝিনাইদহ জেলার সার্বিক উন্নয়নে তিনি নিরলস কাজ করে যাচ্ছেন।', 'textarea'),
('hero_image', '', 'image'),
('logo_image', 'rashed_khan_logo.jpg', 'image');

-- Initial statistics
INSERT INTO statistics (stat_key, stat_value) VALUES
('total_complaints', 0),
('resolved_complaints', 0),
('total_appointments', 0),
('total_projects', 0),
('completed_projects', 0),
('total_news', 0),
('total_visitors', 0);

-- Sample news articles
INSERT INTO news (title, slug, summary, content, category, status, is_featured, published_at, author_id) VALUES
('মাননীয় প্রধানমন্ত্রীর সাথে গুরুত্বপূর্ণ বৈঠক সম্পন্ন', 'pm-meeting-important', 'অবকাঠামো উন্নয়ন, শিক্ষা, স্বাস্থ্য খাতে বিনিয়োগ ও কর্মসংস্থান সৃষ্টি নিয়ে আলোচনা', '<p>আজ মাননীয় প্রধানমন্ত্রীর সাথে একটি গুরুত্বপূর্ণ বৈঠক সম্পন্ন হয়েছে। এই বৈঠকে ঝিনাইদহ জেলার অবকাঠামো উন্নয়ন, শিক্ষা ও স্বাস্থ্য খাতে বিনিয়োগ এবং কর্মসংস্থান সৃষ্টি নিয়ে বিস্তারিত আলোচনা হয়।</p><p>মো. রাশেদ খান জানান, এই বৈঠকে ঝিনাইদহ জেলার বেশ কিছু গুরুত্বপূর্ণ প্রকল্প অনুমোদনের বিষয়ে ইতিবাচক সিদ্ধান্ত হয়েছে।</p>', 'সরকারি_কার্যক্রম', 'published', 1, NOW(), 1),
('শৈলকূপা উপজেলায় সড়ক নির্মাণ প্রকল্প পরিদর্শন', 'shailkupa-road-project', 'শৈলকূপা উপজেলায় চলমান সড়ক নির্মাণ প্রকল্পের কাজ পরিদর্শন করেছেন', '<p>আজ ঝিনাইদহের শৈলকূপা উপজেলায় চলমান একটি গুরুত্বপূর্ণ সড়ক নির্মাণ প্রকল্পের কাজ পরিদর্শন করেছেন মো. রাশেদ খান।</p><p>তিনি প্রকল্প বাস্তবায়নকারী কর্মকর্তাদের সাথে কথা বলেন এবং দ্রুত ও মানসম্পন্ন কাজ সম্পন্ন করার নির্দেশ দেন।</p>', 'উন্নয়ন', 'published', 1, NOW(), 1),
('দরিদ্র ও অসহায় মানুষদের জন্য বিনামূল্যে স্বাস্থ্যসেবা ক্যাম্প', 'free-health-camp-jhenaidah', 'ঝিনাইদহ শহরে দরিদ্র ও অসহায় মানুষদের জন্য বিনামূল্যে স্বাস্থ্যসেবা ক্যাম্প অনুষ্ঠিত', '<p>ঝিনাইদহ শহরে আজ দরিদ্র ও অসহায় মানুষদের জন্য একটি বিনামূল্যে স্বাস্থ্যসেবা ক্যাম্প অনুষ্ঠিত হয়েছে। এই ক্যাম্পে প্রায় ৮০০ জন রোগী বিনামূল্যে চিকিৎসা সেবা ও ঔষধ পেয়েছেন।</p>', 'স্বাস্থ্য', 'published', 0, NOW(), 1),
('যুব কর্মসংস্থান প্রশিক্ষণ কর্মসূচি উদ্বোধন', 'youth-employment-training', 'যুবকদের কর্মসংস্থানের লক্ষ্যে প্রশিক্ষণ কর্মসূচি শুরু', '<p>ঝিনাইদহ জেলায় আজ যুবকদের কর্মসংস্থানের লক্ষ্যে একটি বিশেষ প্রশিক্ষণ কর্মসূচি উদ্বোধন করা হয়েছে। এই কর্মসূচিতে ২০০ জন যুবক-যুবতী প্রশিক্ষণ গ্রহণ করবেন।</p>', 'যুব_কার্যক্রম', 'published', 0, NOW(), 1),
('মেধাবী শিক্ষার্থীদের মাঝে বৃত্তি বিতরণ', 'scholarship-distribution', 'ঝিনাইদহ জেলার মেধাবী শিক্ষার্থীদের মাঝে বৃত্তি বিতরণ করা হয়েছে', '<p>আজ ঝিনাইদহ জেলার ১০০ জন মেধাবী ও অসচ্ছল শিক্ষার্থীদের মাঝে শিক্ষা বৃত্তি বিতরণ করা হয়েছে। প্রতিটি শিক্ষার্থীকে বার্ষিক ১০,০০০ টাকা করে বৃত্তি প্রদান করা হয়।</p>', 'শিক্ষা', 'published', 0, NOW(), 1);

-- Sample projects
INSERT INTO projects (name, slug, description, category, status, progress_percent, budget_crore, location_district, location_upazila, start_date, end_date, responsible_dept) VALUES
('ঝিনাইদহ-শৈলকূপা সড়ক সম্প্রসারণ', 'jhenaidah-shailkupa-road', 'ঝিনাইদহ থেকে শৈলকূপা উপজেলা পর্যন্ত সড়ক সম্প্রসারণ ও উন্নয়ন প্রকল্প', 'অবকাঠামো', 'চলমান', 65, 150.00, 'ঝিনাইদহ', 'শৈলকূপা', '2025-01-01', '2026-06-30', 'সড়ক ও জনপথ বিভাগ'),
('কোটচাঁদপুর সরকারি কলেজ ভবন নির্মাণ', 'kotchandpur-college-building', 'কোটচাঁদপুর সরকারি কলেজের নতুন একাডেমিক ভবন নির্মাণ', 'শিক্ষা', 'পরিকল্পিত', 0, 25.00, 'ঝিনাইদহ', 'কোটচাঁদপুর', '2026-01-01', '2027-12-31', 'শিক্ষা প্রকৌশল অধিদপ্তর'),
('মহেশপুর উপজেলা স্বাস্থ্য কমপ্লেক্স আধুনিকায়ন', 'maheshpur-health-complex', 'মহেশপুর উপজেলা স্বাস্থ্য কমপ্লেক্সের আধুনিকায়ন ও সম্প্রসারণ', 'স্বাস্থ্য', 'সম্পন্ন', 100, 12.50, 'ঝিনাইদহ', 'মহেশপুর', '2024-01-01', '2025-06-30', 'স্বাস্থ্য প্রকৌশল অধিদপ্তর'),
('হরিণাকুন্ড কৃষি সম্প্রসারণ প্রকল্প', 'harinakunda-agriculture', 'হরিণাকুন্ড উপজেলায় আধুনিক কৃষি প্রযুক্তি সম্প্রসারণ ও সেচ সুবিধা বৃদ্ধি', 'কৃষি', 'চলমান', 40, 35.00, 'ঝিনাইদহ', 'হরিণাকুন্ড', '2025-06-01', '2027-05-31', 'কৃষি সম্প্রসারণ অধিদপ্তর'),
('কালীগঞ্জ বিদ্যুৎ সম্প্রসারণ প্রকল্প', 'kaliganj-electricity', 'কালীগঞ্জ উপজেলায় গ্রামীণ বিদ্যুতায়ন সম্প্রসারণ', 'বিদ্যুৎ', 'চলমান', 80, 18.00, 'ঝিনাইদহ', 'কালীগঞ্জ', '2025-01-15', '2026-03-30', 'পল্লী বিদ্যুৎ সমিতি');

-- Sample media
INSERT INTO media (title, description, media_type, url, youtube_id, category, is_featured) VALUES
('সংসদে বক্তব্য - কৃষি বাজেট নিয়ে আলোচনা', 'মাননীয় এমপি মো. রাশেদ খান সংসদে কৃষি বাজেট নিয়ে গুরুত্বপূর্ণ বক্তব্য রাখেন', 'youtube', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ', 'সংবাদ', 1),
('টক শো - বাংলাদেশের অর্থনীতি', 'একটি জনপ্রিয় টক শোতে বাংলাদেশের অর্থনৈতিক উন্নয়ন নিয়ে আলোচনা', 'youtube', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ', 'টক_শো', 0);
