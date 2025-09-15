-- Script de création des tables pour le COS Creusot
-- Base de données : COS_Creusot

USE COS_Creusot;

-- Table des utilisateurs
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    firstname VARCHAR(100) NOT NULL,
    lastname VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    role ENUM('member', 'admin') DEFAULT 'member',
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    approved_by INT,
    approved_at TIMESTAMP NULL,
    last_login TIMESTAMP NULL,
    INDEX idx_email (email),
    INDEX idx_status (status),
    INDEX idx_role (role),
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Table des articles
CREATE TABLE IF NOT EXISTS articles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    category ENUM('avantages', 'voyages', 'retraites', 'evenements', 'general') NOT NULL,
    author_id INT NOT NULL,
    status ENUM('draft', 'published') DEFAULT 'draft',
    featured BOOLEAN DEFAULT FALSE,
    image_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    published_at TIMESTAMP NULL,
    INDEX idx_category (category),
    INDEX idx_status (status),
    INDEX idx_featured (featured),
    INDEX idx_published_at (published_at),
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table des connexions (logs de connexion)
CREATE TABLE IF NOT EXISTS login_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    email VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    failure_reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_success (success),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Table des logs de visite (logs d'ouverture du site)
CREATE TABLE IF NOT EXISTS visit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT,
    page VARCHAR(255),
    referrer VARCHAR(500),
    session_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_ip_address (ip_address),
    INDEX idx_created_at (created_at),
    INDEX idx_page (page),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Table des logs d'actions
CREATE TABLE IF NOT EXISTS action_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id INT,
    details JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_action (action),
    INDEX idx_resource (resource_type, resource_id),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Table des sessions
CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(128) PRIMARY KEY,
    user_id INT,
    data TEXT,
    expires TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_expires (expires),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Insertion d'un utilisateur administrateur par défaut
INSERT INTO users (email, password, firstname, lastname, role, status, approved_at) 
VALUES ('admin@cos-creusot.fr', '$2b$10$rQ7zY4K9qXvZ3mNbL8pXPeKzY1X2Y3Z4A5B6C7D8E9F0G1H2I3J4K5', 'Admin', 'COS', 'admin', 'approved', NOW())
ON DUPLICATE KEY UPDATE id=id;

-- Insertion de quelques articles d'exemple
INSERT INTO articles (title, content, excerpt, category, author_id, status, featured, published_at) 
VALUES 
    ('Bienvenue au COS du Creusot', 'Bienvenue sur le site du Comité des Œuvres Sociales de la ville du Creusot. Découvrez tous nos avantages et services.', 'Découvrez les services du COS', 'general', 1, 'published', TRUE, NOW()),
    ('Nouveaux avantages disponibles', 'De nouveaux avantages sont disponibles pour tous les membres du COS.', 'Nouveaux avantages membres', 'avantages', 1, 'published', TRUE, NOW()),
    ('Voyage en Espagne - Inscriptions ouvertes', 'Les inscriptions pour le voyage en Espagne sont maintenant ouvertes. Places limitées.', 'Voyage Espagne 2024', 'voyages', 1, 'published', FALSE, NOW())
ON DUPLICATE KEY UPDATE id=id;