// JavaScript pour la page d'accueil
document.addEventListener('DOMContentLoaded', function() {
    initHomePage();
});

async function initHomePage() {
    // Attendre que l'authentication manager soit initialisé
    if (window.authManager) {
        await window.authManager.init();
    }
    
    await loadFeaturedArticles();
    await loadLatestArticles();
    initLoadMoreButton();
}

// Fonction pour recharger les articles après connexion/déconnexion
async function refreshArticlesForAuthState() {
    console.log('🔄 Rechargement des articles après changement d\'authentification');
    await loadLatestArticles(true); // reset = true pour recharger depuis le début
}

// Exposer la fonction globalement pour que auth.js puisse l'utiliser
window.refreshArticlesForAuthState = refreshArticlesForAuthState;

// Chargement des articles mis en avant
async function loadFeaturedArticles() {
    const container = document.getElementById('featuredArticles');
    if (!container) return;

    try {
        const response = await fetch('/api/articles/featured?limit=3');
        const articles = await response.json();

        if (articles.length === 0) {
            container.innerHTML = `
                <div class="no-articles-content">
                    <p>Aucun article mis en avant pour le moment.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = articles.map(article => createArticleCard(article, true)).join('');
    } catch (error) {
        console.error('Erreur lors du chargement des articles mis en avant:', error);
        container.innerHTML = `
            <div class="error">
                <p>Erreur lors du chargement des articles mis en avant.</p>
            </div>
        `;
    }
}

// Chargement des derniers articles
let currentPage = 0;
let isLoading = false;
let hasMoreArticles = true;

async function loadLatestArticles(reset = false) {
    const container = document.getElementById('latestArticles');
    if (!container) return;

    if (isLoading) return;
    isLoading = true;

    try {
        if (reset) {
            currentPage = 0;
            hasMoreArticles = true;
            utils.showLoading(container, true);
        }

        // Utiliser la route appropriée selon l'état de connexion
        const authManager = window.authManager;
        let apiUrl = `/api/articles?limit=6&offset=${currentPage * 6}`;
        
        if (authManager && authManager.isAuthenticated()) {
            apiUrl = `/api/articles/user-articles?limit=6&offset=${currentPage * 6}`;
        }
        
        const headers = {};
        if (authManager && authManager.token) {
            headers['Authorization'] = `Bearer ${authManager.token}`;
        }
        
        const response = await fetch(apiUrl, { headers });
        const articles = await response.json();

        // Supprimer l'indicateur de chargement
        utils.showLoading(container, false);

        if (articles.length === 0) {
            if (currentPage === 0) {
                container.innerHTML = `
                    <div class="no-articles-content">
                        <div class="no-articles-icon">📄</div>
                        <h3>Aucun article disponible</h3>
                        <p>Il n'y a actuellement aucun article publié.</p>
                    </div>
                `;
            }
            hasMoreArticles = false;
        } else {
            if (reset) {
                container.innerHTML = '';
            }
            
            const articlesHtml = articles.map(article => createArticleCard(article)).join('');
            container.insertAdjacentHTML('beforeend', articlesHtml);
            
            if (articles.length < 6) {
                hasMoreArticles = false;
            }
        }

        currentPage++;
        updateLoadMoreButton();

    } catch (error) {
        console.error('Erreur lors du chargement des articles:', error);
        utils.showLoading(container, false);
        
        if (reset) {
            container.innerHTML = `
                <div class="error">
                    <h3>⚠️ Erreur de chargement</h3>
                    <p>Impossible de charger les articles.</p>
                    <button onclick="loadLatestArticles(true)" class="btn btn-primary">Réessayer</button>
                </div>
            `;
        }
    } finally {
        isLoading = false;
    }
}

// Gestion du bouton "Charger plus"
function initLoadMoreButton() {
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', async () => {
            await loadLatestArticles();
        });
    }
}

function updateLoadMoreButton() {
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (!loadMoreBtn) return;

    if (!hasMoreArticles || isLoading) {
        loadMoreBtn.style.display = 'none';
    } else {
        loadMoreBtn.style.display = 'inline-block';
        loadMoreBtn.textContent = isLoading ? 'Chargement...' : 'Charger plus d\'articles';
        loadMoreBtn.disabled = isLoading;
    }
}

// Création d'une carte d'article
function createArticleCard(article, featured = false) {
    const date = window.authManager.formatShortDate(article.published_at || article.created_at);
    const excerpt = article.excerpt || window.utils.truncateText(article.content, 150);
    
    return `
        <article class="article-card ${featured ? 'featured' : ''}">
            <div class="article-image">
                ${article.image_url ? 
                    `<img src="${article.image_url}" alt="${window.utils.escapeHtml(article.title)}" loading="lazy">` :
                    getCategoryIcon(article.category)
                }
            </div>
            <div class="article-content">
                <div class="article-meta">
                    <span class="article-category ${article.category}">${getCategoryLabel(article.category)}</span>
                    <span class="article-date">${date}</span>
                </div>
                <h3 class="article-title">${window.utils.escapeHtml(article.title)}</h3>
                <p class="article-excerpt">${window.utils.escapeHtml(excerpt)}</p>
                <div class="article-footer">
                    <div class="article-author">
                        Par <strong>${window.utils.escapeHtml(article.firstname)} ${window.utils.escapeHtml(article.lastname)}</strong>
                    </div>
                    <a href="#" class="read-more-btn" onclick="openArticle(${article.id}); return false;">
                        Lire la suite
                    </a>
                </div>
            </div>
        </article>
    `;
}

// Ouverture d'un article
function openArticle(articleId) {
    // Pour l'instant, afficher une alerte (à remplacer par une modal ou redirection)
    window.authManager.showAlert('Fonctionnalité en développement : lecture d\'article', 'info');
}

// Utilitaires pour les catégories
function getCategoryLabel(category) {
    const labels = {
        'general': 'Général',
        'avantages': 'Avantages',
        'voyages': 'Voyages',
        'retraites': 'Retraites',
        'evenements': 'Événements'
    };
    return labels[category] || 'Général';
}

function getCategoryIcon(category) {
    const icons = {
        'general': '📰',
        'avantages': '🎁',
        'voyages': '✈️',
        'retraites': '🌟',
        'evenements': '🎉'
    };
    return `<span style="font-size: 4rem;">${icons[category] || '📰'}</span>`;
}

// Gestion du défilement automatique des articles mis en avant (optionnel)
function initFeaturedCarousel() {
    const carousel = document.getElementById('featuredArticles');
    if (!carousel) return;

    // Ajouter des fonctionnalités de carousel si souhaité
    // Pour l'instant, affichage en grille statique
}

// Recherche en temps réel (si implémentée plus tard)
function initSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', window.utils.debounce(async (e) => {
            const query = e.target.value.trim();
            if (query.length >= 3) {
                await searchArticles(query);
            } else if (query.length === 0) {
                await loadLatestArticles(true);
            }
        }, 300));
    }
}

async function searchArticles(query) {
    // Implémentation de la recherche
    // À développer selon les besoins
}