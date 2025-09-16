const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const router = express.Router();

/**
 * Route de recherche d'articles
 * GET /api/articles/search
 * Paramètres query:
 * - q: terme de recherche
 * - category: filtre par catégorie
 * - limit: nombre max de résultats (défaut: 50)
 * - offset: décalage pour pagination (défaut: 0)
 * - sort: tri (date_desc, date_asc, title_asc, title_desc)
 */
router.get('/search', [
    query('q').optional().isLength({ max: 500 }).withMessage('Le terme de recherche est trop long'),
    query('category').optional().isIn(['general', 'prestations', 'voyages', 'retraites', 'evenements']).withMessage('Catégorie invalide'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limite invalide'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Offset invalide'),
    query('sort').optional().isIn(['date_desc', 'date_asc', 'title_asc', 'title_desc']).withMessage('Tri invalide')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false, 
                message: 'Paramètres de recherche invalides',
                errors: errors.array() 
            });
        }

        const { q, category, limit = 50, offset = 0, sort = 'date_desc' } = req.query;
        
        // Construction de la requête SQL
        let sql = `
            SELECT 
                id, title, content, excerpt, image_url, category, 
                is_member_only, created_at, updated_at,
                MATCH(title, content, excerpt) AGAINST (? IN BOOLEAN MODE) as relevance_score
            FROM articles 
            WHERE 1=1
        `;
        
        let params = [];
        let searchTerm = '';
        
        // Ajout du terme de recherche
        if (q && q.trim()) {
            searchTerm = q.trim();
            // Préparation du terme pour la recherche fulltext MySQL
            const fullTextSearch = searchTerm.split(' ').map(word => `+${word}*`).join(' ');
            params.push(fullTextSearch);
            sql += ` AND (
                MATCH(title, content, excerpt) AGAINST (? IN BOOLEAN MODE) 
                OR title LIKE ? 
                OR content LIKE ? 
                OR excerpt LIKE ?
            )`;
            const likeSearch = `%${searchTerm}%`;
            params.push(likeSearch, likeSearch, likeSearch);
        } else {
            params.push('');
        }
        
        // Filtre par catégorie
        if (category) {
            sql += ` AND category = ?`;
            params.push(category);
        }
        
        // Tri
        let orderBy = 'ORDER BY ';
        switch (sort) {
            case 'date_asc':
                orderBy += 'created_at ASC';
                break;
            case 'title_asc':
                orderBy += 'title ASC';
                break;
            case 'title_desc':
                orderBy += 'title DESC';
                break;
            case 'date_desc':
            default:
                if (q && q.trim()) {
                    orderBy += 'relevance_score DESC, created_at DESC';
                } else {
                    orderBy += 'created_at DESC';
                }
                break;
        }
        
        sql += ` ${orderBy} LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));
        
        console.log('Search SQL:', sql);
        console.log('Search params:', params);
        
        const [articles] = await pool.execute(sql, params);
        
        // Comptage total pour la pagination
        let countSql = `SELECT COUNT(*) as total FROM articles WHERE 1=1`;
        let countParams = [];
        
        if (q && q.trim()) {
            const fullTextSearch = searchTerm.split(' ').map(word => `+${word}*`).join(' ');
            countParams.push(fullTextSearch);
            countSql += ` AND (
                MATCH(title, content, excerpt) AGAINST (? IN BOOLEAN MODE) 
                OR title LIKE ? 
                OR content LIKE ? 
                OR excerpt LIKE ?
            )`;
            const likeSearch = `%${searchTerm}%`;
            countParams.push(likeSearch, likeSearch, likeSearch);
        }
        
        if (category) {
            countSql += ` AND category = ?`;
            countParams.push(category);
        }
        
        const [countResult] = await pool.execute(countSql, countParams);
        const total = countResult[0].total;
        
        // Traitement des résultats
        const processedArticles = articles.map(article => ({
            ...article,
            excerpt: article.excerpt || createExcerpt(article.content),
            relevance_score: article.relevance_score || 0
        }));
        
        res.json({
            success: true,
            data: processedArticles,
            pagination: {
                total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasNext: (parseInt(offset) + parseInt(limit)) < total,
                hasPrev: parseInt(offset) > 0
            },
            searchInfo: {
                query: q || '',
                category: category || '',
                sort,
                results: articles.length
            }
        });
        
    } catch (error) {
        console.error('Erreur lors de la recherche d\'articles:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la recherche d\'articles',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * Route pour les suggestions de recherche
 * GET /api/articles/suggestions
 */
router.get('/suggestions', [
    query('q').notEmpty().isLength({ min: 2, max: 100 }).withMessage('Le terme doit contenir au moins 2 caractères')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false, 
                message: 'Paramètres invalides',
                errors: errors.array() 
            });
        }

        const { q } = req.query;
        const searchTerm = `%${q.trim()}%`;
        
        // Recherche de suggestions basées sur les titres
        const [suggestions] = await pool.execute(`
            SELECT DISTINCT title, category, id 
            FROM articles 
            WHERE title LIKE ? 
            ORDER BY title ASC 
            LIMIT 10
        `, [searchTerm]);
        
        res.json({
            success: true,
            suggestions: suggestions.map(s => ({
                id: s.id,
                title: s.title,
                category: s.category
            }))
        });
        
    } catch (error) {
        console.error('Erreur lors de la récupération des suggestions:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la récupération des suggestions'
        });
    }
});

/**
 * Route pour les catégories et leurs compteurs
 * GET /api/articles/categories
 */
router.get('/categories', async (req, res) => {
    try {
        const [categories] = await pool.execute(`
            SELECT 
                category,
                COUNT(*) as count,
                MAX(created_at) as last_updated
            FROM articles 
            GROUP BY category
            ORDER BY count DESC
        `);
        
        const categoryNames = {
            'general': 'Général',
            'prestations': 'Prestations',
            'voyages': 'Voyages',
            'retraites': 'Retraites',
            'evenements': 'Événements'
        };
        
        const processedCategories = categories.map(cat => ({
            ...cat,
            name: categoryNames[cat.category] || cat.category
        }));
        
        res.json({
            success: true,
            categories: processedCategories
        });
        
    } catch (error) {
        console.error('Erreur lors de la récupération des catégories:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la récupération des catégories'
        });
    }
});

// Fonction utilitaire pour créer un extrait
function createExcerpt(content, maxLength = 150) {
    if (!content) return '';
    
    // Supprimer les balises HTML
    const textContent = content.replace(/<[^>]*>/g, '');
    
    // Tronquer si nécessaire
    if (textContent.length <= maxLength) {
        return textContent;
    }
    
    return textContent.substring(0, maxLength).trim() + '...';
}

module.exports = router;