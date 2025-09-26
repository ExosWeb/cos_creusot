// Helpers de log (sécurisés en toutes pages)
window.dlog = window.dlog || function(...args) {
    try { console.debug(...args); } catch (_) {}
};
window.derror = window.derror || function(...args) {
    try { console.error(...args); } catch (_) {}
};

// Gestion de l'authentification côté client
class AuthManager {
    constructor() {
        this.token = localStorage.getItem('token');
        this.user = null;
        this.isVerifying = false; // Empêcher les vérifications multiples
        this.verificationPromise = null; // Stocker la promesse de vérification en cours
        this.isReady = false; // Flag pour indiquer si l'initialisation est terminée
        this.init();
    }

    async init() {
        if (this.token) {
            await this.verifyToken();
        }
        this.updateUI();
        this.bindEvents();
        this.isReady = true;
        dlog('🔧 AuthManager initialisé', { authenticated: this.isAuthenticated(), admin: this.isAdmin() });
    }

    // Méthode pour attendre que l'AuthManager soit prêt
    async waitForReady() {
        if (this.isReady) return;
        
        // Attendre que l'initialisation soit terminée
        while (!this.isReady) {
            await new Promise(resolve => setTimeout(resolve, 50));
        }
    }

    async verifyToken() {
        // Si une vérification est déjà en cours, attendre qu'elle se termine
        if (this.isVerifying && this.verificationPromise) {
            return this.verificationPromise;
        }

        if (!this.token) {
            return false;
        }

        this.isVerifying = true;
        
        this.verificationPromise = this._performTokenVerification();
        const result = await this.verificationPromise;
        
        this.isVerifying = false;
        this.verificationPromise = null;
        
        return result;
    }

    async _performTokenVerification() {
        try {
            // Vérifier que le token a un format valide avant de l'envoyer
            if (typeof this.token !== 'string' || this.token.trim() === '') {
                derror('❌ Token invalide dans localStorage:', this.token);
                this.clearCorruptedAuth();
                return false;
            }

            // Vérifier que le token ressemble à un JWT (3 parties séparées par des points)
            const tokenParts = this.token.split('.');
            if (tokenParts.length !== 3) {
                derror('❌ Token malformé (pas 3 parties):', this.token.substring(0, 20) + '...');
                this.logout();
                return false;
            }

            dlog('🔍 Vérification du token...');
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // Timeout de 5 secondes

            const response = await fetch('/api/auth/verify', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            console.log('📡 Réponse vérification token:', response.status);

            if (response.ok) {
                const data = await response.json();
                dlog('✅ Token valide, utilisateur:', data.user?.email);
                this.user = data.user;
                // Ne pas modifier isAuthenticated ici car il dépend de token ET user
                return true;
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.log('❌ Token invalide:', response.status, errorData.error);
                this.logout();
                return false;
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('⏱️ Timeout lors de la vérification du token');
                this.showAlert('Connexion lente au serveur, reconnexion...', 'warning');
                return false;
            }
            
            console.error('💥 Erreur lors de la vérification du token:', error);
            
            // Ne pas déconnecter automatiquement en cas d'erreur réseau
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                this.showAlert('Problème de connexion réseau', 'warning');
                return false;
            }
            
            this.logout();
            return false;
        }
    }

    async login(email, password) {
        try {
            console.log('🔐 Tentative de connexion:', email);
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            console.log('📡 Réponse connexion:', response.status);

            // Gestion spéciale pour les erreurs 429 (Too Many Requests)
            if (response.status === 429) {
                const errorText = await response.text();
                console.log('⚠️ Rate limit atteint:', errorText);
                return { 
                    success: false, 
                    message: 'Trop de tentatives de connexion. Veuillez patienter quelques minutes avant de réessayer.'
                };
            }

            // Essayer de parser le JSON
            let data;
            try {
                data = await response.json();
            } catch (parseError) {
                console.error('Erreur parsing JSON:', parseError);
                return {
                    success: false,
                    message: 'Erreur de communication avec le serveur'
                };
            }

            console.log('📊 Données reçues:', data);

            if (response.ok) {
                // Accepter token ou accessToken (compat backend)
                const receivedToken = data.token || data.accessToken;
                if (!receivedToken || typeof receivedToken !== 'string') {
                    derror('❌ Token manquant ou invalide reçu du serveur:', receivedToken);
                    return { success: false, message: 'Token invalide reçu du serveur' };
                }

                // Valider format JWT
                const parts = receivedToken.split('.');
                if (parts.length !== 3) {
                    derror('❌ Token malformé (parties):', parts.length);
                    return { success: false, message: 'Token malformé reçu du serveur' };
                }

                this.token = receivedToken.trim();
                this.user = data.user || null;
                localStorage.setItem('token', this.token);

                dlog('✅ Connexion réussie - Token:', !!this.token, 'User:', this.user?.email, 'Auth:', this.isAuthenticated());

                this.updateUI();

                // Recharger les articles sur la page d'accueil si la fonction existe
                if (typeof window.refreshArticlesForAuthState === 'function') {
                    window.refreshArticlesForAuthState();
                }

                return { success: true, message: data.message, user: this.user };
            } else {
                console.log('❌ Échec de connexion:', data);
                return { 
                    success: false, 
                    message: data.error || 'Erreur lors de la connexion',
                    errors: data.errors 
                };
            }
        } catch (error) {
            console.error('💥 Erreur lors de la connexion:', error);
            return { success: false, message: 'Erreur de connexion au serveur' };
        }
    }

