const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const router = express.Router();

/**
 * Récupérer tous les événements publics ou selon les permissions
 * GET /api/events
 */
router.get('/', async (req, res) => {
    try {
        const { category, from_date, to_date, limit = 50, offset = 0 } = req.query;
        
        let sql = `
            SELECT 
                e.*,
                (SELECT COUNT(*) FROM event_registrations er WHERE er.event_id = e.id AND er.status = 'registered') as participants_count,
                u.firstname as creator_firstname,
                u.lastname as creator_lastname
            FROM events e
            LEFT JOIN users u ON e.created_by = u.id
            WHERE e.status = 'published'
        `;
        
        let params = [];
        
        // Filtrer par catégorie
        if (category) {
            sql += ` AND e.category = ?`;
            params.push(category);
        }
        
        // Filtrer par date
        if (from_date) {
            sql += ` AND e.start_date >= ?`;
            params.push(from_date);
        }
        
        if (to_date) {
            sql += ` AND e.start_date <= ?`;
            params.push(to_date);
        }
        
        // Ne montrer que les événements publics si l'utilisateur n'est pas connecté
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            sql += ` AND e.is_member_only = FALSE`;
        }
        
        sql += ` ORDER BY e.start_date ASC, e.start_time ASC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));
        
        const [events] = await pool.execute(sql, params);
        
        res.json({
            success: true,
            events,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                total: events.length
            }
        });
        
    } catch (error) {
        console.error('Erreur lors de la récupération des événements:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la récupération des événements' 
        });
    }
});

/**
 * Récupérer un événement par ID
 * GET /api/events/:id
 */
router.get('/:id', async (req, res) => {
    try {
        const eventId = parseInt(req.params.id);
        
        if (isNaN(eventId)) {
            return res.status(400).json({ 
                success: false, 
                message: 'ID d\'événement invalide' 
            });
        }

        const [events] = await pool.execute(`
            SELECT 
                e.*,
                (SELECT COUNT(*) FROM event_registrations er WHERE er.event_id = e.id AND er.status = 'registered') as participants_count,
                u.firstname as creator_firstname,
                u.lastname as creator_lastname
            FROM events e
            LEFT JOIN users u ON e.created_by = u.id
            WHERE e.id = ? AND e.status = 'published'
        `, [eventId]);
        
        if (events.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Événement non trouvé' 
            });
        }

        const event = events[0];

        // Vérifier l'accès pour les événements membres uniquement
        if (event.is_member_only) {
            const token = req.headers.authorization?.split(' ')[1];
            
            if (!token) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Accès réservé aux membres connectés',
                    requiresAuth: true
                });
            }

            try {
                const jwt = require('jsonwebtoken');
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'cos-creusot-secret-key');
                
                if (!decoded.isApproved) {
                    return res.status(403).json({ 
                        success: false, 
                        message: 'Votre compte doit être approuvé pour accéder à cet événement',
                        requiresApproval: true
                    });
                }
            } catch (error) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Token invalide ou expiré',
                    requiresAuth: true
                });
            }
        }

        res.json({ 
            success: true, 
            event 
        });

    } catch (error) {
        console.error('Erreur lors de la récupération de l\'événement:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la récupération de l\'événement' 
        });
    }
});

/**
 * Créer un nouvel événement (Admin uniquement)
 * POST /api/events
 */
router.post('/', authenticateToken, requireAdmin, [
    body('title').notEmpty().isLength({ min: 3, max: 255 }).withMessage('Le titre doit contenir entre 3 et 255 caractères'),
    body('description').optional().isLength({ max: 2000 }).withMessage('La description ne peut dépasser 2000 caractères'),
    body('start_date').isDate().withMessage('Date de début invalide'),
    body('end_date').optional().isDate().withMessage('Date de fin invalide'),
    body('start_time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Heure de début invalide (HH:MM)'),
    body('end_time').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Heure de fin invalide (HH:MM)'),
    body('location').optional().isLength({ max: 255 }).withMessage('Lieu trop long'),
    body('category').optional().isIn(['general', 'voyage', 'retraite', 'activite']).withMessage('Catégorie invalide'),
    body('max_participants').optional().isInt({ min: 1 }).withMessage('Nombre de participants invalide'),
    body('is_member_only').optional().isBoolean().withMessage('Valeur membre uniquement invalide')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false, 
                message: 'Données invalides',
                errors: errors.array() 
            });
        }

        const {
            title,
            description,
            start_date,
            end_date,
            start_time,
            end_time,
            location,
            category = 'general',
            max_participants,
            is_member_only = false
        } = req.body;

        // Debug: vérifier les paramètres reçus
        console.log('📋 Paramètres reçus pour création d\'événement:');
        console.log('- title:', title);
        console.log('- description:', description);
        console.log('- start_date:', start_date);
        console.log('- end_date:', end_date);
        console.log('- start_time:', start_time);
        console.log('- end_time:', end_time);
        console.log('- location:', location);
        console.log('- category:', category);
        console.log('- max_participants:', max_participants);
        console.log('- is_member_only:', is_member_only);
        console.log('- created_by:', req.user.userId);

        // Validation des champs obligatoires
        if (!title || !start_date || !start_time) {
            return res.status(400).json({
                success: false,
                message: 'Les champs titre, date de début et heure de début sont obligatoires'
            });
        }

        // Vérifier que la date de fin n'est pas antérieure à la date de début
        if (end_date && new Date(end_date) < new Date(start_date)) {
            return res.status(400).json({
                success: false,
                message: 'La date de fin ne peut être antérieure à la date de début'
            });
        }

        // Préparer les paramètres en s'assurant qu'aucun n'est undefined
        const params = [
            title || null,
            description || null,
            start_date || null,
            end_date || null,
            start_time || null,
            end_time || null,
            location || null,
            category || 'general',
            max_participants ? parseInt(max_participants) : null,
            is_member_only ? 1 : 0, // Convertir boolean en int pour MySQL
            req.user.userId || null
        ];

        // Debug: vérifier les paramètres finaux
        console.log('🔧 Paramètres SQL finaux:', params);

        const [result] = await pool.execute(`
            INSERT INTO events (
                title, description, start_date, end_date, start_time, end_time, 
                location, category, max_participants, is_member_only, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, params);

        res.status(201).json({
            success: true,
            message: 'Événement créé avec succès',
            eventId: result.insertId
        });

    } catch (error) {
        console.error('Erreur lors de la création de l\'événement:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la création de l\'événement' 
        });
    }
});

