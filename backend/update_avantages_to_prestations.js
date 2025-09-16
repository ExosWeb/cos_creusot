const { pool } = require('./config/database');

(async () => {
    try {
        // Mettre à jour l'ENUM dans la table articles
        await pool.execute(`
            ALTER TABLE articles 
            MODIFY COLUMN category ENUM('general', 'prestations', 'voyages', 'retraites', 'evenements') NOT NULL
        `);
        
        // Mettre à jour les articles existants qui ont 'avantages' vers 'prestations'
        const [result] = await pool.execute(`
            UPDATE articles SET category = 'prestations' WHERE category = 'avantages'
        `);
        
        console.log(`✅ Catégorie mise à jour: ${result.affectedRows} articles modifiés`);
        console.log('✅ ENUM mis à jour: avantages → prestations');
        
    } catch (e) {
        console.error('❌ Erreur:', e.message);
    }
    process.exit();
})();