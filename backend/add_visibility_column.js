const { pool } = require('./config/database');

async function addVisibilityColumn() {
    try {
        console.log('🔧 Ajout de la colonne visibility à la table articles...');
        
        // Ajouter la colonne visibility
        await pool.query(`
            ALTER TABLE articles 
            ADD COLUMN IF NOT EXISTS visibility ENUM('public', 'adherent', 'retraite', 'adherent_retraite') 
            DEFAULT 'public'
        `);
        
        console.log('✅ Colonne visibility ajoutée avec succès');
        
        // Mettre à jour les articles existants selon leur catégorie
        console.log('📝 Mise à jour des articles existants...');
        
        // Articles retraites -> visibilité retraite
        await pool.query(`
            UPDATE articles 
            SET visibility = 'retraite' 
            WHERE category = 'retraites'
        `);
        
        // Articles généraux -> visibilité publique  
        await pool.query(`
            UPDATE articles 
            SET visibility = 'public' 
            WHERE category IN ('general', 'evenements')
        `);
        
        // Articles prestations/avantages -> visibilité adhérents et retraités
        await pool.query(`
            UPDATE articles 
            SET visibility = 'adherent_retraite' 
            WHERE category IN ('prestations', 'avantages', 'voyages')
        `);
        
        console.log('✅ Mise à jour terminée');
        
        // Afficher un résumé
        const [summary] = await pool.query(`
            SELECT visibility, COUNT(*) as count 
            FROM articles 
            GROUP BY visibility
        `);
        
        console.log('📊 Résumé de la visibilité des articles:');
        console.table(summary);
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        pool.end();
    }
}

addVisibilityColumn();