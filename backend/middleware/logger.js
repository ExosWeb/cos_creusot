const { pool } = require('../config/database');

// Actions importantes à logger (whitelist)
const IMPORTANT_ACTIONS = [
    // Articles
    'create_article',
    'update_article', 
    'delete_article',
    'read_article',
    
    // Utilisateurs
    'approve_user',
    'reject_user',
    'delete_user',
    'change_user_role',
    
    // Connexions importantes
    'admin_login',
    'failed_login_attempt',
    
    // Événements
    'create_event',
    'update_event',
    'delete_event',
    
    // Messages
    'send_contact_message',
    'mark_message_read',
    'delete_message'
];

// Fonction pour logger uniquement les actions importantes
const logImportantAction = async (req, action, resourceType = null, resourceId = null, details = null) => {
    // Ne logger que les actions importantes
    if (!IMPORTANT_ACTIONS.includes(action)) {
        return;
    }
    
    try {
        const userId = req.user ? req.user.id : null;
        const userEmail = req.user ? req.user.email : null;
        const ip = req.ip || req.connection.remoteAddress;
        const userAgent = req.get('User-Agent');

        await pool.execute(
            `INSERT INTO action_logs (user_id, user_email, action, resource_type, resource_id, ip_address, user_agent, details) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, userEmail, action, resourceType, resourceId, ip, userAgent, JSON.stringify(details)]
        );
    } catch (error) {
        console.error('Erreur lors du logging d\'action importante:', error);
    }
};

module.exports = { logImportantAction };