    async register(userData) {
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            const data = await response.json();

            if (response.ok) {
                return { success: true, message: data.message };
            } else {
                return { 
                    success: false, 
                    message: data.error || 'Erreur lors de l\'inscription',
                    errors: data.errors 
                };
            }
        } catch (error) {
            console.error('Erreur lors de l\'inscription:', error);
            return { success: false, message: 'Erreur de connexion au serveur' };
        }
    }

    logout() {
        this.token = null;
        this.user = null;
        localStorage.removeItem('token');
        
        // Nettoyer aussi d'autres éventuelles données corrompues
        localStorage.removeItem('user');
        localStorage.removeItem('authState');
        
        this.updateUI();
        
        // Recharger les articles sur la page d'accueil si la fonction existe
        if (typeof window.refreshArticlesForAuthState === 'function') {
            window.refreshArticlesForAuthState();
        }
        
        // Rediriger vers la page d'accueil si on est sur une page protégée
        if (window.location.pathname === '/admin') {
            window.location.href = '/';
        }
    }

    // Fonction pour nettoyer complètement l'authentification corrompue
    clearCorruptedAuth() {
        derror('🧹 Nettoyage authentification corrompue');
        localStorage.clear();
        this.token = null;
        this.user = null;
        this.isAuthenticated = false;
        this.updateUI();
        
        this.showAlert('Session corrompue nettoyée. Veuillez vous reconnecter.', 'warning');
    }

    // Fonction de diagnostic pour debugging
    debugAuth() {
        console.log('🔍 État authentification:');
        console.log('- Token:', this.token ? this.token.substring(0, 20) + '...' : 'null');
        console.log('- User:', this.user);
        console.log('- isAuthenticated:', this.isAuthenticated);
        
        const storedToken = localStorage.getItem('token');
        console.log('- localStorage token:', storedToken ? storedToken.substring(0, 20) + '...' : 'null');
        
        if (storedToken) {
            const parts = storedToken.split('.');
            console.log('- Token parties:', parts.length);
            
            if (parts.length === 3) {
                try {
                    const payload = JSON.parse(atob(parts[1]));
                    console.log('- Token payload:', payload);
                    console.log('- Token exp:', new Date(payload.exp * 1000));
                } catch (e) {
                    console.error('- Erreur décodage payload:', e);
                }
            }
        }
        
        console.log('- localStorage complet:', {...localStorage});
    }

    isAuthenticated() {
        const hasTokenAndUser = this.token !== null && this.user !== null;
        dlog('🔍 isAuthenticated check - Token:', !!this.token, 'User:', !!this.user, 'Result:', hasTokenAndUser);
        return hasTokenAndUser;
    }

    // Méthode pour obtenir l'utilisateur actuel
    getCurrentUser() {
        return this.user;
    }

    // Méthode pour attendre que l'AuthManager soit prêt
    async waitForReady() {
        while (!this.isReady) {
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        return this;
    }

    // Alias pour verifyToken (utilisé dans d'autres fichiers)
    async verifyAuth() {
        return await this.verifyToken();
    }

    isAdmin() {
        return this.isAuthenticated() && this.user.role === 'admin';
    }

    getAuthHeaders() {
        if (!this.token) return {};
        return {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
        };
    }

    updateUI() {
        const authButtons = document.getElementById('authButtons');
        const userMenu = document.getElementById('userMenu');
        const userName = document.getElementById('userName');
        const adminBtn = document.getElementById('adminBtn');
        const memberNotice = document.getElementById('memberNotice');

        dlog('🎨 UpdateUI - isAuthenticated:', this.isAuthenticated(), 'User:', this.user?.email);

        if (this.isAuthenticated()) {
            // Utilisateur connecté
            if (authButtons) authButtons.style.display = 'none';
            if (userMenu) {
                userMenu.style.display = 'block';
            }
            if (userName) userName.textContent = `${this.user.firstname} ${this.user.lastname}`;
            
            // Afficher le bouton admin si nécessaire
            if (adminBtn) {
                adminBtn.style.display = this.isAdmin() ? 'block' : 'none';
            }

            // Masquer la notice membre si connecté
            if (memberNotice) {
                memberNotice.style.display = 'none';
            }
        } else {
            // Utilisateur non connecté
            if (authButtons) authButtons.style.display = 'flex';
            if (userMenu) userMenu.style.display = 'none';
            
            // Afficher la notice membre si non connecté
            if (memberNotice) {
                memberNotice.style.display = 'block';
            }
        }

        // Gestion du nom admin
        const adminName = document.getElementById('adminName');
        if (adminName && this.isAuthenticated()) {
            adminName.textContent = `${this.user.firstname} ${this.user.lastname}`;
        }
    }

    bindEvents() {
        // Bouton de déconnexion
        const logoutBtns = document.querySelectorAll('#logoutBtn');
        logoutBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
                this.showAlert('Déconnexion réussie', 'success');
                
                // Redirection après déconnexion
                setTimeout(() => {
                    window.location.href = '/';
                }, 1000);
            });
        });

        // Menu mobile
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const mainNav = document.getElementById('mainNav');
        if (mobileMenuBtn && mainNav) {
            mobileMenuBtn.addEventListener('click', () => {
                mainNav.classList.toggle('active');
            });
        }
    }

    showAlert(message, type = 'info', duration = 5000) {
        const alertElement = document.getElementById('alertMessage');
        if (!alertElement) return;

        alertElement.textContent = message;
        alertElement.className = `alert alert-${type}`;
        alertElement.style.display = 'block';

        // Auto-hide après la durée spécifiée
        setTimeout(() => {
            alertElement.style.display = 'none';
        }, duration);
    }

    async makeAuthenticatedRequest(url, options = {}) {
        const defaultOptions = {
            headers: this.getAuthHeaders()
        };

        const finalOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        };

        try {
            const response = await fetch(url, finalOptions);
            
            if (response.status === 401) {
                this.logout();
                throw new Error('Session expirée, veuillez vous reconnecter');
            }

            return response;
        } catch (error) {
            console.error('Erreur lors de la requête authentifiée:', error);
            throw error;
        }
    }

    // Protection des pages admin
    async requireAdmin() {
        console.log('🛡️ Vérification des droits admin...');
        
        // Si on a un token mais pas encore d'utilisateur, attendre la vérification
        if (this.token && !this.user) {
            console.log('⏳ Attente de la vérification du token...');
            await this.verifyToken();
        }
        
        console.log('👤 Statut utilisateur:', {
            token: !!this.token,
            user: !!this.user,
            authenticated: this.isAuthenticated(),
            admin: this.isAdmin(),
            userRole: this.user?.role
        });
        
        if (!this.isAdmin()) {
            console.log('❌ Accès refusé - utilisateur non admin');
            this.showAlert('Accès réservé aux administrateurs', 'error');
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
            return false;
        }
        
        console.log('✅ Accès admin autorisé');
        return true;
    }

    // Utilitaire pour formater les dates
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Utilitaire pour formater les dates courtes
    formatShortDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }
}

