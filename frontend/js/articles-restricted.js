/**
 * Gestion des articles avec restriction d'accès
 * Seuls les membres et retraités peuvent accéder aux articles
 */

class RestrictedArticlesManager {
    constructor() {
        this.articles = [];
        this.userRole = null;
        this.isAuthenticated = false;
        this.searchTimeout = null;
        
        this.init();
    }

    init() {
        this.checkAuthentication();
    }

    async checkAuthentication() {
        const token = localStorage.getItem('token');
        
        if (!token) {
            this.redirectToAccessDenied();
            return;
        }

        try {
            // Vérifier le token et récupérer les infos utilisateur
            const response = await fetch('/api/auth/verify', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Token invalide');
            }

            const data = await response.json();
            
            // Vérifier si l'utilisateur a les droits d'accès
            if (!this.hasArticleAccess(data.user.role)) {
                this.redirectToAccessDenied();
                return;
            }

            this.isAuthenticated = true;
            this.userRole = data.user.role;
            this.showArticlesInterface();
            this.loadArticles();

        } catch (error) {
            console.error('Erreur d\'authentification:', error);
            this.redirectToAccessDenied();
        }
    }

    hasArticleAccess(role) {
        return role === 'admin' || role === 'member' || role === 'retraite';
    }

    redirectToAccessDenied() {
        // Rediriger vers la page d'accès refusé
        window.location.href = '/access-denied';
    }

    showArticlesInterface() {
        // Masquer le message de chargement
        const articlesContainer = document.getElementById('articlesContainer');
        articlesContainer.innerHTML = '<div id="articlesGrid" class="articles-grid"></div>';

        // Afficher les contrôles
        const controls = document.getElementById('articlesControls');
        if (controls) {
            controls.style.display = 'flex';
        }

        // Configurer les filtres selon le rôle
        this.setupRoleBasedFilters();

        // Ajouter le bouton de création si autorisé
        this.setupCreateButton();

        // Configurer les événements
        this.setupEventListeners();
    }

    setupRoleBasedFilters() {
        const categoryFilter = document.getElementById('categoryFilter');
        const retraitesOption = document.getElementById('retraitesOption');

        if (this.userRole === 'retraite') {
            // Les retraités ne voient que les articles retraités
            categoryFilter.innerHTML = '<option value="retraites">Articles Retraités</option>';
            categoryFilter.value = 'retraites';
            categoryFilter.disabled = true;
        } else if (this.userRole === 'member') {
            // Les membres ne voient pas l'option retraités
            if (retraitesOption) {
                retraitesOption.remove();
            }
        }
        // Les admins voient tout (pas de modification)
    }

    setupCreateButton() {
        const createContainer = document.getElementById('createButtonContainer');
        
        // Seuls les membres, retraités et admins peuvent créer des articles
        if (this.hasArticleAccess(this.userRole)) {
            createContainer.innerHTML = `
                <a href="/create-article" class="create-article-btn" id="createArticleBtn">
                    <i class="fas fa-plus"></i>
                    Nouvel Article
                </a>
            `;
        }
    }

    setupEventListeners() {
        // Recherche
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                clearTimeout(this.searchTimeout);
                this.searchTimeout = setTimeout(() => {
                    this.filterArticles();
                }, 300);
            });
        }

        // Filtre par catégorie
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => {
                this.filterArticles();
            });
        }
    }

    async loadArticles() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/articles', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    this.redirectToAccessDenied();
                    return;
                }
                throw new Error('Erreur lors du chargement des articles');
            }

            const articles = await response.json();
            this.articles = articles;
            this.displayArticles(articles);

        } catch (error) {
            console.error('Erreur lors du chargement des articles:', error);
            this.showError('Impossible de charger les articles');
        }
    }

    displayArticles(articles) {
        const container = document.getElementById('articlesGrid');
        
        if (!container) return;

        if (articles.length === 0) {
            container.innerHTML = `
                <div class="no-articles">
                    <i class="fas fa-newspaper"></i>
                    <h3>Aucun article disponible</h3>
                    <p>Il n'y a pas encore d'articles dans cette catégorie.</p>
                    ${this.hasArticleAccess(this.userRole) ? 
                        '<button class="btn btn-primary" onclick="window.location.href=\'/create-article\'">Créer le premier article</button>' : 
                        ''
                    }
                </div>
            `;
            return;
        }

        container.innerHTML = articles.map(article => this.createArticleCard(article)).join('');
    }

    createArticleCard(article) {
        const createdDate = new Date(article.created_at).toLocaleDateString('fr-FR');
        const categoryClass = article.category || 'general';
        const categoryLabel = this.getCategoryLabel(article.category);
        
        const imageHtml = article.image_url 
            ? `<img src="${article.image_url}" alt="${article.title}" loading="lazy">`
            : '<i class="fas fa-newspaper"></i>';

        return `
            <div class="article-card" onclick="openArticle(${article.id})" data-article-id="${article.id}">
                <div class="article-image">
                    ${imageHtml}
                </div>
                <div class="article-content">
                    <span class="article-category ${categoryClass}">${categoryLabel}</span>
                    <h3 class="article-title">${article.title}</h3>
                    <p class="article-excerpt">${article.excerpt || this.truncateContent(article.content, 120)}</p>
                    <div class="article-meta">
                        <span class="article-author">
                            <i class="fas fa-user"></i>
                            ${article.firstname} ${article.lastname}
                        </span>
                        <span class="article-date">
                            <i class="fas fa-calendar"></i>
                            ${createdDate}
                        </span>
                    </div>
                </div>
            </div>
        `;
    }

    getCategoryLabel(category) {
        const labels = {
            'general': 'Général',
            'retraites': 'Retraités',
            'activites': 'Activités',
            'actualites': 'Actualités'
        };
        return labels[category] || 'Article';
    }

    truncateContent(content, length) {
        if (!content) return '';
        
        // Retirer les balises HTML
        const textContent = content.replace(/<[^>]*>/g, '');
        
        if (textContent.length <= length) return textContent;
        return textContent.substring(0, length).trim() + '...';
    }

    filterArticles() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const selectedCategory = document.getElementById('categoryFilter').value;

        let filteredArticles = this.articles.filter(article => {
            const matchesSearch = !searchTerm || 
                article.title.toLowerCase().includes(searchTerm) ||
                (article.content && article.content.toLowerCase().includes(searchTerm)) ||
                (article.excerpt && article.excerpt.toLowerCase().includes(searchTerm));

            const matchesCategory = !selectedCategory || article.category === selectedCategory;

            return matchesSearch && matchesCategory;
        });

        this.displayArticles(filteredArticles);
    }

    showError(message) {
        const container = document.getElementById('articlesGrid');
        if (container) {
            container.innerHTML = `
                <div class="no-articles">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Erreur</h3>
                    <p>${message}</p>
                    <button class="btn btn-primary" onclick="location.reload()">
                        <i class="fas fa-refresh"></i>
                        Réessayer
                    </button>
                </div>
            `;
        }
    }

    openArticle(articleId) {
        if (window.ArticleModal) {
            window.ArticleModal.open(articleId);
        } else {
            window.location.href = `/article/${articleId}`;
        }
    }
}

// Ajout de la méthode openArticle globalement pour les cartes
window.openArticle = function(articleId) {
    if (window.ArticleModal) {
        window.ArticleModal.open(articleId);
    } else {
        window.location.href = `/article/${articleId}`;
    }
};

// Initialiser le gestionnaire d'articles
document.addEventListener('DOMContentLoaded', () => {
    new RestrictedArticlesManager();
});