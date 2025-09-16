const { pool } = require('./config/database');

(async () => {
    try {
        await pool.execute("ALTER TABLE users MODIFY COLUMN role ENUM('member','admin','retraite') DEFAULT 'member'");
        console.log('✅ Rôle retraité ajouté');
    } catch (e) {
        console.error('Erreur:', e.message);
    }
    process.exit();
})();