const { pool } = require('../config/database');
const bcrypt = require('bcrypt');

class User {
    static async create(userData) {
        const { email, password, firstname, lastname, phone, address } = userData;
        
        // En mode développement, on stocke le mot de passe en clair
        const finalPassword = process.env.NODE_ENV === 'production' 
            ? await bcrypt.hash(password, 10)
            : password;
        
        const [result] = await pool.execute(
            'INSERT INTO users (email, password, firstname, lastname, phone, address) VALUES (?, ?, ?, ?, ?, ?)',
            [email, finalPassword, firstname, lastname, phone, address]
        );
        
        return result.insertId;
    }

    static async findByEmail(email) {
        const [rows] = await pool.execute(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );
        return rows[0];
    }

    static async findById(id) {
        const [rows] = await pool.execute(
            'SELECT id, email, firstname, lastname, phone, address, role, status, created_at, last_login FROM users WHERE id = ?',
            [id]
        );
        return rows[0];
    }

    static async getAll(status = null) {
        let query = 'SELECT id, email, firstname, lastname, phone, role, status, created_at, last_login FROM users';
        let params = [];
        
        if (status) {
            query += ' WHERE status = ?';
            params.push(status);
        }
        
        query += ' ORDER BY created_at DESC';
        
        const [rows] = await pool.execute(query, params);
        return rows;
    }

    static async updateStatus(userId, status, approvedBy = null) {
        const [result] = await pool.execute(
            'UPDATE users SET status = ?, approved_by = ?, approved_at = ? WHERE id = ?',
            [status, approvedBy, status === 'approved' ? new Date() : null, userId]
        );
        return result.affectedRows > 0;
    }

    static async updateLastLogin(userId) {
        await pool.execute(
            'UPDATE users SET last_login = NOW() WHERE id = ?',
            [userId]
        );
    }

    static async verifyPassword(plainPassword, storedPassword) {
        // En mode développement, comparaison directe
        if (process.env.NODE_ENV !== 'production') {
            return plainPassword === storedPassword;
        }
        
        // En production, utiliser bcrypt
        return bcrypt.compare(plainPassword, storedPassword);
    }

    static async changePassword(userId, newPassword) {
        // En mode développement, stocker en clair
        const finalPassword = process.env.NODE_ENV === 'production'
            ? await bcrypt.hash(newPassword, 10)
            : newPassword;
            
        const [result] = await pool.execute(
            'UPDATE users SET password = ? WHERE id = ?',
            [finalPassword, userId]
        );
        return result.affectedRows > 0;
    }

    static async delete(userId) {
        const [result] = await pool.execute(
            'DELETE FROM users WHERE id = ?',
            [userId]
        );
        return result.affectedRows > 0;
    }
}

module.exports = User;