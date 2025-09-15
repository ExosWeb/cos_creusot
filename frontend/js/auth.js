// Gestion de l'authentification côté client
class AuthManager {
    constructor() {
        this.token = localStorage.getItem('cos_token');
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
        console.log('🔧 AuthManager initialisé', { authenticated: this.isAuthenticated(), admin: this.isAdmin() });
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
            console.log('🔍 Vérification du token...');
            
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
                console.log('✅ Token valide, utilisateur:', data.user?.email);
                this.user = data.user;
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
                this.token = data.token;
                this.user = data.user;
                localStorage.setItem('cos_token', this.token);
                console.log('✅ Connexion réussie, token stocké:', !!this.token);
                this.updateUI();
                return { success: true, message: data.message };
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
        localStorage.removeItem('cos_token');
        this.updateUI();
        
        // Rediriger vers la page d'accueil si on est sur une page protégée
        if (window.location.pathname === '/admin') {
            window.location.href = '/';
        }
    }

    isAuthenticated() {
        return this.token !== null && this.user !== null;
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

        if (this.isAuthenticated()) {
            // Utilisateur connecté
            if (authButtons) authButtons.style.display = 'none';
            if (userMenu) userMenu.style.display = 'block';
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

// Utilitaires globaux
window.utils = {
    showLoading: function(element, show = true) {
        if (!element) return;
        
        if (show) {
            element.innerHTML = '<div class="loading">Chargement...</div>';
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