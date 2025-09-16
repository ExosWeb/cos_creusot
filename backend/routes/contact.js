const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');

const router = express.Router();

// Validation pour le formulaire de contact
const contactValidation = [
    body('firstName').trim().isLength({ min: 2 }).withMessage('Le prénom doit contenir au moins 2 caractères'),
    body('lastName').trim().isLength({ min: 2 }).withMessage('Le nom doit contenir au moins 2 caractères'),
    body('email').isEmail().withMessage('Email invalide'),
    body('phone').optional().isLength({ min: 10, max: 15 }).withMessage('Numéro de téléphone invalide'),
    body('subject').notEmpty().withMessage('Le sujet est requis'),
    body('message').trim().isLength({ min: 10 }).withMessage('Le message doit contenir au moins 10 caractères')
];

// Route pour recevoir les messages de contact
router.post('/', contactValidation, async (req, res) => {
    console.log('📧 Nouveau message de contact:', req.body);
    
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('❌ Erreurs de validation:', errors.array());
            return res.status(400).json({ errors: errors.array() });
        }

        const { firstName, lastName, email, phone, subject, message, newsletter } = req.body;
        const ip = req.ip || req.connection.remoteAddress;
        const userAgent = req.get('User-Agent');

        // Enregistrer le message dans la base de données
        const [result] = await pool.execute(`
            INSERT INTO contact_messages 
            (first_name, last_name, email, phone, subject, message, newsletter, ip_address, user_agent, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `, [firstName, lastName, email, phone, subject, message, newsletter ? 1 : 0, ip, userAgent]);

        console.log('✅ Message de contact enregistré avec ID:', result.insertId);

        // TODO: Ici on pourrait ajouter l'envoi d'email à l'administration
        // await sendEmailToAdmin({ firstName, lastName, email, subject, message });

        res.status(201).json({ 
            message: 'Votre message a été envoyé avec succès ! Nous vous répondrons dans les plus brefs délais.',
            messageId: result.insertId
        });

    } catch (error) {
        console.error('❌ Erreur lors de l\'enregistrement du message:', error);
        res.status(500).json({ error: 'Erreur serveur lors de l\'envoi du message' });
    }
});

// Route pour récupérer les messages (admin seulement)
router.get('/messages', async (req, res) => {
    try {
        const [messages] = await pool.execute(`
            SELECT 
                id, first_name, last_name, email, phone, subject, message, 
                newsletter, ip_address, created_at, read_at
            FROM contact_messages 
            ORDER BY created_at DESC
            LIMIT 50
        `);

        res.json(messages);
    } catch (error) {
        console.error('❌ Erreur lors de la récupération des messages:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Route pour marquer un message comme lu
router.patch('/messages/:id/read', async (req, res) => {
    try {
        const { id } = req.params;
        
        await pool.execute(`
            UPDATE contact_messages 
            SET read_at = NOW() 
            WHERE id = ?
        `, [id]);

        res.json({ message: 'Message marqué comme lu' });
    } catch (error) {
        console.error('❌ Erreur lors de la mise à jour du message:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router;