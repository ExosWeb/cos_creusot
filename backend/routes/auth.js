const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { pool } = require('../config/database');
const { logAction } = require('../middleware/auth');

const router = express.Router();

// Validation pour l'inscription
const registerValidation = [
    body('email').isEmail().withMessage('Email invalide'),
    body('password').isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caractères'),
    body('firstname').trim().isLength({ min: 2 }).withMessage('Le prénom doit contenir au moins 2 caractères'),
    body('lastname').trim().isLength({ min: 2 }).withMessage('Le nom doit contenir au moins 2 caractères'),
    body('phone').optional().isLength({ min: 10, max: 15 }).withMessage('Numéro de téléphone invalide (10-15 caractères)')
];

// Validation pour la connexion
const loginValidation = [
    body('email').isEmail().withMessage('Email invalide'),
    body('password').notEmpty().withMessage('Mot de passe requis')
];

// Route d'inscription
router.post('/register', registerValidation, async (req, res) => {
    console.log('📝 Tentative d\'inscription:', req.body);
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('❌ Erreurs de validation:', errors.array());
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password, firstname, lastname, phone, address } = req.body;

        // Vérifier si l'utilisateur existe déjà
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            console.log('❌ Email déjà utilisé:', email);
            return res.status(400).json({ error: 'Cet email est déjà utilisé' });
        }

        // Créer l'utilisateur
        console.log('✅ Création utilisateur...');
        const userId = await User.create({
            email,
            password,
            firstname,
            lastname,
            phone,
            address
        });
        console.log('✅ Utilisateur créé avec ID:', userId);

        // Logger l'inscription
        const ip = req.ip || req.connection.remoteAddress;
        const userAgent = req.get('User-Agent');
        
        await pool.execute(
            'INSERT INTO action_logs (user_id, action, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)',
            [userId, 'register', JSON.stringify({ email, firstname, lastname }), ip, userAgent]
        );

        res.status(201).json({ 
            message: 'Inscription réussie. Votre compte est en attente d\'approbation par un administrateur.',
            userId 
        });

    } catch (error) {
        console.error('❌ Erreur lors de l\'inscription:', error);
        res.status(500).json({ error: 'Erreur serveur lors de l\'inscription' });
    }
});

// Helpers tokens
function signAccess(payload){
    const jwtSecret = process.env.JWT_SECRET || 'cos-creusot-secret-key-default-2024';
    return jwt.sign(payload, jwtSecret, { expiresIn: process.env.JWT_EXPIRES_IN || '30m' });
}
function signRefresh(payload){
    const refreshSecret = process.env.REFRESH_SECRET || (process.env.JWT_SECRET || 'cos-creusot-secret-key-default-2024') + '_refresh';
    return jwt.sign(payload, refreshSecret, { expiresIn: process.env.REFRESH_EXPIRES_IN || '7d' });
}
function verifyAccess(token){
    const jwtSecret = process.env.JWT_SECRET || 'cos-creusot-secret-key-default-2024';
    try {
        return jwt.verify(token, jwtSecret);
    } catch (error) {
        console.log('❌ Erreur verifyAccess:', error.name, error.message);
        if (error.name === 'JsonWebTokenError' && error.message === 'jwt malformed') {
            console.log('🔍 Token malformé détecté:', token.substring(0, 50) + '...');
        }
        throw error;
    }
}
function verifyRefresh(token){
    const refreshSecret = process.env.REFRESH_SECRET || (process.env.JWT_SECRET || 'cos-creusot-secret-key-default-2024') + '_refresh';
    return jwt.verify(token, refreshSecret);
}

