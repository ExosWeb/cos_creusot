// Gestion des articles détaillés
class ArticleDetailManager {
    constructor() {
        this.articleId = null;
        this.currentArticle = null;
        this.init();
    }

    init() {
        // Récupérer l'ID de l'article depuis l'URL
        this.articleId = this.getArticleIdFromUrl();
        
        if (!this.articleId) {
            this.showError('Identifiant d\'article manquant');
            return;
        }

        this.bindEvents();
        this.loadArticle();
    }

    getArticleIdFromUrl() {
        const path = window.location.pathname;
        const matches = path.match(/\/article\/(\d+)/);
        return matches ? parseInt(matches[1]) : null;
    }

    bindEvents() {
        // Bouton retour
        const backButton = document.getElementById('backButton');
        if (backButton) {
            backButton.addEventListener('click', () => {
                this.goBack();
            });
        }

        // Bouton partager
        const shareButton = document.getElementById('shareButton');
        if (shareButton) {
            shareButton.addEventListener('click', () => {
                this.shareArticle();
            });
        }

        // Bouton imprimer
        const printButton = document.getElementById('printButton');
        if (printButton) {
            printButton.addEventListener('click', () => {
                window.print();
            });
        }

        // Navigation précédent/suivant
        const prevButton = document.getElementById('prevArticle');
        const nextButton = document.getElementById('nextArticle');
        
        if (prevButton) {
            prevButton.addEventListener('click', () => {
                this.navigateToArticle('prev');
            });
        }
        
        if (nextButton) {
            nextButton.addEventListener('click', () => {
                this.navigateToArticle('next');
            });
        }
    }

    async loadArticle() {
        try {
            this.showLoading(true);
            
            const response = await fetch(`/api/articles/${this.articleId}`);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Erreur lors du chargement de l\'article');
            }

