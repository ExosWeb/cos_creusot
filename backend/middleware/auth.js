const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

// Middleware d'authentification
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token d\'accès requis' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Vérifier si l'utilisateur existe toujours
        const [users] = await pool.execute(
            'SELECT id, email, role, status FROM users WHERE id = ?',
            [decoded.userId]
        );

        if (users.length === 0) {
            return res.status(401).json({ error: 'Utilisateur non trouvé' });
        }

        const user = users[0];
        
        if (user.status !== 'approved') {
            return res.status(403).json({ error: 'Compte non approuvé' });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Token invalide' });
    }
};

// Middleware pour vérifier le rôle admin
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Accès administrateur requis' });
    }
    next();
};

// Middleware pour logger les actions
const logAction = (action, resourceType = null) => {
    return async (req, res, next) => {
        try {
            const userId = req.user ? req.user.id : null;
            const resourceId = req.params.id || null;
            const ip = req.ip || req.connection.remoteAddress;
            const userAgent = req.get('User-Agent');
            
            await pool.execute(
                'INSERT INTO action_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [userId, action, resourceType, resourceId, JSON.stringify(req.body), ip, userAgent]
            );
        } catch (error) {
            console.error('Erreur lors du logging:', error);
        }
        next();
    };
};

module.exports = {
    authenticateToken,
    requireAdmin,
    logAction
};