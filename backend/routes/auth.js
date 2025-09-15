const express = require('express');
const jwt = require('jsonwebtoken');
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
    body('phone').optional().isMobilePhone('fr-FR').withMessage('Numéro de téléphone invalide')
];

// Validation pour la connexion
const loginValidation = [
    body('email').isEmail().withMessage('Email invalide'),
    body('password').notEmpty().withMessage('Mot de passe requis')
];

// Route d'inscription
router.post('/register', registerValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password, firstname, lastname, phone, address } = req.body;

        // Vérifier si l'utilisateur existe déjà
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(400).json({ error: 'Cet email est déjà utilisé' });
        }

        // Créer l'utilisateur
        const userId = await User.create({
            email,
            password,
            firstname,
            lastname,
            phone,
            address
        });

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
        console.error('Erreur lors de l\'inscription:', error);
        res.status(500).json({ error: 'Erreur serveur lors de l\'inscription' });
    }
});

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

        // Créer le token JWT
        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        // Mettre à jour la dernière connexion
        await User.updateLastLogin(user.id);

        // Logger la connexion réussie
        await logLogin(true);

        res.json({
            message: 'Connexion réussie',
            token,
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

// Route de vérification du token
router.get('/verify', async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    console.log('🔍 Vérification token:', !!token);

    if (!token) {
        console.log('❌ Token manquant');
        return res.status(401).json({ error: 'Token manquant' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
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
            }
        });

    } catch (error) {
        console.log('💥 Erreur vérification token:', error.message);
        res.status(401).json({ error: 'Token invalide' });
    }
});

module.exports = router;