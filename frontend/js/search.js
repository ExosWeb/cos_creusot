// Système de recherche pour les articles
class ArticleSearch {
    constructor() {
        this.searchInput = null;
        this.categoryFilter = null;
        this.searchResults = null;
        this.articles = [];
        this.filteredArticles = [];
        this.init();
    }

    init() {
        this.createSearchInterface();
        this.loadArticles();
        this.bindEvents();
    }

    createSearchInterface() {
        const searchContainer = document.createElement('div');
        searchContainer.className = 'article-search';
        searchContainer.innerHTML = `
            <div class="search-controls">
                <div class="search-input-group">
                    <input type="text" id="articleSearchInput" placeholder="Rechercher un article..." class="search-input">
                    <button type="button" id="searchButton" class="search-btn">
                        <span class="search-icon">🔍</span>
                    </button>
                </div>
                
                <div class="filter-group">
                    <select id="categoryFilter" class="category-filter">
                        <option value="">Toutes les catégories</option>
                        <option value="general">Général</option>
                        <option value="prestations">Prestations</option>
                        <option value="voyages">Voyages</option>
                        <option value="retraites">Retraites</option>
                        <option value="evenements">Événements</option>
                    </select>
                </div>
                
                <div class="search-stats">
                    <span id="searchStats">Tous les articles</span>
                </div>
            </div>
            
            <div id="searchResults" class="search-results">
                <!-- Résultats de recherche -->
            </div>
            
            <div id="noResults" class="no-results" style="display: none;">
                <div class="no-results-content">
                    <span class="no-results-icon">🔍</span>
                    <h3>Aucun résultat trouvé</h3>
                    <p>Essayez avec d'autres mots-clés ou changez de catégorie</p>
                </div>
            </div>
        `;

        // Insérer avant le conteneur d'articles existant
        const articlesContainer = document.querySelector('.articles-grid, .category-articles');
        if (articlesContainer) {
            articlesContainer.parentNode.insertBefore(searchContainer, articlesContainer);
        }

        this.searchInput = document.getElementById('articleSearchInput');
        this.categoryFilter = document.getElementById('categoryFilter');
        this.searchResults = document.getElementById('searchResults');
        this.searchStats = document.getElementById('searchStats');
        this.noResults = document.getElementById('noResults');
    }

    bindEvents() {
        // Recherche en temps réel
        if (this.searchInput) {
            this.searchInput.addEventListener('input', this.debounce(() => {
                this.performSearch();
            }, 300));
        }

        // Filtre par catégorie
        if (this.categoryFilter) {
            this.categoryFilter.addEventListener('change', () => {
                this.performSearch();
            });
        }

        // Bouton de recherche
        const searchButton = document.getElementById('searchButton');
        if (searchButton) {
            searchButton.addEventListener('click', () => {
                this.performSearch();
            });
        }

        // Recherche avec Entrée
        if (this.searchInput) {
            this.searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.performSearch();
                }
            });
        }
    }

    async loadArticles() {
        try {
            const response = await fetch('/api/articles');
            if (response.ok) {
                const data = await response.json();
                this.articles = Array.isArray(data) ? data : [];
                this.filteredArticles = [...this.articles];
                this.displayResults();
                this.updateStats();
            }
        } catch (error) {
            console.error('Erreur lors du chargement des articles:', error);
        }
    }

    performSearch() {
        const searchTerm = this.searchInput ? this.searchInput.value.toLowerCase().trim() : '';
        const selectedCategory = this.categoryFilter ? this.categoryFilter.value : '';

        this.filteredArticles = this.articles.filter(article => {
            const matchesSearch = !searchTerm || 
                article.title.toLowerCase().includes(searchTerm) ||
                article.content.toLowerCase().includes(searchTerm) ||
                article.excerpt.toLowerCase().includes(searchTerm);

            const matchesCategory = !selectedCategory || article.category === selectedCategory;

            return matchesSearch && matchesCategory;
        });

        this.displayResults();
        this.updateStats();
    }

    displayResults() {
        if (!this.searchResults) return;

        if (this.filteredArticles.length === 0) {
            this.searchResults.style.display = 'none';
            this.noResults.style.display = 'block';
            return;
        }

        this.searchResults.style.display = 'grid';
        this.noResults.style.display = 'none';

        this.searchResults.innerHTML = this.filteredArticles.map(article => `
            <article class="article-card" data-id="${article.id}">
                <div class="article-image">
                    ${article.image_url ? 
                        `<img src="${article.image_url}" alt="${article.title}">` :
                        '<div class="article-placeholder">📄</div>'
                    }
                </div>
                
                <div class="article-content">
                    <div class="article-meta">
                        <span class="article-category">${this.getCategoryName(article.category)}</span>
                        <span class="article-date">${this.formatDate(article.created_at)}</span>
                    </div>
                    
                    <h3 class="article-title">${article.title}</h3>
                    <p class="article-excerpt">${article.excerpt || this.createExcerpt(article.content)}</p>
                    
                    <div class="article-actions">
                        <button class="btn-read-more" onclick="viewArticleDetails(${article.id})">
                            Lire plus
                        </button>
                        ${article.is_member_only ? '<span class="member-badge">👤 Membres</span>' : ''}
                    </div>
                </div>
            </article>
        `).join('');
    }

    updateStats() {
        if (!this.searchStats) return;

        const total = this.articles.length;
        const filtered = this.filteredArticles.length;
        const searchTerm = this.searchInput ? this.searchInput.value.trim() : '';
        const category = this.categoryFilter ? this.categoryFilter.value : '';

        if (searchTerm || category) {
            this.searchStats.textContent = `${filtered} article${filtered > 1 ? 's' : ''} trouvé${filtered > 1 ? 's' : ''} sur ${total}`;
        } else {
            this.searchStats.textContent = `${total} article${total > 1 ? 's' : ''} au total`;
        }
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

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    }

    createExcerpt(content, maxLength = 150) {
        const text = content.replace(/<[^>]*>/g, ''); // Supprimer les balises HTML
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    // Debounce pour éviter trop de requêtes
    debounce(func, wait) {
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

    // Méthodes publiques pour contrôle externe
    clearSearch() {
        if (this.searchInput) this.searchInput.value = '';
        if (this.categoryFilter) this.categoryFilter.value = '';
        this.performSearch();
    }

    searchByCategory(category) {
        if (this.categoryFilter) {
            this.categoryFilter.value = category;
            this.performSearch();
        }
    }
}

// Fonction pour voir les détails d'un article
function viewArticleDetails(articleId) {
    // À implémenter - redirection vers la page de détail
    console.log('Affichage article:', articleId);
    // Redirection temporaire
    window.location.href = `/article/${articleId}`;
}

// Initialisation automatique
document.addEventListener('DOMContentLoaded', () => {
    // Vérifier si on est sur une page qui a besoin de la recherche
    const needsSearch = document.querySelector('.articles-grid, .category-articles') || 
                       document.body.classList.contains('articles-page');
    
    if (needsSearch) {
        window.articleSearch = new ArticleSearch();
    }
});