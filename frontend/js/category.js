// JavaScript pour les pages de catégories
document.addEventListener('DOMContentLoaded', function() {
    initCategoryPage();
});

async function initCategoryPage() {
    // Vérifier la configuration de la catégorie
    if (!window.categoryConfig) {
        console.error('Configuration de catégorie manquante');
        return;
    }

    // Attendre que authManager soit initialisé
    await new Promise(resolve => {
        if (window.authManager) {
            resolve();
        } else {
            setTimeout(resolve, 100);
        }
    });

    await checkAuthAndLoadCategoryArticles();
}

async function checkAuthAndLoadCategoryArticles() {
    const articlesGrid = document.getElementById('articlesGrid');
    const memberNotice = document.getElementById('memberNotice');
    const articlesSection = document.querySelector('.articles-section');
    
    if (!articlesGrid) return;
    
    try {
        // Vérifier l'authentification
        const isAuthenticated = await window.authManager.verifyAuth();
        const userInfo = window.authManager.getCurrentUser();
        const category = window.categoryConfig.category;
        
        dlog('🔐 Category auth check - Category:', category, 'Authenticated:', isAuthenticated, 'User:', userInfo);
        
        // Si pas connecté ou pas membre -> Afficher seulement le message d'accès restreint
        if (!isAuthenticated || !userInfo || !['admin', 'member', 'retraite'].includes(userInfo.role)) {
            dlog('❌ Access denied for category:', category, '- showing member notice only');
            
            // Afficher le message d'accès restreint
            if (memberNotice) memberNotice.style.display = 'block';
            
            // Cacher la section articles
            if (articlesSection) articlesSection.style.display = 'none';
            
            return;
        }
        
        // Si connecté et membre -> Cacher le message et charger les articles
        dlog('✅ Access granted for category:', category, '- loading articles');
        
        // Cacher le message d'accès restreint
        if (memberNotice) memberNotice.style.display = 'none';
        
        // Afficher la section articles
        if (articlesSection) articlesSection.style.display = 'block';
        
        // Charger les articles
        await loadCategoryArticles();
        
    } catch (error) {
        derror('💥 Erreur vérification auth catégorie:', error);
        
        // En cas d'erreur, afficher le message d'accès restreint par sécurité
        if (memberNotice) memberNotice.style.display = 'block';
        if (articlesSection) articlesSection.style.display = 'none';
    }
}

