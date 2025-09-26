const express = require('express');
const User = require('../models/User');
const Article = require('../models/Article');
const { authenticateToken, requireAdmin, logAction } = require('../middleware/auth');
const { pool } = require('../config/database');

const router = express.Router();

// Toutes les routes admin nécessitent une authentification admin
router.use(authenticateToken, requireAdmin);

// GET - Dashboard avec statistiques générales
router.get('/dashboard', async (req, res) => {
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
router.get('/users', async (req, res) => {
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
router.get('/users/pending', async (req, res) => {
    try {
        const users = await User.getAll('pending');
        res.json(users);

    } catch (error) {
        console.error('Erreur lors de la récupération des utilisateurs en attente:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// PATCH - Approuver un utilisateur
router.patch('/users/:id/approve', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }
        
        const updated = await User.updateStatus(req.params.id, 'approved', req.user.id);
        
        if (!updated) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        // Logger l'action
        await logAction(req, 'approve_user', 'user', req.params.id, {
            userEmail: user.email,
            approvedBy: req.user.email
        });

        res.json({ message: 'Utilisateur approuvé avec succès' });

    } catch (error) {
        console.error('Erreur lors de l\'approbation de l\'utilisateur:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// PATCH - Rejeter un utilisateur
router.patch('/users/:id/reject', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }
        
        const updated = await User.updateStatus(req.params.id, 'rejected', req.user.id);
        
        if (!updated) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        // Logger l'action
        await logAction(req, 'reject_user', 'user', req.params.id, {
            userEmail: user.email,
            rejectedBy: req.user.email
        });

        res.json({ message: 'Utilisateur rejeté avec succès' });

    } catch (error) {
        console.error('Erreur lors du rejet de l\'utilisateur:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// DELETE - Supprimer un utilisateur
router.delete('/users/:id', async (req, res) => {
    try {
        // Empêcher la suppression de son propre compte
        if (parseInt(req.params.id) === req.user.id) {
            return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
        }

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        const deleted = await User.delete(req.params.id);
        
        if (!deleted) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        // Logger l'action
        await logAction(req, 'delete_user', 'user', req.params.id, {
            userEmail: user.email,
            deletedBy: req.user.email
        });

        res.json({ message: 'Utilisateur supprimé avec succès' });

    } catch (error) {
        console.error('Erreur lors de la suppression de l\'utilisateur:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// GET - Logs de connexion
router.get('/logs/login', async (req, res) => {
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
router.get('/logs/visit', async (req, res) => {
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
router.get('/logs/action', async (req, res) => {
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

// GET - Statistiques des événements
router.get('/stats/events', async (req, res) => {
    try {
        // Statistiques générales des événements
        const [eventStats] = await pool.execute(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'published' AND start_date >= CURDATE() THEN 1 ELSE 0 END) as upcoming,
                SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as drafts,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
            FROM events
        `);

        // Statistiques des inscriptions
        const [registrationStats] = await pool.execute(`
            SELECT 
                COUNT(*) as total_registrations,
                COUNT(DISTINCT event_id) as events_with_registrations
            FROM event_registrations
            WHERE status = 'registered'
        `);

        // Moyenne des participants par événement
        const [avgStats] = await pool.execute(`
            SELECT 
                ROUND(AVG(participants_count), 1) as avg_participants
            FROM (
                SELECT 
                    e.id,
                    COUNT(er.id) as participants_count
                FROM events e
                LEFT JOIN event_registrations er ON e.id = er.event_id AND er.status = 'registered'
                WHERE e.status = 'published'
                GROUP BY e.id
            ) as event_counts
        `);

        const stats = {
            total: eventStats[0].total || 0,
            upcoming: eventStats[0].upcoming || 0,
            drafts: eventStats[0].drafts || 0,
            cancelled: eventStats[0].cancelled || 0,
            total_registrations: registrationStats[0].total_registrations || 0,
            events_with_registrations: registrationStats[0].events_with_registrations || 0,
            avg_participants: avgStats[0].avg_participants || 0
        };

        res.json({
            success: true,
            stats
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques d\'événements:', error);
        // Retourner des valeurs par défaut en cas d'erreur
        res.json({
            success: true,
            stats: {
                total: 0,
                upcoming: 0,
                drafts: 0,
                cancelled: 0,
                total_registrations: 0,
                events_with_registrations: 0,
                avg_participants: 0
            }
        });
    }
});

// Messages de contact - Récupérer tous les messages
router.get('/messages', async (req, res) => {
    try {
        const { status } = req.query;
        
        let sql = `
            SELECT 
                id,
                first_name,
                last_name,
                email,
                phone,
                subject,
                message,
                newsletter,
                read_at,
                created_at
            FROM contact_messages
        `;
        
        const params = [];
        
        // Filtrer par statut si spécifié
        if (status && status !== '') {
            if (status === 'new') {
                sql += ' WHERE read_at IS NULL';
            } else if (status === 'read') {
                sql += ' WHERE read_at IS NOT NULL';
            }
            // Note: pas de statut 'replied' dans cette table
        }
        
        sql += ' ORDER BY created_at DESC';
        
        const [messages] = await pool.query(sql, params);
        
        // Ajouter le statut calculé et le nom complet
        const processedMessages = messages.map(msg => ({
            ...msg,
            name: `${msg.first_name} ${msg.last_name}`,
            status: msg.read_at ? 'read' : 'new'
        }));
        
        // Statistiques
        const [stats] = await pool.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN read_at IS NULL THEN 1 ELSE 0 END) as new_count,
                SUM(CASE WHEN read_at IS NOT NULL THEN 1 ELSE 0 END) as read_count
            FROM contact_messages
        `);
        
        res.json({
            messages: processedMessages,
            stats: {
                ...stats[0],
                replied_count: 0 // Pas de statut replied dans cette table
            }
        });
        
    } catch (error) {
        console.error('Erreur lors de la récupération des messages:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Messages de contact - Récupérer un message spécifique
router.get('/messages/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const [messages] = await pool.query(`
            SELECT 
                id,
                first_name,
                last_name,
                email,
                phone,
                subject,
                message,
                newsletter,
                read_at,
                created_at
            FROM contact_messages 
            WHERE id = ?
        `, [id]);
        
        if (messages.length === 0) {
            return res.status(404).json({ error: 'Message non trouvé' });
        }
        
        const message = messages[0];
        
        // Ajouter le nom complet et le statut calculé
        const processedMessage = {
            ...message,
            name: `${message.first_name} ${message.last_name}`,
            status: message.read_at ? 'read' : 'new'
        };
        
        res.json(processedMessage);
        
    } catch (error) {
        console.error('Erreur lors de la récupération du message:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Messages de contact - Mettre à jour le statut d'un message (marquer comme lu)
router.put('/messages/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        // Adapter au schéma réel de la table
        if (status === 'read') {
            await pool.query(`
                UPDATE contact_messages 
                SET read_at = NOW() 
                WHERE id = ?
            `, [id]);
        } else if (status === 'new') {
            await pool.query(`
                UPDATE contact_messages 
                SET read_at = NULL 
                WHERE id = ?
            `, [id]);
        } else {
            return res.status(400).json({ error: 'Statut invalide. Seuls "new" et "read" sont supportés.' });
        }
        
        res.json({ message: 'Statut mis à jour' });
        
    } catch (error) {
        console.error('Erreur lors de la mise à jour du statut:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Messages de contact - Marquer tous les messages comme lus
router.put('/messages/mark-all-read', async (req, res) => {
    try {
        await pool.query(`
            UPDATE contact_messages 
            SET read_at = NOW() 
            WHERE read_at IS NULL
        `);
        
        res.json({ message: 'Tous les messages ont été marqués comme lus' });
        
    } catch (error) {
        console.error('Erreur lors de la mise à jour des messages:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Messages de contact - Supprimer un message
router.delete('/messages/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        await pool.query('DELETE FROM contact_messages WHERE id = ?', [id]);
        
        res.json({ message: 'Message supprimé' });
        
    } catch (error) {
        console.error('Erreur lors de la suppression du message:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Utilisateurs - Modifier le rôle d'un utilisateur
router.patch('/users/:id/role', async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;
        
        // Vérifier que le rôle est valide
        const validRoles = ['member', 'admin', 'retraite'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ 
                error: 'Rôle invalide. Les rôles autorisés sont: member, admin, retraite' 
            });
        }
        
        // Vérifier que l'utilisateur existe
        const [existingUsers] = await pool.execute(
            'SELECT id, email, role FROM users WHERE id = ?', 
            [id]
        );
        
        if (existingUsers.length === 0) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }
        
        const user = existingUsers[0];
        
        // Empêcher de se retirer ses propres droits admin
        if (user.id === req.user.id && user.role === 'admin' && role !== 'admin') {
            return res.status(403).json({ 
                error: 'Vous ne pouvez pas vous retirer vos propres droits administrateur' 
            });
        }
        
        // Mettre à jour le rôle
        await pool.execute(
            'UPDATE users SET role = ? WHERE id = ?', 
            [role, id]
        );
        
        // Logger l'action
        await logAction(req, 'change_user_role', 'user', id, {
            userEmail: user.email,
            oldRole: user.role,
            newRole: role,
            changedBy: req.user.email
        });
        
        res.json({ 
            success: true, 
            message: `Rôle de l'utilisateur ${user.email} mis à jour vers ${role}`,
            user: {
                id: user.id,
                email: user.email,
                role: role
            }
        });
        
    } catch (error) {
        console.error('Erreur lors de la modification du rôle:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router;