const { pool } = require('./config/database');

(async () => {
    try {
        const [result] = await pool.execute("SHOW COLUMNS FROM users WHERE Field = 'role'");
        console.log('Rôles disponibles:', result[0].Type);
    } catch (e) {
        console.error('Erreur:', e.message);
    }
    process.exit();
})();