// Route de connexion
router.post('/login', loginValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;
        const ip = req.ip || req.connection.remoteAddress;
        const userAgent = req.get('User-Agent');

        // Trouver l'utilisateur
        const user = await User.findByEmail(email);
        
        // Logger la tentative de connexion
        const logLogin = async (success, failureReason = null) => {
            await pool.execute(
                'INSERT INTO login_logs (user_id, email, ip_address, user_agent, success, failure_reason) VALUES (?, ?, ?, ?, ?, ?)',
                [user ? user.id : null, email, ip, userAgent, success, failureReason]
            );
        };

        if (!user) {
            await logLogin(false, 'Utilisateur non trouvé');
            return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
        }

        // Vérifier le mot de passe
        const isValidPassword = await User.verifyPassword(password, user.password);
        if (!isValidPassword) {
            await logLogin(false, 'Mot de passe incorrect');
            return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
        }

        // Vérifier le statut du compte
        if (user.status !== 'approved') {
            await logLogin(false, `Compte ${user.status}`);
            return res.status(403).json({ 
                error: user.status === 'pending' 
                    ? 'Votre compte est en attente d\'approbation' 
                    : 'Votre compte a été rejeté' 
            });
        }

        const accessToken = signAccess({ userId: user.id, email: user.email, role: user.role });
        const refreshToken = signRefresh({ userId: user.id, tokenId: crypto.randomUUID() });

        // Mettre à jour la dernière connexion
        await User.updateLastLogin(user.id);

        // Logger la connexion réussie
        await logLogin(true);

        // Refresh token en HttpOnly cookie
        res.cookie('refresh_token', refreshToken, {
            httpOnly: true,
            secure: !!process.env.COOKIE_SECURE, // activer en prod HTTPS
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.json({
            message: 'Connexion réussie',
            accessToken,
            expiresIn: process.env.JWT_EXPIRES_IN || '30m',
            user: {
                id: user.id,
                email: user.email,
                firstname: user.firstname,
                lastname: user.lastname,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Erreur lors de la connexion:', error);
        res.status(500).json({ error: 'Erreur serveur lors de la connexion' });
    }
});

// Route de vérification du token (renvoie éventuellement un nouveau si proche expiration)
router.get('/verify', async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    console.log('🔍 Vérification token:', !!token);

    if (!token) {
        console.log('❌ Token manquant');
        return res.status(401).json({ error: 'Token manquant' });
    }

    try {
        console.log('🔍 Token reçu (début):', token.substring(0, 20) + '...');
        console.log('🔍 Token longueur:', token.length);
        console.log('🔍 Token parties:', token.split('.').length);
        
        const decoded = verifyAccess(token);
        // Sliding: si <10 min restantes => renvoyer nouveau token
        let renewed = null;
        if (decoded.exp) {
            const now = Math.floor(Date.now()/1000);
            const remaining = decoded.exp - now;
            if (remaining < 600) { // 10 minutes
                renewed = signAccess({ userId: decoded.userId, email: decoded.email, role: decoded.role });
            }
        }
        console.log('🔓 Token décodé:', decoded);
        
        const user = await User.findById(decoded.userId);
        console.log('👤 Utilisateur trouvé:', !!user, user?.status);
        
        if (!user || user.status !== 'approved') {
            console.log('❌ Utilisateur invalide ou non approuvé');
            return res.status(401).json({ error: 'Token invalide' });
        }

        console.log('✅ Token valide pour:', user.email);
        res.json({
            valid: true,
            user: {
                id: user.id,
                email: user.email,
                firstname: user.firstname,
                lastname: user.lastname,
                role: user.role
            },
            renewedAccessToken: renewed || undefined
        });

    } catch (error) {
        console.log('💥 Erreur vérification token:', error.message);
        res.status(401).json({ error: 'Token invalide' });
    }
});

// Route de refresh explicite
router.post('/refresh', async (req, res) => {
    try {
        const cookieToken = req.cookies?.refresh_token;
        const provided = req.body?.refresh_token;
        const token = cookieToken || provided;
        if (!token) return res.status(401).json({ error: 'Refresh token manquant' });
        let decoded;
        try {
            decoded = verifyRefresh(token);
        } catch (e) {
            return res.status(401).json({ error: 'Refresh token invalide' });
        }
        // TODO: on pourrait stocker/valider tokenId côté DB pour permettre revoke.
        const newAccess = signAccess({ userId: decoded.userId, email: decoded.email, role: decoded.role });
        res.json({ accessToken: newAccess, expiresIn: process.env.JWT_EXPIRES_IN || '30m' });
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur refresh' });
    }
});

module.exports = router;