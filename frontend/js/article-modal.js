// Article Modal System
(function() {
    'use strict';
    
    let currentModal = null;
    
    // Create modal HTML structure
    function createModalHTML() {
        return `
            <div id="articleModal" class="article-modal">
                <div class="article-modal-content">
                    <div class="article-modal-header">
                        <button class="article-modal-close">&times;</button>
                        <h1 class="article-modal-title"></h1>
                        <div class="article-modal-meta">
                            <span class="article-modal-category"></span>
                            <span class="article-modal-date">
                                📅 <span class="date-text"></span>
                            </span>
                            <span class="article-modal-author">
                                ✍️ <span class="author-text"></span>
                            </span>
                        </div>
                    </div>
                    <div class="article-modal-body">
                        <div class="article-modal-loading">Chargement de l'article...</div>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Initialize modal in DOM
    function initModal() {
        if (document.getElementById('articleModal')) return;
        
        const modalHTML = createModalHTML();
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        const modal = document.getElementById('articleModal');
        const closeBtn = modal.querySelector('.article-modal-close');
        
        // Close handlers
        closeBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
        
        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && currentModal) {
                closeModal();
            }
        });
        
        currentModal = modal;
    }
    
    // Fetch article data
    async function fetchArticle(articleId) {
        try {
            dlog('📖 Fetching article:', articleId);
            
            // Try public route first (for non-restricted articles)
            let response = await fetch(`/api/articles/public/${articleId}`, {
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                return data.article || data;
            }
            
            // If public route fails, try authenticated route
            if (response.status === 404 || response.status === 403) {
                dlog('🔒 Article not public, trying authenticated route...');
                
                const authHeaders = {
                    'Content-Type': 'application/json'
                };
                
                // Add auth token if available
                if (window.authManager && window.authManager.token) {
                    authHeaders['Authorization'] = `Bearer ${window.authManager.token}`;
                }
                
                response = await fetch(`/api/articles/${articleId}`, {
                    credentials: 'include',
                    headers: authHeaders
                });
                
                if (response.ok) {
                    const data = await response.json();
                    return data.article || data;
                }
                
                if (response.status === 401) {
                    // Try to refresh token and retry
                    if (window.authManager && typeof window.authManager.verifyToken === 'function') {
                        dlog('🔄 Attempting token refresh...');
                        const refreshed = await window.authManager.verifyToken();
                        if (refreshed) {
                            dlog('✅ Token refreshed, retrying request...');
                            // Retry the request with potentially new token
                            const retryResponse = await fetch(`/api/articles/${articleId}`, {
                                credentials: 'include',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': window.authManager.token ? `Bearer ${window.authManager.token}` : ''
                                }
                            });
                            if (retryResponse.ok) {
                                const data = await retryResponse.json();
                                return data.article || data;
                            }
                        }
                    }
                    throw new Error('Authentification requise - veuillez vous connecter');
                }
            }
            
            throw new Error(`Erreur ${response.status}: ${response.statusText}`);
            
        } catch (error) {
            derror('Failed to fetch article:', error);
            throw error;
        }
    }
    
    // Format date for display
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    }
    
    // Get category display name
    function getCategoryDisplayName(category) {
        const names = {
            general: 'Général',
            prestations: 'Prestations', 
            voyages: 'Voyages',
            retraites: 'Retraites',
            evenements: 'Événements'
        };
        return names[category] || category;
    }
    
    // Populate modal with article data
    function populateModal(article) {
        if (!currentModal) return;
        
        const titleEl = currentModal.querySelector('.article-modal-title');
        const categoryEl = currentModal.querySelector('.article-modal-category');
        const dateEl = currentModal.querySelector('.date-text');
        const authorEl = currentModal.querySelector('.author-text');
        const bodyEl = currentModal.querySelector('.article-modal-body');
        
        // Set title
        titleEl.textContent = article.title;
        
        // Set category
        categoryEl.textContent = getCategoryDisplayName(article.category);
        categoryEl.className = `article-modal-category ${article.category}`;
        
        // Set date
        const displayDate = article.published_at || article.created_at;
        dateEl.textContent = formatDate(displayDate);
        
        // Set author
        const authorName = article.firstname && article.lastname 
            ? `${article.firstname} ${article.lastname}`
            : 'Auteur inconnu';
        authorEl.textContent = authorName;
        
        // Set content
        let contentHTML = '';
        
        // Add image if exists
        if (article.image_url) {
            contentHTML += `<img src="${article.image_url}" alt="${article.title}" class="article-modal-image">`;
        }
        
        // Add excerpt if different from content start
        if (article.excerpt && !article.content.startsWith(article.excerpt.substring(0, 50))) {
            contentHTML += `<div class="article-excerpt"><em>${article.excerpt}</em></div><hr style="margin: 20px 0;">`;
        }
        
        // Add main content
        contentHTML += `<div class="article-modal-content-text">${article.content}</div>`;
        
        bodyEl.innerHTML = contentHTML;
        
        // Scroll to top
        bodyEl.scrollTop = 0;
    }
    
    // Show error in modal
    function showError(error) {
        if (!currentModal) return;
        
        const bodyEl = currentModal.querySelector('.article-modal-body');
        bodyEl.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                <div style="font-size: 3rem; margin-bottom: 20px;">⚠️</div>
                <h3 style="color: #d73527; margin-bottom: 15px;">Erreur de chargement</h3>
                <p>Impossible de charger cet article.</p>
                <p><small>${error.message}</small></p>
                <button onclick="window.ArticleModal.closeModal()" style="margin-top: 20px; padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">Fermer</button>
            </div>
        `;
    }
    
    // Open modal with article
    async function openModal(articleId) {
        dlog('🚀 openModal called with articleId:', articleId);
        
        initModal();
        
        if (!currentModal) {
            derror('Failed to initialize modal');
            return;
        }
        
        dlog('📋 Modal state before opening:', {
            hasShowClass: currentModal.classList.contains('show'),
            displayStyle: currentModal.style.display,
            computedDisplay: window.getComputedStyle(currentModal).display
        });
        
        // Ensure modal is ready to show (remove any inline styles)
        currentModal.style.display = '';
        
        // Show modal with loading state
        currentModal.classList.add('show');
        document.body.style.overflow = 'hidden';
        
        // Reset content to loading
        const bodyEl = currentModal.querySelector('.article-modal-body');
        bodyEl.innerHTML = '<div class="article-modal-loading">Chargement de l\'article...</div>';
        
        try {
            const article = await fetchArticle(articleId);
            populateModal(article);
            dlog('✅ Article modal opened:', article.title);
        } catch (error) {
            derror('❌ Failed to load article:', error);
            showError(error);
        }
    }
    
    // Close modal
    function closeModal() {
        if (currentModal) {
            dlog('🚪 Closing modal');
            currentModal.classList.remove('show');
            document.body.style.overflow = '';
            
            // Remove any inline display style to let CSS handle it
            currentModal.style.display = '';
            
            dlog('📋 Modal state after closing:', {
                hasShowClass: currentModal.classList.contains('show'),
                displayStyle: currentModal.style.display,
                computedDisplay: window.getComputedStyle(currentModal).display
            });
        }
    }
    
    // Global API
    window.ArticleModal = {
        open: openModal,
        close: closeModal,
        closeModal: closeModal // Alias for template usage
    };
    
    // Global function for backwards compatibility
    window.viewArticleDetails = function(articleId) {
        dlog('🔗 Opening article modal:', articleId);
        openModal(articleId);
    };
    
    // Alternative function names
    window.openArticleModal = openModal;
    window.showArticle = openModal;
    
    dlog('✅ Article Modal system initialized');
    
})();