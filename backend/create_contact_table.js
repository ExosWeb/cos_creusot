const { pool } = require('./config/database');

(async () => {
    try {
        // Créer la table contact_messages
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS contact_messages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                first_name VARCHAR(100) NOT NULL,
                last_name VARCHAR(100) NOT NULL,
                email VARCHAR(255) NOT NULL,
                phone VARCHAR(20),
                subject VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                newsletter BOOLEAN DEFAULT FALSE,
                ip_address VARCHAR(45),
                user_agent TEXT,
                read_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_created_at (created_at),
                INDEX idx_read_at (read_at)
            )
        `);
        
        console.log('✅ Table contact_messages créée avec succès');
        
    } catch (e) {
        console.error('❌ Erreur:', e.message);
    }
    process.exit();
})();