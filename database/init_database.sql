-- Script d'initialisation de la base de données COS_Creusot
-- À exécuter sur le serveur MySQL 148.113.194.73

USE COS_Creusot;

-- Table des utilisateurs
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    firstname VARCHAR(100) NOT NULL,
    lastname VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    role ENUM('member', 'admin') DEFAULT 'member',
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL
);

-- Table des articles
CREATE TABLE IF NOT EXISTS articles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    category ENUM('general', 'avantages', 'voyages', 'retraites', 'evenements') NOT NULL,
    status ENUM('draft', 'published') DEFAULT 'draft',
    featured BOOLEAN DEFAULT FALSE,
    author_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    published_at TIMESTAMP NULL,
    image_url VARCHAR(500),
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table des logs de connexion
CREATE TABLE IF NOT EXISTS login_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NULL,
    email VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    failure_reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table des logs de visite
CREATE TABLE IF NOT EXISTS visit_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    page VARCHAR(255) NOT NULL,
    referrer VARCHAR(500),
    session_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Table des logs d'actions
CREATE TABLE IF NOT EXISTS action_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id INT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    details JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index pour optimiser les performances
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_articles_category ON articles(category);
CREATE INDEX idx_articles_status ON articles(status);
CREATE INDEX idx_articles_featured ON articles(featured);
CREATE INDEX idx_articles_published_at ON articles(published_at);
CREATE INDEX idx_login_logs_created_at ON login_logs(created_at);
CREATE INDEX idx_login_logs_success ON login_logs(success);
CREATE INDEX idx_visit_logs_created_at ON visit_logs(created_at);
CREATE INDEX idx_action_logs_created_at ON action_logs(created_at);
CREATE INDEX idx_action_logs_action ON action_logs(action);

-- Insertion du premier administrateur
-- Mot de passe: admin123 (en clair pour le développement)
INSERT INTO users (firstname, lastname, email, password_hash, role, status) VALUES 
('Admin', 'COS', 'admin@cos-creusot.fr', 'admin123', 'admin', 'approved');

-- Insertion d'articles d'exemple
INSERT INTO articles (title, content, excerpt, category, status, featured, author_id) VALUES 
('Bienvenue au COS du Creusot', 
 'Bienvenue sur le site du Comité des Œuvres Sociales de la Mairie du Creusot. Nous sommes ravis de vous présenter nos services et avantages destinés aux agents de la collectivité et à leurs familles.', 
 'Découvrez les services du COS du Creusot',
 'general', 
 'published', 
 true, 
 1),

('Nos avantages exclusifs', 
 'Le COS propose de nombreux avantages à ses adhérents : réductions sur les loisirs, aide aux vacances, billetterie à tarifs préférentiels, et bien plus encore. Consultez régulièrement cette section pour découvrir nos nouvelles offres.',
 'Découvrez tous les avantages réservés aux membres du COS',
 'avantages',
 'published',
 true,
 1),

('Voyages organisés 2024', 
 'Cette année, le COS vous propose une sélection de voyages exceptionnels : week-ends découverte, séjours culturels, voyages détente. Des destinations pour tous les goûts et tous les budgets.',
 'Programme des voyages COS 2024',
 'voyages',
 'published',
 false,
 1);

-- Ajout d'un log d'exemple
INSERT INTO action_logs (user_id, action, resource_type, details) VALUES 
(1, 'create_database', 'system', '{"message": "Base de données initialisée avec succès"}');

COMMIT;