const { pool } = require('./config/database');

(async () => {
    try {
        // Créer un utilisateur retraité de test
        await pool.execute(`
            INSERT INTO users (email, password, firstname, lastname, role, status) 
            VALUES ('retraite@test.com', 'password123', 'Jean', 'Retraité', 'retraite', 'approved')
        `);
        
        console.log('✅ Utilisateur retraité créé: retraite@test.com / password123');
        
        // Créer également un article test pour les retraités
        await pool.execute(`
            INSERT INTO articles (title, content, excerpt, category, author_id, status, published_at)
            VALUES ('Article Retraité Test', 'Ceci est un article test pour les retraités', 'Article test', 'retraites', 1, 'published', NOW())
        `);
        
        console.log('✅ Article test pour retraités créé');
        
    } catch (e) {
        console.error('Erreur:', e.message);
    }
    process.exit();
})();