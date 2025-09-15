const { pool } = require('../config/database');

// Middleware pour logger les visites
const logVisit = async (req, res, next) => {
    try {
        const userId = req.user ? req.user.id : null;
        const ip = req.ip || req.connection.remoteAddress;
        const userAgent = req.get('User-Agent');
        const page = req.originalUrl;
        const referrer = req.get('Referrer') || null;
        const sessionId = req.sessionID || null;

        await pool.execute(
            'INSERT INTO visit_logs (user_id, ip_address, user_agent, page, referrer, session_id) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, ip, userAgent, page, referrer, sessionId]
        );
    } catch (error) {
        console.error('Erreur lors du logging de visite:', error);
    }
    next();
};

module.exports = { logVisit };