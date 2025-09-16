const { pool } = require('./config/database');

(async () => {
    try {
        // Créer la table events
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS events (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                start_date DATE NOT NULL,
                end_date DATE,
                start_time TIME NOT NULL,
                end_time TIME,
                location VARCHAR(255),
                category ENUM('general', 'voyage', 'retraite', 'activite') DEFAULT 'general',
                max_participants INT DEFAULT NULL,
                is_member_only BOOLEAN DEFAULT FALSE,
                created_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                status ENUM('draft', 'published', 'cancelled') DEFAULT 'published',
                INDEX idx_start_date (start_date),
                INDEX idx_category (category),
                INDEX idx_status (status),
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
            )
        `);
        
        console.log('✅ Table events créée avec succès');

        // Créer la table pour les inscriptions aux événements
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS event_registrations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                event_id INT NOT NULL,
                user_id INT NOT NULL,
                registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                status ENUM('registered', 'cancelled', 'attended') DEFAULT 'registered',
                notes TEXT,
                INDEX idx_event_user (event_id, user_id),
                INDEX idx_user (user_id),
                INDEX idx_status (status),
                FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY unique_registration (event_id, user_id)
            )
        `);
        
        console.log('✅ Table event_registrations créée avec succès');

        // Insérer quelques événements d'exemple
        const sampleEvents = [
            {
                title: 'Assemblée Générale COS',
                description: 'Assemblée générale annuelle du Comité des Œuvres Sociales avec présentation du bilan et des projets.',
                start_date: '2025-10-15',
                start_time: '14:00:00',
                end_time: '16:00:00',
                location: 'Salle polyvalente Le Creusot',
                category: 'general',
                is_member_only: true
            },
            {
                title: 'Voyage en Alsace',
                description: 'Découverte de la route des vins d\'Alsace avec dégustation et visite de caves.',
                start_date: '2025-11-08',
                end_date: '2025-11-10',
                start_time: '08:00:00',
                end_time: '18:00:00',
                location: 'Départ Le Creusot',
                category: 'voyage',
                max_participants: 45,
                is_member_only: true
            },
            {
                title: 'Repas des Retraités',
                description: 'Repas convivial pour tous les retraités membres du COS.',
                start_date: '2025-10-22',
                start_time: '12:00:00',
                end_time: '15:00:00',
                location: 'Restaurant La Petite Auberge',
                category: 'retraite',
                max_participants: 80,
                is_member_only: true
            },
            {
                title: 'Marché de Noël COS',
                description: 'Marché de Noël organisé par le COS avec artisans locaux et animations.',
                start_date: '2025-12-14',
                start_time: '10:00:00',
                end_time: '17:00:00',
                location: 'Place Schneider, Le Creusot',
                category: 'activite',
                is_member_only: false
            },
            {
                title: 'Soirée Galette des Rois',
                description: 'Soirée conviviale avec galette des rois et animation musicale.',
                start_date: '2026-01-18',
                start_time: '19:00:00',
                end_time: '23:00:00',
                location: 'Salle des fêtes',
                category: 'activite',
                max_participants: 100,
                is_member_only: true
            }
        ];

        for (const event of sampleEvents) {
            await pool.execute(`
                INSERT INTO events (title, description, start_date, end_date, start_time, end_time, location, category, max_participants, is_member_only)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                event.title,
                event.description,
                event.start_date,
                event.end_date || null,
                event.start_time,
                event.end_time,
                event.location,
                event.category,
                event.max_participants || null,
                event.is_member_only
            ]);
        }
        
        console.log('✅ Événements d\'exemple créés avec succès');
        console.log('📅 Tables de calendrier créées et initialisées');
        
    } catch (error) {
        console.error('❌ Erreur lors de la création des tables:', error.message);
    }
    
    process.exit();
})();