// Chargement des articles de la catégorie
async function loadCategoryArticles() {
    const articlesGrid = document.getElementById('articlesGrid');
    const noArticles = document.getElementById('noArticles');
    
    if (!articlesGrid) return;

    const category = window.categoryConfig.category;
    
    try {
        utils.showLoading(articlesGrid, true);

        // Pour la catégorie retraites, essayer d'abord la route publique
        let apiUrl = `/api/articles/category/${category}`;
        const headers = {};
        
        // Si connecté, utiliser la route authentifiée pour les retraites
        if (window.authManager && window.authManager.isAuthenticated() && category === 'retraites') {
            apiUrl = `/api/articles/user-category/${category}`;
            headers['Authorization'] = `Bearer ${window.authManager.token}`;
        }
        
        console.log('🔍 Chargement des articles pour catégorie:', category, 'URL:', apiUrl);
        
        const response = await fetch(apiUrl, { 
            headers,
            credentials: 'include' // Important pour les cookies refresh
        });
        
        if (!response.ok) {
            console.error('❌ Erreur HTTP:', response.status, response.statusText);
            
            if (response.status === 403) {
                // Accès refusé - afficher un message au lieu de rediriger
                articlesGrid.innerHTML = `
                    <div class="access-denied">
                        <h3>🔒 Accès restreint</h3>
                        <p>Cette section nécessite des privilèges particuliers.</p>
                        ${category === 'retraites' ? '<p>Les articles retraites sont réservés aux membres retraités. <a href="/connexion">Se connecter</a> avec un compte retraité pour y accéder.</p>' : ''}
                    </div>
                `;
                return;
            } else if (response.status === 401) {
                // Non authentifié - pour les retraites, essayer la route publique d'abord
                if (category === 'retraites') {
                    console.log('🔄 Tentative de récupération publique des articles retraites');
                    const publicResponse = await fetch(`/api/articles/category/${category}`, {
                        credentials: 'include'
                    });
                    if (publicResponse.ok) {
                        const articles = await publicResponse.json();
                        displayArticles(articles, articlesGrid, category);
                        return;
                    }
                    // Si même la route publique échoue, afficher un message
                    articlesGrid.innerHTML = `
                        <div class="access-denied">
                            <h3>📝 Articles Retraites</h3>
                            <p>Connectez-vous avec un compte retraité pour accéder au contenu complet des articles retraites.</p>
                            <a href="/connexion?redirect=${encodeURIComponent(window.location.pathname)}" class="btn btn-primary">Se connecter</a>
                        </div>
                    `;
                    return;
                } else {
                    // Pour les autres catégories, rediriger vers la connexion
                    window.location.href = '/connexion?redirect=' + encodeURIComponent(window.location.pathname);
                    return;
                }
            } else {
                // Autres erreurs
                const errorText = await response.text();
                console.error('❌ Détail erreur:', errorText);
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        }
        
        const articles = await response.json();
        console.log('📄 Articles reçus:', articles.length);

        if (articles.length === 0) {
            articlesGrid.innerHTML = `<div class="loading" style="display: none;"></div>`;
            if (noArticles) noArticles.style.display = 'block';
            return;
        }

        articlesGrid.style.display = 'grid';
        if (noArticles) noArticles.style.display = 'none';
        
        // Créer les cartes d'articles
        articlesGrid.innerHTML = articles.map(article => createCategoryArticleCard(article)).join('');

        // Appliquer les restrictions d'accès pour les membres
        applyMemberRestrictions();

    } catch (error) {
        console.error('💥 Erreur lors du chargement des articles:', error);
        articlesGrid.innerHTML = `
            <div class="error">
                <h3>⚠️ Erreur de chargement</h3>
                <p>Impossible de charger les articles de cette catégorie.</p>
                <p><small>Détail: ${error.message}</small></p>
                <button onclick="loadCategoryArticles()" class="btn btn-primary">Réessayer</button>
            </div>
        `;
    }
}

// Création d'une carte d'article pour les catégories
function createCategoryArticleCard(article) {
    const date = window.authManager.formatShortDate(article.published_at || article.created_at);
    const excerpt = article.excerpt || window.utils.truncateText(article.content, 200);
    
    return `
        <article class="article-card ${article.featured ? 'featured' : ''}" data-article-id="${article.id}">
            <div class="article-image">
                ${article.image_url ? 
                    `<img src="${article.image_url}" alt="${window.utils.escapeHtml(article.title)}" loading="lazy">` :
                    getCategoryIcon(window.categoryConfig.category)
                }
            </div>
            <div class="article-content">
                <div class="article-meta">
                    <span class="article-category ${article.category}">${getCategoryLabel(article.category)}</span>
                    <span class="article-date">${date}</span>
                </div>
                <h3 class="article-title">${window.utils.escapeHtml(article.title)}</h3>
                <div class="member-content">
                    <p class="article-excerpt">${window.utils.escapeHtml(excerpt)}</p>
                </div>
                <div class="article-footer">
                    <div class="article-author">
                        Par <strong>${window.utils.escapeHtml(article.firstname)} ${window.utils.escapeHtml(article.lastname)}</strong>
                    </div>
                    <a href="#" class="read-more-btn" onclick="openCategoryArticle(${article.id}); return false;">
                        Lire la suite
                    </a>
                </div>
            </div>
        </article>
    `;
}

// Mise à jour de l'affichage selon le statut membre
function updateMemberAccess() {
    const memberNotice = document.getElementById('memberNotice');
    
    if (!memberNotice) return;

    if (window.authManager.isAuthenticated()) {
        memberNotice.style.display = 'none';
    } else {
        memberNotice.style.display = 'block';
    }
}

// Application des restrictions pour les non-membres
function applyMemberRestrictions() {
    if (!window.authManager.isAuthenticated()) {
        const articleCards = document.querySelectorAll('.article-card');
        
        articleCards.forEach((card, index) => {
            // Flouter les articles après les 2 premiers pour les non-connectés
            if (index >= 2) {
                const memberContent = card.querySelector('.member-content');
                const readMoreBtn = card.querySelector('.read-more-btn');
                
                if (memberContent) {
                    memberContent.classList.add('blurred');
                    
                    // Ajouter un overlay
                    const overlay = document.createElement('div');
                    overlay.className = 'member-overlay';
                    overlay.innerHTML = `
                        <div class="overlay-content">
                            <h4>🔒 Contenu réservé aux membres</h4>
                            <p>Connectez-vous pour accéder à cet article complet</p>
                            <div>
                                <a href="/connexion" class="btn btn-primary" style="margin-right: 1rem;">Se connecter</a>
                                <a href="/inscription" class="btn btn-outline">S'inscrire</a>
                            </div>
                        </div>
                    `;
                    
                    memberContent.style.position = 'relative';
                    memberContent.appendChild(overlay);
                }
                
                if (readMoreBtn) {
                    readMoreBtn.style.display = 'none';
                }
            }
        });
    }
}

// Ouverture d'un article de catégorie
function openCategoryArticle(articleId) {
    if (!window.authManager.isAuthenticated()) {
        window.authManager.showAlert('Veuillez vous connecter pour lire cet article', 'warning');
        setTimeout(() => {
            window.location.href = '/connexion?redirect=' + encodeURIComponent(window.location.pathname);
        }, 2000);
        return;
    }

    // Pour l'instant, afficher une modal ou redirection
    showArticleModal(articleId);
}

// Modal d'affichage d'article
async function showArticleModal(articleId) {
    try {
        const response = await window.authManager.makeAuthenticatedRequest(`/api/articles/${articleId}`);
        
        if (!response.ok) {
            throw new Error('Article non trouvé');
        }

        const article = await response.json();
        
        // Créer et afficher la modal
        const modal = createArticleModal(article);
        document.body.appendChild(modal);
        
        // Fermeture de la modal
        modal.addEventListener('click', (e) => {
            if (e.target === modal || e.target.classList.contains('modal-close')) {
                closeArticleModal(modal);
            }
        });

        // Fermeture avec Escape
        const closeWithEscape = (e) => {
            if (e.key === 'Escape') {
                closeArticleModal(modal);
                document.removeEventListener('keydown', closeWithEscape);
            }
        };
        document.addEventListener('keydown', closeWithEscape);

    } catch (error) {
        console.error('Erreur lors du chargement de l\'article:', error);
        window.authManager.showAlert('Erreur lors du chargement de l\'article', 'error');
    }
}

function createArticleModal(article) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    
    const date = window.authManager.formatDate(article.published_at || article.created_at);
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 900px;">
            <div class="modal-header">
                <div>
                    <h3>${window.utils.escapeHtml(article.title)}</h3>
                    <div style="margin-top: 0.5rem; display: flex; align-items: center; gap: 1rem;">
                        <span class="article-category ${article.category}">${getCategoryLabel(article.category)}</span>
                        <span style="color: var(--medium-gray); font-size: 0.875rem;">${date}</span>
                    </div>
                </div>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                ${article.image_url ? 
                    `<img src="${article.image_url}" alt="${window.utils.escapeHtml(article.title)}" style="width: 100%; max-height: 300px; object-fit: cover; border-radius: 8px; margin-bottom: 1.5rem;">` :
                    ''
                }
                <div style="line-height: 1.8; color: var(--dark-gray);">
                    ${formatArticleContent(article.content)}
                </div>
                <div style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e9ecef; color: var(--medium-gray); font-size: 0.875rem;">
                    Par <strong>${window.utils.escapeHtml(article.firstname)} ${window.utils.escapeHtml(article.lastname)}</strong>
                </div>
            </div>
        </div>
    `;
    
    return modal;
}

function formatArticleContent(content) {
    // Conversion simple des retours à la ligne en paragraphes
    return content
        .split('\n')
        .filter(p => p.trim())
        .map(p => `<p>${window.utils.escapeHtml(p.trim())}</p>`)
        .join('');
}

function closeArticleModal(modal) {
    modal.style.display = 'none';
    document.body.removeChild(modal);
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

// Recherche dans la catégorie (si implémentée)
function initCategorySearch() {
    const searchInput = document.getElementById('categorySearch');
    if (searchInput) {
        searchInput.addEventListener('input', window.utils.debounce(async (e) => {
            const query = e.target.value.trim();
            if (query.length >= 3) {
                await searchInCategory(query);
            } else if (query.length === 0) {
                await loadCategoryArticles();
            }
        }, 300));
    }
}

async function searchInCategory(query) {
    // Implémentation de la recherche dans la catégorie
    // À développer selon les besoins
}