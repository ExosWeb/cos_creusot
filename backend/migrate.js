const { pool } = require('./config/database');

async function migrate() {
    try {
        console.log('🔧 Début de la migration de la base de données...');

        // Vérifier et ajouter les colonnes manquantes à la table articles
        const migrations = [
            {
                name: 'Ajouter la colonne featured',
                query: `ALTER TABLE articles ADD COLUMN featured BOOLEAN DEFAULT FALSE`
            },
            {
                name: 'Ajouter la colonne excerpt',
                query: `ALTER TABLE articles ADD COLUMN excerpt TEXT`
            },
            {
                name: 'Ajouter la colonne image_url',
                query: `ALTER TABLE articles ADD COLUMN image_url VARCHAR(500)`
            },
            {
                name: 'Ajouter la colonne published_at',
                query: `ALTER TABLE articles ADD COLUMN published_at TIMESTAMP NULL`
            },
            {
                name: 'Modifier la catégorie pour inclure general',
                query: `ALTER TABLE articles MODIFY COLUMN category ENUM('general', 'avantages', 'voyages', 'retraites', 'evenements') NOT NULL`
            }
        ];

        for (const migration of migrations) {
            try {
                await pool.execute(migration.query);
                console.log(`✅ ${migration.name} - Réussie`);
            } catch (error) {
                if (error.code === 'ER_DUP_FIELDNAME') {
                    console.log(`⚠️  ${migration.name} - Colonne déjà existante (ignoré)`);
                } else if (error.code === 'ER_DUP_ENTRY') {
                    console.log(`⚠️  ${migration.name} - Valeur déjà présente (ignoré)`);
                } else {
                    console.log(`⚠️  ${migration.name} - ${error.message}`);
                }
            }
        }

        // Vérifier la structure finale de la table
        const [columns] = await pool.execute(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'COS_Creusot' 
            AND TABLE_NAME = 'articles'
            ORDER BY ORDINAL_POSITION
        `);

        console.log('\n📋 Structure finale de la table articles :');
        columns.forEach(col => {
            console.log(`   ${col.COLUMN_NAME}: ${col.DATA_TYPE} ${col.IS_NULLABLE === 'NO' ? 'NOT NULL' : 'NULL'} ${col.COLUMN_DEFAULT ? `DEFAULT ${col.COLUMN_DEFAULT}` : ''}`);
        });

        console.log('\n🎉 Migration terminée avec succès !');
        process.exit(0);
    } catch (error) {
        console.error('❌ Erreur lors de la migration:', error);
        process.exit(1);
    }
}

migrate();