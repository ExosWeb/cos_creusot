const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const { testConnection } = require('./config/database');
const { logVisit } = require('./middleware/logger');

// Import des routes
const authRoutes = require('./routes/auth');
const articleRoutes = require('./routes/articles');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration CORS
const corsOptions = {
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000', process.env.FRONTEND_URL || 'http://localhost:8080'],
    credentials: true,
    optionsSuccessStatus: 200
};

// Middleware de sécurité
app.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            scriptSrcAttr: ["'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"]
        }
    }
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limite chaque IP à 100 requêtes par windowMs
    message: 'Trop de requêtes depuis cette IP, réessayez plus tard.'
});

//  Rate limiting plus strict pour l'authentification
const authLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes au lieu de 15
    max: process.env.NODE_ENV === 'production' ? 5 : 20, // 20 tentatives en développement, 5 en production
    message: JSON.stringify({ 
        error: 'Trop de tentatives de connexion, réessayez plus tard.',
        retryAfter: '5 minutes'
    }),
    standardHeaders: true,
    legacyHeaders: false
});

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Trust proxy pour obtenir les vraies IP
app.set('trust proxy', 1);

// Logger les visites (sauf pour les routes API)
app.use((req, res, next) => {
    if (!req.originalUrl.startsWith('/api/')) {
        logVisit(req, res, () => {});
    }
    next();
});

// Application des middlewares
app.use('/api/auth', authLimiter);
app.use('/api', limiter);

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/admin', adminRoutes);

// Servir les fichiers statiques du frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Route pour servir les pages HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/connexion', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

app.get('/inscription', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/register.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/admin.html'));
});

app.get('/avantages', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/avantages.html'));
});

app.get('/voyages', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/voyages.html'));
});

app.get('/retraites', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/retraites.html'));
});

app.get('/evenements', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/evenements.html'));
});

// Route catch-all pour les URLs non trouvées (SPA)
app.get('*', (req, res) => {
    if (req.originalUrl.startsWith('/api/')) {
        res.status(404).json({ error: 'Route API non trouvée' });
    } else {
        res.sendFile(path.join(__dirname, '../frontend/index.html'));
    }
});

// Gestion globale des erreurs
app.use((error, req, res, next) => {
    console.error('Erreur non gérée:', error);
    res.status(500).json({ 
        error: process.env.NODE_ENV === 'production' 
            ? 'Erreur serveur interne' 
            : error.message 
    });
});

// Démarrage du serveur
const startServer = async () => {
    try {
        // Tester la connexion à la base de données
        await testConnection();
        
        app.listen(PORT, () => {
            console.log(`🚀 Serveur COS Creusot démarré sur le port ${PORT}`);
            console.log(`📱 Frontend accessible sur: http://localhost:${PORT}`);
            console.log(`🔧 API accessible sur: http://localhost:${PORT}/api`);
            console.log(`📊 Panel admin: http://localhost:${PORT}/admin`);
        });
    } catch (error) {
        console.error('❌ Impossible de démarrer le serveur:', error);
        process.exit(1);
    }
};

// Gestion propre de l'arrêt
process.on('SIGINT', () => {
    console.log('\n🛑 Arrêt du serveur...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Arrêt du serveur...');
    process.exit(0);
});

startServer();