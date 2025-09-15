const { pool } = require('../config/database');

class Article {
    static async create(articleData) {
        const { title, content, excerpt, category, author_id, image_url, status = 'draft' } = articleData;
        
        const [result] = await pool.execute(
            'INSERT INTO articles (title, content, excerpt, category, author_id, image_url, status, published_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [title, content, excerpt, category, author_id, image_url, status, status === 'published' ? new Date() : null]
        );
        
        return result.insertId;
    }

    static async findById(id) {
        const [rows] = await pool.execute(`
            SELECT a.*, u.firstname, u.lastname 
            FROM articles a 
            JOIN users u ON a.author_id = u.id 
            WHERE a.id = ?
        `, [id]);
        return rows[0];
    }

    static async getAll(options = {}) {
        let query = `
            SELECT a.*, u.firstname, u.lastname 
            FROM articles a 
            JOIN users u ON a.author_id = u.id
        `;
        let params = [];
        let conditions = [];

        if (options.status) {
            conditions.push('a.status = ?');
            params.push(options.status);
        }

        if (options.category) {
            conditions.push('a.category = ?');
            params.push(options.category);
        }

        if (options.featured !== undefined) {
            conditions.push('a.featured = ?');
            params.push(options.featured);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY ';
        if (options.featured) {
            query += 'a.featured DESC, ';
        }
        query += 'a.published_at DESC, a.created_at DESC';

        if (options.limit) {
            query += ' LIMIT ?';
            params.push(parseInt(options.limit));
        }

        const [rows] = await pool.execute(query, params);
        return rows;
    }

    static async getFeatured(limit = 5) {
        return this.getAll({ 
            status: 'published', 
            featured: true, 
            limit 
        });
    }

    static async getByCategory(category, limit = null) {
        return this.getAll({ 
            status: 'published', 
            category, 
            limit 
        });
    }

    static async update(id, articleData) {
        const { title, content, excerpt, category, image_url, status, featured } = articleData;
        
        const [result] = await pool.execute(
            'UPDATE articles SET title = ?, content = ?, excerpt = ?, category = ?, image_url = ?, status = ?, featured = ?, published_at = ?, updated_at = NOW() WHERE id = ?',
            [title, content, excerpt, category, image_url, status, featured, status === 'published' ? new Date() : null, id]
        );
        
        return result.affectedRows > 0;
    }

    static async delete(id) {
        const [result] = await pool.execute(
            'DELETE FROM articles WHERE id = ?',
            [id]
        );
        return result.affectedRows > 0;
    }

    static async toggleFeatured(id) {
        const [result] = await pool.execute(
            'UPDATE articles SET featured = NOT featured WHERE id = ?',
            [id]
        );
        return result.affectedRows > 0;
    }

    static async getStats() {
        const [stats] = await pool.execute(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as published,
                SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as drafts,
                SUM(CASE WHEN featured = 1 THEN 1 ELSE 0 END) as featured
            FROM articles
        `);
        return stats[0];
    }
}

module.exports = Article;