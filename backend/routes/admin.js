const express = require('express');
const User = require('../models/User');
const Article = require('../models/Article');
const { authenticateToken, requireAdmin, logAction } = require('../middleware/auth');
const { pool } = require('../config/database');

const router = express.Router();

// Toutes les routes admin nécessitent une authentification admin
router.use(authenticateToken, requireAdmin);

// GET - Dashboard avec statistiques générales
router.get('/dashboard', logAction('view_admin_dashboard'), async (req, res) => {
    try {
        let userStats, articleStats, loginStats, visitStats, recentActivity;

        // Statistiques utilisateurs avec gestion d'erreur
        try {
            const [userStatsResult] = await pool.execute(`
                SELECT 
                    COUNT(*) as total_users,
                    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_users,
                    SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_users,
                    SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_users,
                    SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admin_users
                FROM users
            `);
            userStats = userStatsResult[0];
        } catch (error) {
            console.log('Table users non trouvée, valeurs par défaut');
            userStats = {
                total_users: 0,
                pending_users: 0,
                approved_users: 0,
                rejected_users: 0,
                admin_users: 0
            };
        }

        // Statistiques articles avec gestion d'erreur
        try {
            articleStats = await Article.getStats();
        } catch (error) {
            console.log('Table articles non trouvée, valeurs par défaut');
            articleStats = {
                total: 0,
                published: 0,
                drafts: 0,
                featured: 0
            };
        }

        // Statistiques de connexion avec gestion d'erreur
        try {
            const [loginStatsResult] = await pool.execute(`
                SELECT 
                    COUNT(*) as total_logins,
                    SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_logins,
                    SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed_logins
                FROM login_logs 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            `);
            loginStats = loginStatsResult[0];
        } catch (error) {
            console.log('Table login_logs non trouvée, valeurs par défaut');
            loginStats = {
                total_logins: 0,
                successful_logins: 0,
                failed_logins: 0
            };
        }

        // Statistiques de visite avec gestion d'erreur
        try {
            const [visitStatsResult] = await pool.execute(`
                SELECT 
                    COUNT(*) as total_visits,
                    COUNT(DISTINCT ip_address) as unique_visitors,
                    COUNT(DISTINCT user_id) as logged_users_visits
                FROM visit_logs 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            `);
            visitStats = visitStatsResult[0];
        } catch (error) {
            console.log('Table visit_logs non trouvée, valeurs par défaut');
            visitStats = {
                total_visits: 0,
                unique_visitors: 0,
                logged_users_visits: 0
            };
        }

        // Activité récente avec gestion d'erreur
        try {
            const [recentActivityResult] = await pool.execute(`
                SELECT al.action, al.resource_type, al.created_at, 
                       u.firstname, u.lastname
                FROM action_logs al
                LEFT JOIN users u ON al.user_id = u.id
                ORDER BY al.created_at DESC
                LIMIT 10
            `);
            recentActivity = recentActivityResult;
        } catch (error) {
            console.log('Table action_logs non trouvée, valeurs par défaut');
            recentActivity = [];
        }

        res.json({
            users: userStats,
            articles: articleStats,
            logins: loginStats,
            visits: visitStats,
            recentActivity
        });

    } catch (error) {
        console.error('Erreur lors de la récupération du dashboard:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// GET - Liste des utilisateurs
router.get('/users', logAction('view_users_list', 'user'), async (req, res) => {
    try {
        const { status } = req.query;
        const users = await User.getAll(status);
        res.json(users);

    } catch (error) {
        console.error('Erreur lors de la récupération des utilisateurs:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// GET - Utilisateurs en attente
router.get('/users/pending', logAction('view_pending_users', 'user'), async (req, res) => {
    try {
        const users = await User.getAll('pending');
        res.json(users);

    } catch (error) {
        console.error('Erreur lors de la récupération des utilisateurs en attente:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// PATCH - Approuver un utilisateur
router.patch('/users/:id/approve', logAction('approve_user', 'user'), async (req, res) => {
    try {
        const updated = await User.updateStatus(req.params.id, 'approved', req.user.id);
        
        if (!updated) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        res.json({ message: 'Utilisateur approuvé avec succès' });

    } catch (error) {
        console.error('Erreur lors de l\'approbation de l\'utilisateur:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// PATCH - Rejeter un utilisateur
router.patch('/users/:id/reject', logAction('reject_user', 'user'), async (req, res) => {
    try {
        const updated = await User.updateStatus(req.params.id, 'rejected', req.user.id);
        
        if (!updated) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        res.json({ message: 'Utilisateur rejeté avec succès' });

    } catch (error) {
        console.error('Erreur lors du rejet de l\'utilisateur:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// DELETE - Supprimer un utilisateur
router.delete('/users/:id', logAction('delete_user', 'user'), async (req, res) => {
    try {
        // Empêcher la suppression de son propre compte
        if (parseInt(req.params.id) === req.user.id) {
            return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
        }

        const deleted = await User.delete(req.params.id);
        
        if (!deleted) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        res.json({ message: 'Utilisateur supprimé avec succès' });

    } catch (error) {
        console.error('Erreur lors de la suppression de l\'utilisateur:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// GET - Logs de connexion
router.get('/logs/login', logAction('view_login_logs'), async (req, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;
        
        const [logs] = await pool.execute(`
            SELECT ll.*, u.firstname, u.lastname 
            FROM login_logs ll
            LEFT JOIN users u ON ll.user_id = u.id
            ORDER BY ll.created_at DESC
            LIMIT ? OFFSET ?
        `, [parseInt(limit), parseInt(offset)]);

        res.json(logs);

    } catch (error) {
        console.error('Erreur lors de la récupération des logs de connexion:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// GET - Logs de visite
router.get('/logs/visit', logAction('view_visit_logs'), async (req, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;
        
        const [logs] = await pool.execute(`
            SELECT vl.*, u.firstname, u.lastname 
            FROM visit_logs vl
            LEFT JOIN users u ON vl.user_id = u.id
            ORDER BY vl.created_at DESC
            LIMIT ? OFFSET ?
        `, [parseInt(limit), parseInt(offset)]);

        res.json(logs);

    } catch (error) {
        console.error('Erreur lors de la récupération des logs de visite:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// GET - Logs d'action
router.get('/logs/action', logAction('view_action_logs'), async (req, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;
        
        const [logs] = await pool.execute(`
            SELECT al.*, u.firstname, u.lastname 
            FROM action_logs al
            LEFT JOIN users u ON al.user_id = u.id
            ORDER BY al.created_at DESC
            LIMIT ? OFFSET ?
        `, [parseInt(limit), parseInt(offset)]);

        res.json(logs);

    } catch (error) {
        console.error('Erreur lors de la récupération des logs d\'action:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router;