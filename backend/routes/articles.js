const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken, requireAdmin, logAction } = require('../middleware/auth');

// Récupérer tous les articles publiés
router.get('/', async (req, res) => {
    try {
        const [articles] = await pool.query(`
            SELECT 
                a.*,
                u.firstname,
                u.lastname
            FROM articles a
            LEFT JOIN users u ON a.author_id = u.id
            WHERE a.status = 'published'
            ORDER BY a.featured DESC, a.created_at DESC
        `);
        
        res.json(articles);
    } catch (error) {
        console.error('Erreur lors de la récupération des articles:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Récupérer les articles mis en avant
router.get('/featured', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 5;
        
        const [articles] = await pool.query(`
            SELECT 
                a.*,
                u.firstname,
                u.lastname
            FROM articles a
            LEFT JOIN users u ON a.author_id = u.id
            WHERE a.status = 'published' AND a.featured = 1
            ORDER BY a.created_at DESC
            LIMIT ?
        `, [limit]);
        
        res.json(articles);
    } catch (error) {
        console.error('Erreur lors de la récupération des articles mis en avant:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Récupérer les articles par catégorie
router.get('/category/:category', async (req, res) => {
    try {
        const { category } = req.params;
        const validCategories = ['general', 'avantages', 'voyages', 'retraites', 'evenements'];
        
        if (!validCategories.includes(category)) {
            return res.status(400).json({ error: 'Catégorie invalide' });
        }
        
        const [articles] = await pool.query(`
            SELECT 
                a.*,
                u.firstname,
                u.lastname
            FROM articles a
            LEFT JOIN users u ON a.author_id = u.id
            WHERE a.category = ? AND a.status = 'published'
            ORDER BY a.featured DESC, a.created_at DESC
        `, [category]);
        
        res.json(articles);
    } catch (error) {
        console.error('Erreur lors de la récupération des articles par catégorie:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Récupérer un article spécifique
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const [articles] = await pool.query(`
            SELECT 
                a.*,
                u.firstname,
                u.lastname
            FROM articles a
            LEFT JOIN users u ON a.author_id = u.id
            WHERE a.id = ?
        `, [id]);
        
        if (articles.length === 0) {
            return res.status(404).json({ error: 'Article non trouvé' });
        }
        
        res.json(articles[0]);
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'article:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Créer un nouvel article (utilisateurs connectés uniquement)
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { 
            title, 
            content, 
            category = 'general', 
            status = 'draft',
            excerpt = null,
            image_url = null,
            featured = false
        } = req.body;
        
        if (!title || !content) {
            return res.status(400).json({ error: 'Le titre et le contenu sont requis' });
        }
        
        const validCategories = ['general', 'avantages', 'voyages', 'retraites', 'evenements'];
        const validStatuses = ['draft', 'published'];
        
        if (!validCategories.includes(category)) {
            return res.status(400).json({ error: 'Catégorie invalide' });
        }
        
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Statut invalide' });
        }
        
        const [result] = await pool.query(`
            INSERT INTO articles (title, content, excerpt, category, status, featured, image_url, author_id, published_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            title, 
            content, 
            excerpt, 
            category, 
            status, 
            featured, 
            image_url, 
            req.user.id,
            status === 'published' ? new Date() : null
        ]);
        
        // Logger l'action
        await logAction(req, 'create_article', 'article', result.insertId);
        
        res.status(201).json({
            message: 'Article créé avec succès',
            articleId: result.insertId
        });
    } catch (error) {
        console.error('Erreur lors de la création de l\'article:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Mettre à jour un article (auteur ou admin uniquement)
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            title, 
            content, 
            category, 
            status,
            excerpt,
            image_url,
            featured
        } = req.body;
        
        // Vérifier que l'article existe
        const [articles] = await pool.query('SELECT * FROM articles WHERE id = ?', [id]);
        if (articles.length === 0) {
            return res.status(404).json({ error: 'Article non trouvé' });
        }
        
        const article = articles[0];
        
        // Vérifier les permissions (auteur ou admin)
        if (article.author_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Permission refusée' });
        }
        
        // Valider les données
        if (title && title.trim().length === 0) {
            return res.status(400).json({ error: 'Le titre ne peut pas être vide' });
        }
        
        if (content && content.trim().length === 0) {
            return res.status(400).json({ error: 'Le contenu ne peut pas être vide' });
        }
        
        const validCategories = ['general', 'avantages', 'voyages', 'retraites', 'evenements'];
        if (category && !validCategories.includes(category)) {
            return res.status(400).json({ error: 'Catégorie invalide' });
        }
        
        const validStatuses = ['draft', 'published'];
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Statut invalide' });
        }
        
        // Construire la requête de mise à jour
        const updates = [];
        const values = [];
        
        if (title !== undefined) {
            updates.push('title = ?');
            values.push(title);
        }
        if (content !== undefined) {
            updates.push('content = ?');
            values.push(content);
        }
        if (category !== undefined) {
            updates.push('category = ?');
            values.push(category);
        }
        if (status !== undefined) {
            updates.push('status = ?');
            values.push(status);
            // Mettre à jour published_at si on publie
            if (status === 'published' && article.status !== 'published') {
                updates.push('published_at = NOW()');
            }
        }
        if (excerpt !== undefined) {
            updates.push('excerpt = ?');
            values.push(excerpt);
        }
        if (image_url !== undefined) {
            updates.push('image_url = ?');
            values.push(image_url);
        }
        if (featured !== undefined) {
            updates.push('featured = ?');
            values.push(featured);
        }
        
        if (updates.length === 0) {
            return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });
        }
        
        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);
        
        await pool.query(`
            UPDATE articles 
            SET ${updates.join(', ')}
            WHERE id = ?
        `, values);
        
        // Logger l'action
        await logAction(req, 'update_article', 'article', id);
        
        res.json({ message: 'Article mis à jour avec succès' });
    } catch (error) {
        console.error('Erreur lors de la mise à jour de l\'article:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Basculer le statut "mis en avant" (admin uniquement)
router.patch('/:id/featured', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Vérifier que l'article existe
        const [articles] = await pool.query('SELECT * FROM articles WHERE id = ?', [id]);
        if (articles.length === 0) {
            return res.status(404).json({ error: 'Article non trouvé' });
        }
        
        const currentFeatured = articles[0].featured;
        const newFeatured = !currentFeatured;
        
        await pool.query('UPDATE articles SET featured = ? WHERE id = ?', [newFeatured, id]);
        
        // Logger l'action
        await logAction(req, 'update_article', 'article', id, {
            action: `${newFeatured ? 'Mis en avant' : 'Retiré de la mise en avant'}`
        });
        
        res.json({ 
            message: `Article ${newFeatured ? 'mis en avant' : 'retiré de la mise en avant'}`,
            featured: newFeatured
        });
    } catch (error) {
        console.error('Erreur lors de la modification du statut featured:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Supprimer un article (auteur ou admin uniquement)
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Vérifier que l'article existe
        const [articles] = await pool.query('SELECT * FROM articles WHERE id = ?', [id]);
        if (articles.length === 0) {
            return res.status(404).json({ error: 'Article non trouvé' });
        }
        
        const article = articles[0];
        
        // Vérifier les permissions (auteur ou admin)
        if (article.author_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Permission refusée' });
        }
        
        await pool.query('DELETE FROM articles WHERE id = ?', [id]);
        
        // Logger l'action
        await logAction(req, 'delete_article', 'article', id, {
            title: article.title
        });
        
        res.json({ message: 'Article supprimé avec succès' });
    } catch (error) {
        console.error('Erreur lors de la suppression de l\'article:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Routes admin
// Récupérer tous les articles (y compris brouillons)
router.get('/admin/all', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const [articles] = await pool.query(`
            SELECT 
                a.*,
                u.firstname,
                u.lastname
            FROM articles a
            LEFT JOIN users u ON a.author_id = u.id
            ORDER BY a.created_at DESC
        `);
        
        res.json(articles);
    } catch (error) {
        console.error('Erreur lors de la récupération de tous les articles:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router;