// Instance globale de l'AuthManager
window.authManager = new AuthManager();

// Fonctions utilitaires globales pour debugging
window.authDebug = function() {
    if (window.authManager) {
        window.authManager.debugAuth();
    } else {
        console.log('❌ AuthManager non initialisé');
    }
};

window.authClear = function() {
    if (window.authManager) {
        window.authManager.clearCorruptedAuth();
    } else {
        console.log('❌ AuthManager non initialisé, nettoyage manuel...');
        localStorage.clear();
        location.reload();
    }
};

window.authCheck = function() {
    if (window.authManager) {
        console.log('🔍 État AuthManager:');
        console.log('- isReady:', window.authManager.isReady);
        console.log('- isAuthenticated():', window.authManager.isAuthenticated());
        console.log('- token présent:', !!window.authManager.token);
        console.log('- user présent:', !!window.authManager.user);
        console.log('- user email:', window.authManager.user?.email);
        console.log('- isAdmin():', window.authManager.isAdmin());
    } else {
        console.log('❌ AuthManager non initialisé');
    }
};

// Utilitaires globaux
window.utils = {
    showLoading: function(element, show = true) {
        if (!element) return;
        
        if (show) {
            element.innerHTML = '<div class="loading">Chargement...</div>';
        } else {
            // Supprimer l'indicateur de chargement
            const loadingEl = element.querySelector('.loading');
            if (loadingEl) {
                loadingEl.remove();
            }
        }
    },

    escapeHtml: function(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    truncateText: function(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.slice(0, maxLength) + '...';
    },

    debounce: function(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};