/**
 * Mettre à jour un événement (Admin uniquement)
 * PUT /api/events/:id
 */
router.put('/:id', authenticateToken, requireAdmin, [
    body('title').optional().isLength({ min: 1, max: 255 }).withMessage('Le titre doit contenir entre 1 et 255 caractères'),
    body('description').optional().isLength({ max: 2000 }).withMessage('La description ne peut dépasser 2000 caractères'),
    body('start_date').optional().isLength({ min: 1 }).withMessage('Date de début requise'),
    body('end_date').optional().isLength({ min: 0 }).withMessage('Date de fin invalide'),
    body('start_time').optional().isLength({ min: 1 }).withMessage('Heure de début requise'),
    body('end_time').optional().isLength({ min: 0 }).withMessage('Heure de fin invalide'),
    body('location').optional().isLength({ max: 255 }).withMessage('Lieu trop long'),
    body('category').optional().isLength({ min: 1 }).withMessage('Catégorie requise'),
    body('max_participants').optional().isNumeric().withMessage('Nombre de participants doit être numérique'),
    body('is_member_only').optional().toBoolean(),
    body('status').optional().isIn(['draft', 'published', 'cancelled']).withMessage('Statut invalide')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        
        // Debug: afficher les données reçues pour la mise à jour
        console.log('🔄 Mise à jour événement ID:', req.params.id);
        console.log('📋 Données reçues:', req.body);
        
        if (!errors.isEmpty()) {
            console.log('❌ Erreurs de validation:', errors.array());
            return res.status(400).json({ 
                success: false, 
                message: 'Données invalides',
                errors: errors.array() 
            });
        }

        const eventId = parseInt(req.params.id);
        const updateFields = [];
        const updateValues = [];

        // Construire la requête de mise à jour dynamiquement
        const allowedFields = [
            'title', 'description', 'start_date', 'end_date', 'start_time', 'end_time',
            'location', 'category', 'max_participants', 'is_member_only', 'status'
        ];

        allowedFields.forEach(field => {
            if (req.body.hasOwnProperty(field)) {
                updateFields.push(`${field} = ?`);
                updateValues.push(req.body[field]);
            }
        });

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Aucune donnée à mettre à jour'
            });
        }

        updateValues.push(eventId);

        const [result] = await pool.execute(`
            UPDATE events SET ${updateFields.join(', ')} WHERE id = ?
        `, updateValues);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Événement non trouvé'
            });
        }

        res.json({
            success: true,
            message: 'Événement mis à jour avec succès'
        });

    } catch (error) {
        console.error('Erreur lors de la mise à jour de l\'événement:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la mise à jour de l\'événement' 
        });
    }
});

/**
 * Supprimer un événement (Admin uniquement)
 * DELETE /api/events/:id
 */
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const eventId = parseInt(req.params.id);

        const [result] = await pool.execute('DELETE FROM events WHERE id = ?', [eventId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Événement non trouvé'
            });
        }

        res.json({
            success: true,
            message: 'Événement supprimé avec succès'
        });

    } catch (error) {
        console.error('Erreur lors de la suppression de l\'événement:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la suppression de l\'événement' 
        });
    }
});

/**
 * S'inscrire à un événement (Membres connectés uniquement)
 * POST /api/events/:id/register
 */