            if (data.success && data.article) {
                this.currentArticle = data.article;
                
                // Vérifier les permissions d'accès
                if (this.currentArticle.is_member_only && !this.isUserLoggedIn()) {
                    this.showRestricted();
                    return;
                }
                
                this.displayArticle(this.currentArticle);
                this.loadRelatedArticles();
                this.loadNavigationArticles();
                
                // Mettre à jour le titre de la page
                document.title = `${this.currentArticle.title} - COS Creusot`;
                
            } else {
                this.showError('Article non trouvé');
            }
            
        } catch (error) {
            console.error('Erreur lors du chargement de l\'article:', error);
            this.showError(error.message || 'Erreur lors du chargement de l\'article');
        } finally {
            this.showLoading(false);
        }
    }

    displayArticle(article) {
        // Masquer les sections d'erreur
        this.hideAllSections();
        document.querySelector('.article-container').style.display = 'block';
        
        // Breadcrumb
        this.updateBreadcrumb(article);
        
        // Métadonnées
        document.getElementById('articleCategory').textContent = this.getCategoryName(article.category);
        document.getElementById('articleDate').textContent = this.formatDate(article.created_at);
        document.getElementById('articleUpdated').textContent = this.formatDate(article.updated_at);
        
        // Badge membre
        const memberBadge = document.getElementById('memberBadge');
        if (article.is_member_only) {
            memberBadge.style.display = 'inline-block';
        }
        
        // Titre et extrait
        document.getElementById('articleTitle').textContent = article.title;
        const excerptEl = document.getElementById('articleExcerpt');
        if (article.excerpt) {
            excerptEl.textContent = article.excerpt;
            excerptEl.style.display = 'block';
        } else {
            excerptEl.style.display = 'none';
        }
        
        // Image
        const imageContainer = document.getElementById('articleImageContainer');
        const image = document.getElementById('articleImage');
        if (article.image_url) {
            image.src = article.image_url;
            image.alt = article.title;
            imageContainer.style.display = 'block';
        } else {
            imageContainer.style.display = 'none';
        }
        
        // Contenu
        document.getElementById('articleContent').innerHTML = article.content;
    }

    updateBreadcrumb(article) {
        const categoryLink = document.getElementById('breadcrumbCategory');
        const titleSpan = document.getElementById('breadcrumbTitle');
        
        const categoryInfo = this.getCategoryInfo(article.category);
        categoryLink.href = categoryInfo.url;
        categoryLink.textContent = categoryInfo.name;
        
        titleSpan.textContent = article.title;
    }

    getCategoryInfo(category) {
        const categories = {
            'general': { name: 'Général', url: '/' },
            'prestations': { name: 'Prestations', url: '/avantages' },
            'voyages': { name: 'Voyages', url: '/voyages' },
            'retraites': { name: 'Retraites', url: '/retraites' },
            'evenements': { name: 'Événements', url: '/evenements' }
        };
        return categories[category] || { name: category, url: '/' };
    }

    getCategoryName(category) {
        const categories = {
            'general': 'Général',
            'prestations': 'Prestations',
            'voyages': 'Voyages',
            'retraites': 'Retraites',
            'evenements': 'Événements'
        };
        return categories[category] || category;
    }

    async loadRelatedArticles() {
        try {
            const response = await fetch(`/api/articles/search?category=${this.currentArticle.category}&limit=3`);
            const data = await response.json();
            
            if (data.success && data.data.length > 1) {
                // Exclure l'article actuel
                const relatedArticles = data.data.filter(article => article.id !== this.articleId).slice(0, 3);
                
                if (relatedArticles.length > 0) {
                    this.displayRelatedArticles(relatedArticles);
                }
            }
        } catch (error) {
            console.error('Erreur lors du chargement des articles liés:', error);
        }
    }

    displayRelatedArticles(articles) {
        const section = document.getElementById('relatedArticlesSection');
        const container = document.getElementById('relatedArticles');
        
        container.innerHTML = articles.map(article => `
            <div class="related-article-card" onclick="window.location.href='/article/${article.id}'">
                <div class="related-article-image">
                    ${article.image_url ? 
                        `<img src="${article.image_url}" alt="${article.title}">` :
                        '<div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #f8f9fa; color: #ccc; font-size: 2rem;">📄</div>'
                    }
                </div>
                <div class="related-article-content">
                    <h3 class="related-article-title">${article.title}</h3>
                    <p class="related-article-excerpt">${article.excerpt || this.createExcerpt(article.content)}</p>
                </div>
            </div>
        `).join('');
        
        section.style.display = 'block';
    }

    async loadNavigationArticles() {
        try {
            const response = await fetch(`/api/articles?category=${this.currentArticle.category}&limit=100`);
            const data = await response.json();
            
            if (data.success && data.articles.length > 1) {
                const currentIndex = data.articles.findIndex(article => article.id === this.articleId);
                
                if (currentIndex !== -1) {
                    const prevButton = document.getElementById('prevArticle');
                    const nextButton = document.getElementById('nextArticle');
                    
                    // Article précédent
                    if (currentIndex > 0) {
                        const prevArticle = data.articles[currentIndex - 1];
                        prevButton.textContent = `← ${prevArticle.title}`;
                        prevButton.dataset.articleId = prevArticle.id;
                        prevButton.style.display = 'block';
                    }
                    
                    // Article suivant
                    if (currentIndex < data.articles.length - 1) {
                        const nextArticle = data.articles[currentIndex + 1];
                        nextButton.textContent = `${nextArticle.title} →`;
                        nextButton.dataset.articleId = nextArticle.id;
                        nextButton.style.display = 'block';
                    }
                }
            }
        } catch (error) {
            console.error('Erreur lors du chargement de la navigation:', error);
        }
    }

    navigateToArticle(direction) {
        const button = direction === 'prev' ? 
            document.getElementById('prevArticle') : 
            document.getElementById('nextArticle');
        
        const articleId = button.dataset.articleId;
        if (articleId) {
            window.location.href = `/article/${articleId}`;
        }
    }

    goBack() {
        // Essayer de retourner à la page de catégorie appropriée
        if (this.currentArticle && this.currentArticle.category) {
            const categoryInfo = this.getCategoryInfo(this.currentArticle.category);
            window.location.href = categoryInfo.url;
        } else {
            // Fallback vers l'historique du navigateur
            if (window.history.length > 1) {
                window.history.back();
            } else {
                window.location.href = '/';
            }
        }
    }

    async shareArticle() {
        const url = window.location.href;
        const title = this.currentArticle ? this.currentArticle.title : 'Article - COS Creusot';
        
        if (navigator.share) {
            try {
                await navigator.share({
                    title: title,
                    url: url
                });
            } catch (err) {
                console.log('Partage annulé ou échoué:', err);
                this.fallbackShare(url, title);
            }
        } else {
            this.fallbackShare(url, title);
        }
    }

    fallbackShare(url, title) {
        // Copier l'URL dans le presse-papiers
        navigator.clipboard.writeText(url).then(() => {
            // Afficher une notification
            this.showNotification('Lien copié dans le presse-papiers !');
        }).catch(() => {
            // Fallback si le clipboard ne marche pas
            prompt('Copiez ce lien :', url);
        });
    }

    showNotification(message) {
        // Créer une notification temporaire
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #28a745;
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            animation: slideInRight 0.3s ease-out;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // Supprimer après 3 secondes
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    showLoading(show) {
        const loadingOverlay = document.getElementById('loadingSpinner');
        loadingOverlay.style.display = show ? 'flex' : 'none';
    }

    showError(message) {
        this.hideAllSections();
        const errorSection = document.getElementById('errorSection');
        errorSection.style.display = 'block';
        
        // Optionnel: personnaliser le message d'erreur
        const errorText = errorSection.querySelector('p');
        if (errorText && message) {
            errorText.textContent = message;
        }
    }

    showRestricted() {
        this.hideAllSections();
        document.getElementById('restrictedSection').style.display = 'block';
    }

    hideAllSections() {
        document.querySelector('.article-container').style.display = 'none';
        document.getElementById('errorSection').style.display = 'none';
        document.getElementById('restrictedSection').style.display = 'none';
        document.getElementById('relatedArticlesSection').style.display = 'none';
    }

    isUserLoggedIn() {
        // Vérifier si l'utilisateur est connecté (utilise auth.js)
        return localStorage.getItem('authToken') !== null;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    createExcerpt(content, maxLength = 120) {
        if (!content) return '';
        
        const textContent = content.replace(/<[^>]*>/g, '');
        if (textContent.length <= maxLength) {
            return textContent;
        }
        
        return textContent.substring(0, maxLength).trim() + '...';
    }
}

// CSS pour les animations de notification
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Initialisation automatique
document.addEventListener('DOMContentLoaded', () => {
    window.articleDetail = new ArticleDetailManager();
});