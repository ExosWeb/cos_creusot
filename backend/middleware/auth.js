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
        const jwtSecret = process.env.JWT_SECRET || 'cos-creusot-secret-key-default-2024';
        const decoded = jwt.verify(token, jwtSecret);
        
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

// Middleware pour vérifier l'accès aux articles selon le rôle
const checkArticleAccess = (req, res, next) => {
    // Les admins ont accès à tout
    if (req.user.role === 'admin') {
        return next();
    }
    
        module.exports.authenticateToken = async (req, res, next) => {
            const authHeader = req.headers['authorization'] || req.headers['Authorization'];
            let token = null;
            if (authHeader) {
                if (authHeader.startsWith('Bearer ')) token = authHeader.slice(7);
                else token = authHeader; // fallback si déjà juste le token
            } else if (req.query && req.query.token) {
                token = req.query.token;
            }
        return next();
            if (!token) return res.status(401).json({ error: 'Accès non autorisé : token manquant' });
    }
    
    // Les membres normaux ont accès à tout sauf 'retraites'
    if (req.user.role === 'member') {
        req.articleFilter = { categoryNot: 'retraites' };
        return next();
    }
    
    return res.status(403).json({ error: 'Rôle non autorisé' });
};

// Middleware strict : seuls retraités et adhérents peuvent accéder aux articles
const requireMemberOrRetraite = async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentification requise pour accéder aux articles' });
    }

    // Admin, retraité ou membre adhérent peuvent accéder
    if (req.user.role === 'admin' || req.user.role === 'retraite' || req.user.role === 'member') {
        return next();
    }
    
    return res.status(403).json({ 
        error: 'Accès refusé. Seuls les membres et retraités peuvent consulter les articles.',
        message: 'Veuillez vous connecter avec un compte autorisé.'
    });
};

// Middleware pour filtrer les articles selon le rôle
const filterArticlesByRole = (req, res, next) => {
    if (req.user.role === 'retraite') {
        // Les retraités ne voient que les articles "retraites"
        req.roleFilter = { category: 'retraites' };
    } else if (req.user.role === 'member') {
        // Les membres voient tous les articles sauf "retraites"
        req.roleFilter = { categoryNot: 'retraites' };
    }
    // Les admins voient tout (pas de filtre)
    
    next();
};

const { logImportantAction } = require('./logger');

// Fonction pour logger seulement les actions importantes
const logAction = async (req, action, resourceType = null, resourceId = null, details = null) => {
    await logImportantAction(req, action, resourceType, resourceId, details);
};

module.exports = {
    authenticateToken,
    requireAdmin,
    checkArticleAccess,
    requireMemberOrRetraite,
    filterArticlesByRole,
    logAction
};