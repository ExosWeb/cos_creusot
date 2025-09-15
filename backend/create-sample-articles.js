const { pool } = require('./config/database');

async function createSampleArticles() {
    try {
        console.log('🔧 Création d\'articles de test...');

        // Vérifier s'il y a déjà des articles
        const [existingArticles] = await pool.execute('SELECT COUNT(*) as count FROM articles');
        if (existingArticles[0].count > 0) {
            console.log('✅ Articles déjà présents dans la base de données');
            return;
        }

        // Créer un utilisateur admin de test si nécessaire
        const [adminUser] = await pool.execute(
            'INSERT IGNORE INTO users (email, password, firstname, lastname, status, role) VALUES (?, ?, ?, ?, ?, ?)',
            ['admin@cos-creusot.fr', 'admin123', 'Administrateur', 'COS', 'approved', 'admin']
        );

        // Récupérer l'ID de l'admin ou créer un nouvel utilisateur
        const [users] = await pool.execute('SELECT id FROM users WHERE role = "admin" LIMIT 1');
        const adminId = users.length > 0 ? users[0].id : 1;

        const sampleArticles = [
            {
                title: 'Bienvenue au COS Le Creusot',
                content: `
                <h2>Découvrez le Comité des Œuvres Sociales de la Mairie de Le Creusot</h2>
                <p>Le COS de Le Creusot vous accueille et vous accompagne dans votre quotidien avec de nombreux avantages et services.</p>
                <p>Profitez de nos offres spéciales, de nos voyages organisés et de nos événements tout au long de l'année.</p>
                <p>Une équipe dédiée à votre service pour améliorer votre qualité de vie.</p>
                `,
                excerpt: 'Découvrez tous les avantages et services proposés par le COS de Le Creusot.',
                category: 'general',
                status: 'published',
                featured: 1
            },
            {
                title: 'Nouveau : Réductions sur les vacances d\'été',
                content: `
                <h2>Profitez de nos nouvelles réductions pour vos vacances d'été</h2>
                <p>Le COS vous propose des réductions exceptionnelles sur de nombreuses destinations pour cet été :</p>
                <ul>
                    <li>Séjours en bord de mer : -20%</li>
                    <li>Locations de vacances : -15%</li>
                    <li>Voyages organisés : -10%</li>
                </ul>
                <p>N'hésitez pas à nous contacter pour plus d'informations.</p>
                `,
                excerpt: 'Découvrez nos réductions exceptionnelles pour vos vacances d\'été.',
                category: 'avantages',
                status: 'published',
                featured: 1
            },
            {
                title: 'Voyage organisé : Alsace en automne',
                content: `
                <h2>Découvrez l'Alsace en automne</h2>
                <p>Rejoignez-nous pour un voyage inoubliable en Alsace du 15 au 18 octobre 2025.</p>
                <h3>Programme :</h3>
                <ul>
                    <li>Visite de Strasbourg et de sa cathédrale</li>
                    <li>Route des vins d'Alsace</li>
                    <li>Dégustation dans une cave traditionnelle</li>
                    <li>Découverte de Colmar et de la Petite Venise</li>
                </ul>
                <p>Prix : 450€ par personne (transport et hébergement inclus)</p>
                `,
                excerpt: 'Voyage organisé en Alsace du 15 au 18 octobre 2025.',
                category: 'voyages',
                status: 'published',
                featured: 1
            },
            {
                title: 'Assemblée générale 2025',
                content: `
                <h2>Assemblée générale du COS</h2>
                <p>L'assemblée générale du COS aura lieu le <strong>25 septembre 2025 à 18h30</strong> en salle des fêtes de la mairie.</p>
                <h3>Ordre du jour :</h3>
                <ul>
                    <li>Rapport d'activité 2024</li>
                    <li>Présentation du bilan financier</li>
                    <li>Projets pour 2025-2026</li>
                    <li>Questions diverses</li>
                </ul>
                <p>Votre présence est importante pour la vie de notre association.</p>
                `,
                excerpt: 'Assemblée générale le 25 septembre 2025 à 18h30 en mairie.',
                category: 'evenements',
                status: 'published',
                featured: 0
            },
            {
                title: 'Préparation à la retraite : nouvelles sessions',
                content: `
                <h2>Sessions de préparation à la retraite</h2>
                <p>Le COS organise des sessions de préparation à la retraite pour vous accompagner dans cette étape importante.</p>
                <h3>Prochaines sessions :</h3>
                <ul>
                    <li>3 octobre 2025 : Aspects financiers de la retraite</li>
                    <li>10 octobre 2025 : Santé et bien-être après 60 ans</li>
                    <li>17 octobre 2025 : Loisirs et activités pour seniors</li>
                </ul>
                <p>Inscription gratuite pour les adhérents.</p>
                `,
                excerpt: 'Sessions de préparation à la retraite en octobre 2025.',
                category: 'retraites',
                status: 'published',
                featured: 0
            }
        ];

        for (const article of sampleArticles) {
            await pool.execute(`
                INSERT INTO articles (title, content, excerpt, category, status, featured, author_id, published_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
            `, [
                article.title,
                article.content,
                article.excerpt,
                article.category,
                article.status,
                article.featured,
                adminId
            ]);
        }

        console.log('✅ Articles de test créés avec succès !');
        
        // Afficher le résumé
        const [totalArticles] = await pool.execute('SELECT COUNT(*) as total FROM articles');
        const [featuredArticles] = await pool.execute('SELECT COUNT(*) as featured FROM articles WHERE featured = 1');
        
        console.log(`📊 Total articles: ${totalArticles[0].total}`);
        console.log(`⭐ Articles mis en avant: ${featuredArticles[0].featured}`);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Erreur lors de la création des articles de test:', error);
        process.exit(1);
    }
}

createSampleArticles();