router.post('/:id/register', authenticateToken, async (req, res) => {
    try {
        const eventId = parseInt(req.params.id);
        const userId = req.user.userId;

        // Vérifier que l'événement existe et que l'utilisateur peut s'y inscrire
        const [events] = await pool.execute(`
            SELECT id, title, max_participants, is_member_only,
                   (SELECT COUNT(*) FROM event_registrations WHERE event_id = ? AND status = 'registered') as current_registrations
            FROM events 
            WHERE id = ? AND status = 'published'
        `, [eventId, eventId]);

        if (events.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Événement non trouvé'
            });
        }

        const event = events[0];

        // Vérifier si l'événement est complet
        if (event.max_participants && event.current_registrations >= event.max_participants) {
            return res.status(400).json({
                success: false,
                message: 'Événement complet'
            });
        }

        // Vérifier si l'utilisateur est déjà inscrit
        const [existing] = await pool.execute(
            'SELECT id FROM event_registrations WHERE event_id = ? AND user_id = ?',
            [eventId, userId]
        );

        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Vous êtes déjà inscrit à cet événement'
            });
        }

        // Inscrire l'utilisateur
        await pool.execute(
            'INSERT INTO event_registrations (event_id, user_id) VALUES (?, ?)',
            [eventId, userId]
        );

        res.json({
            success: true,
            message: 'Inscription réussie à l\'événement'
        });

    } catch (error) {
        console.error('Erreur lors de l\'inscription:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de l\'inscription' 
        });
    }
});

/**
 * Se désinscrire d'un événement
 * DELETE /api/events/:id/register
 */
router.delete('/:id/register', authenticateToken, async (req, res) => {
    try {
        const eventId = parseInt(req.params.id);
        const userId = req.user.userId;

        const [result] = await pool.execute(
            'DELETE FROM event_registrations WHERE event_id = ? AND user_id = ?',
            [eventId, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Inscription non trouvée'
            });
        }

        res.json({
            success: true,
            message: 'Désinscription réussie'
        });

    } catch (error) {
        console.error('Erreur lors de la désinscription:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la désinscription' 
        });
    }
});

/**
 * Récupérer les inscriptions de l'utilisateur courant
 * GET /api/events/user/registrations
 */
router.get('/user/registrations', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        const [registrations] = await pool.execute(`
            SELECT 
                er.*,
                e.title,
                e.description,
                e.start_date,
                e.end_date,
                e.start_time,
                e.end_time,
                e.location,
                e.category
            FROM event_registrations er
            JOIN events e ON er.event_id = e.id
            WHERE er.user_id = ? AND e.status = 'published'
            ORDER BY e.start_date ASC, e.start_time ASC
        `, [userId]);

        res.json({
            success: true,
            registrations
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des inscriptions:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la récupération des inscriptions' 
        });
    }
});

/**
 * Récupérer les inscriptions d'un événement (Admin uniquement)
 * GET /api/events/:id/registrations
 */
router.get('/:id/registrations', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const eventId = parseInt(req.params.id);

        const [registrations] = await pool.execute(`
            SELECT 
                er.*,
                u.firstname,
                u.lastname,
                u.email,
                u.phone
            FROM event_registrations er
            JOIN users u ON er.user_id = u.id
            WHERE er.event_id = ?
            ORDER BY er.registration_date ASC
        `, [eventId]);

        res.json({
            success: true,
            registrations
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des inscriptions:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la récupération des inscriptions' 
        });
    }
});

/**
 * Exporter les inscriptions d'un événement en CSV (Admin uniquement)
 * GET /api/events/:id/export
 */
router.get('/:id/export', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const eventId = parseInt(req.params.id);

        // Récupérer les informations de l'événement
        const [events] = await pool.execute(
            'SELECT title FROM events WHERE id = ?',
            [eventId]
        );

        if (events.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Événement non trouvé'
            });
        }

        // Récupérer les inscriptions
        const [registrations] = await pool.execute(`
            SELECT 
                u.firstname as 'Prénom',
                u.lastname as 'Nom',
                u.email as 'Email',
                u.phone as 'Téléphone',
                DATE_FORMAT(er.registration_date, '%d/%m/%Y %H:%i') as 'Date inscription',
                er.status as 'Statut'
            FROM event_registrations er
            JOIN users u ON er.user_id = u.id
            WHERE er.event_id = ?
            ORDER BY er.registration_date ASC
        `, [eventId]);

        if (registrations.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Aucune inscription trouvée'
            });
        }

        // Créer le CSV
        const headers = Object.keys(registrations[0]);
        const csvContent = [
            headers.join(','),
            ...registrations.map(row => 
                headers.map(header => `"${row[header] || ''}"`).join(',')
            )
        ].join('\n');

        // Définir les headers pour le téléchargement
        const filename = `inscriptions_${events[0].title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
        
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', Buffer.byteLength(csvContent, 'utf8'));

        // Ajouter le BOM UTF-8 pour Excel
        res.write('\uFEFF');
        res.end(csvContent, 'utf8');

    } catch (error) {
        console.error('Erreur lors de l\'export:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de l\'export' 
        });
    }
});

module.exports = router;