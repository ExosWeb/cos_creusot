/**
 * Script pour nettoyer les articles existants selon les nouvelles règles
 * Supprime les articles non conformes aux restrictions membres/retraités
 */

const { pool } = require('./config/database');
require('dotenv').config();

async function cleanupArticles() {
    try {
        console.log('🧹 Démarrage du nettoyage des articles...');
        console.log('✅ Connexion à la base de données établie');

        // 1. Lister tous les articles actuels
        const [articles] = await pool.execute(
            'SELECT id, title, category, author_id FROM articles ORDER BY created_at DESC'
        );
        
        console.log(`📊 ${articles.length} articles trouvés dans la base`);
        
        if (articles.length === 0) {
            console.log('ℹ️  Aucun article à nettoyer');
            return;
        }

        // 2. Lister les articles par catégorie
        console.log('\n📋 Répartition des articles par catégorie:');
        const categoryCounts = {};
        articles.forEach(article => {
            const cat = article.category || 'non-categorise';
            categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        });
        
        Object.entries(categoryCounts).forEach(([cat, count]) => {
            console.log(`   - ${cat}: ${count} article(s)`);
        });

        // 3. Demander confirmation pour la suppression
        console.log('\n⚠️  ATTENTION: Cette opération va supprimer TOUS les articles existants');
        console.log('   Raison: Mise en place du système de restriction d\'accès');
        console.log('   Seuls les membres et retraités pourront créer de nouveaux articles');
        
        // En mode automatique pour ce script
        console.log('\n🗑️  Suppression des articles en cours...');
        
        // 4. Supprimer tous les articles
        const [deleteResult] = await pool.execute('DELETE FROM articles WHERE 1=1');
        
        console.log(`✅ ${deleteResult.affectedRows} articles supprimés`);
        
        // 5. Réinitialiser l'auto-increment
        await pool.execute('ALTER TABLE articles AUTO_INCREMENT = 1');
        console.log('🔄 Compteur auto-increment réinitialisé');
        
        // 6. Créer quelques articles d'exemple pour les tests
        console.log('\n📝 Création d\'articles d\'exemple...');
        
        // Récupérer les utilisateurs pour les exemples
        const [users] = await pool.execute(
            'SELECT id, role, firstname, lastname FROM users WHERE status = "approved" AND role IN ("admin", "member", "retraite") LIMIT 3'
        );
        
        if (users.length > 0) {
            const exampleArticles = [
                {
                    title: 'Bienvenue dans l\'espace membres',
                    content: 'Cet espace est désormais réservé à nos membres adhérents et retraités. Vous pouvez ici partager des actualités, des événements et des moments importants de notre communauté.',
                    category: 'general',
                    status: 'published',
                    author_id: users.find(u => u.role === 'admin')?.id || users[0].id,
                    excerpt: 'Découvrez votre nouvel espace membre exclusif'
                }
            ];
            
            // Ajouter un article spécifique aux retraités si un retraité existe
            const retraiteUser = users.find(u => u.role === 'retraite');
            if (retraiteUser) {
                exampleArticles.push({
                    title: 'Informations importantes pour nos retraités',
                    content: 'Cette section est spécialement dédiée aux retraités de notre communauté. Vous y trouverez des informations sur les activités, événements et services qui vous sont destinés.',
                    category: 'retraites',
                    status: 'published',
                    author_id: retraiteUser.id,
                    excerpt: 'Espace exclusif dédié aux retraités du COS Creusot'
                });
            }
            
            // Insérer les articles d'exemple
            for (const article of exampleArticles) {
                await pool.execute(
                    `INSERT INTO articles (title, content, category, status, author_id, excerpt, created_at, updated_at) 
                     VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                    [article.title, article.content, article.category, article.status, article.author_id, article.excerpt]
                );
            }
            
            console.log(`✅ ${exampleArticles.length} articles d'exemple créés`);
        }
        
        console.log('\n🎉 Nettoyage terminé avec succès!');
        console.log('📌 Les nouveaux articles ne peuvent être créés que par:');
        console.log('   - Les administrateurs (accès complet)');
        console.log('   - Les membres adhérents (articles généraux)');
        console.log('   - Les retraités (articles retraités uniquement)');
        
    } catch (error) {
        console.error('❌ Erreur lors du nettoyage:', error);
        throw error;
    } finally {
        console.log('🔌 Nettoyage terminé');
    }
}

// Exécuter le script
if (require.main === module) {
    cleanupArticles()
        .then(() => {
            console.log('\n✨ Script de nettoyage terminé');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n💥 Erreur fatale:', error);
            process.exit(1);
        });
}

module.exports = { cleanupArticles };