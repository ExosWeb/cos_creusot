// JavaScript pour le panel d'administration
document.addEventListener('DOMContentLoaded', function() {
    initAdminPanel();
});

async function initAdminPanel() {
    console.log('🚀 Initialisation du panel admin...');
    
    // Attendre que l'AuthManager soit complètement initialisé
    await window.authManager.waitForReady();
    
    // Vérifier les droits d'accès admin
    console.log('👤 Utilisateur actuel:', window.authManager.user);
    console.log('🔐 Authentifié:', window.authManager.isAuthenticated());
    console.log('👑 Admin:', window.authManager.isAdmin());
    
    const hasAdminAccess = await window.authManager.requireAdmin();
    if (!hasAdminAccess) {
        console.log('❌ Accès refusé - redirection vers accueil');
        return;
    }
    
    console.log('✅ Accès autorisé - chargement du panel admin');
    initTabs();
    await loadDashboard();
    bindAdminEvents();
}

// Gestion des onglets
function initTabs() {
    const tabLinks = document.querySelectorAll('.tab-link');
    const tabContents = document.querySelectorAll('.tab-content');

    tabLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            const targetTab = link.dataset.tab;
            
            // Mise à jour des liens actifs
            tabLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            // Mise à jour du contenu actif
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === targetTab) {
                    content.classList.add('active');
                }
            });

            // Émettre un événement personnalisé pour informer des changements d'onglet
            document.dispatchEvent(new CustomEvent('tabChanged', {
                detail: { tabId: targetTab }
            }));

            // Charger le contenu de l'onglet
            loadTabContent(targetTab);
        });
    });
}

// Chargement du contenu des onglets
async function loadTabContent(tabName) {
    switch (tabName) {
        case 'dashboard':
            await loadDashboard();
            break;
        case 'users':
            await loadUsers();
            break;
        case 'articles':
            await loadArticles();
            break;
        case 'events':
            // Les événements sont gérés par AdminEventsManager
            if (!window.adminEventsManager) {
                window.adminEventsManager = new AdminEventsManager();
            }
            break;
        case 'messages':
            await loadMessages();
            break;
        case 'logs':
            await loadLogs();
            break;
        case 'logs':
            await loadLogs();
            break;
    }
}

// Liaison des événements de l'interface admin
function bindAdminEvents() {
    // Bouton "Nouvel article"
    const newArticleBtn = document.getElementById('newArticleBtn');
    if (newArticleBtn) {
        newArticleBtn.addEventListener('click', () => openArticleModal());
    }
}

// Chargement du tableau de bord
async function loadDashboard() {
    try {
        const response = await window.authManager.makeAuthenticatedRequest('/api/admin/dashboard');
        const data = await response.json();

        updateStatsGrid(data);
        updateRecentActivity(data.recentActivity);

    } catch (error) {
        console.error('Erreur lors du chargement du dashboard:', error);
        window.authManager.showAlert('Erreur lors du chargement du tableau de bord', 'error');
    }
}

function updateStatsGrid(data) {
    const statsGrid = document.getElementById('statsGrid');
    if (!statsGrid) return;

    const { users, articles, logins, visits } = data;

    statsGrid.innerHTML = `
        <div class="stat-card users">
            <span class="stat-icon">👥</span>
            <span class="stat-number">${users.total_users}</span>
            <span class="stat-label">Utilisateurs</span>
            <div class="stat-details">
                <div class="stat-item">En attente: <span class="number">${users.pending_users}</span></div>
                <div class="stat-item">Approuvés: <span class="number">${users.approved_users}</span></div>
                <div class="stat-item">Administrateurs: <span class="number">${users.admin_users}</span></div>
            </div>
        </div>
        
        <div class="stat-card articles">
            <span class="stat-icon">📝</span>
            <span class="stat-number">${articles.total}</span>
            <span class="stat-label">Articles</span>
            <div class="stat-details">
                <div class="stat-item">Publiés: <span class="number">${articles.published}</span></div>
                <div class="stat-item">Brouillons: <span class="number">${articles.drafts}</span></div>
                <div class="stat-item">Mis en avant: <span class="number">${articles.featured}</span></div>
            </div>
        </div>
        
        <div class="stat-card logins">
            <span class="stat-icon">🔐</span>
            <span class="stat-number">${logins.total_logins}</span>
            <span class="stat-label">Connexions (30j)</span>
            <div class="stat-details">
                <div class="stat-item">Réussies: <span class="number">${logins.successful_logins}</span></div>
                <div class="stat-item">Échouées: <span class="number">${logins.failed_logins}</span></div>
            </div>
        </div>
        
        <div class="stat-card visits">
            <span class="stat-icon">📊</span>
            <span class="stat-number">${visits.total_visits}</span>
            <span class="stat-label">Visites (30j)</span>
            <div class="stat-details">
                <div class="stat-item">Visiteurs uniques: <span class="number">${visits.unique_visitors}</span></div>
                <div class="stat-item">Membres connectés: <span class="number">${visits.logged_users_visits}</span></div>
            </div>
        </div>
    `;
}

function updateRecentActivity(activities) {
    const activityList = document.getElementById('recentActivity');
    if (!activityList || !activities.length) {
        activityList.innerHTML = '<p>Aucune activité récente</p>';
        return;
    }

    activityList.innerHTML = activities.map(activity => `
        <div class="activity-item">
            <div class="activity-icon">${getActivityIcon(activity.action)}</div>
            <div class="activity-content">
                <div class="activity-description">
                    ${formatActivityDescription(activity)}
                </div>
                <div class="activity-meta">
                    ${activity.firstname ? `Par ${activity.firstname} ${activity.lastname}` : 'Système'}
                </div>
            </div>
            <div class="activity-time">
                ${window.authManager.formatDate(activity.created_at)}
            </div>
        </div>
    `).join('');
}

// Chargement des utilisateurs
async function loadUsers() {
    try {
        await Promise.all([
            loadPendingUsers(),
            loadAllUsers()
        ]);

        // Initialiser les filtres
        initUserFilters();

    } catch (error) {
        console.error('Erreur lors du chargement des utilisateurs:', error);
        window.authManager.showAlert('Erreur lors du chargement des utilisateurs', 'error');
    }
}

async function loadPendingUsers() {
    const response = await window.authManager.makeAuthenticatedRequest('/api/admin/users/pending');
    const users = await response.json();

    const container = document.getElementById('pendingUsersList');
    if (!container) return;

    if (users.length === 0) {
        container.innerHTML = '<p>Aucun utilisateur en attente d\'approbation</p>';
        return;
    }

    container.innerHTML = users.map(user => createPendingUserCard(user)).join('');
}

async function loadAllUsers() {
    const response = await window.authManager.makeAuthenticatedRequest('/api/admin/users');
    const users = await response.json();

    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;

    tbody.innerHTML = users.map(user => createUserTableRow(user)).join('');
}

function createPendingUserCard(user) {
    return `
        <div class="user-card pending" data-user-id="${user.id}">
            <div class="user-card-header">
                <div class="user-info">
                    <h4>${window.utils.escapeHtml(user.firstname)} ${window.utils.escapeHtml(user.lastname)}</h4>
                    <p>${window.utils.escapeHtml(user.email)}</p>
                </div>
                <div class="user-actions">
                    <button class="btn btn-secondary" onclick="approveUser(${user.id})">Approuver</button>
                    <button class="btn btn-danger" onclick="rejectUser(${user.id})">Rejeter</button>
                </div>
            </div>
            <div class="user-details">
                ${user.phone ? `<p><strong>Téléphone:</strong> ${window.utils.escapeHtml(user.phone)}</p>` : ''}
                ${user.address ? `<p><strong>Adresse:</strong> ${window.utils.escapeHtml(user.address)}</p>` : ''}
                <p><strong>Inscription:</strong> ${window.authManager.formatDate(user.created_at)}</p>
            </div>
        </div>
    `;
}

function createUserTableRow(user) {
    return `
        <tr data-user-id="${user.id}">
            <td>${window.utils.escapeHtml(user.firstname)} ${window.utils.escapeHtml(user.lastname)}</td>
            <td>${window.utils.escapeHtml(user.email)}</td>
            <td><span class="status-badge ${user.status}">${getStatusLabel(user.status)}</span></td>
            <td><span class="role-badge ${user.role}">${getRoleLabel(user.role)}</span></td>
            <td>${window.authManager.formatShortDate(user.created_at)}</td>
            <td>
                <div class="table-actions">
                    ${user.status === 'pending' ? 
                        `<button class="btn btn-secondary" onclick="approveUser(${user.id})">Approuver</button>
                         <button class="btn btn-danger" onclick="rejectUser(${user.id})">Rejeter</button>` :
                        user.status === 'approved' ? 
                            `<button class="btn btn-danger" onclick="deleteUser(${user.id})">Supprimer</button>` :
                            ''
                    }
                </div>
            </td>
        </tr>
    `;
}

// Gestion des actions utilisateurs
async function approveUser(userId) {
    if (!confirm('Êtes-vous sûr de vouloir approuver cet utilisateur ?')) return;

    try {
        const response = await window.authManager.makeAuthenticatedRequest(`/api/admin/users/${userId}/approve`, {
            method: 'PATCH'
        });

        if (response.ok) {
            window.authManager.showAlert('Utilisateur approuvé avec succès', 'success');
            await loadUsers();
        } else {
            throw new Error('Erreur lors de l\'approbation');
        }
    } catch (error) {
        console.error('Erreur lors de l\'approbation:', error);
        window.authManager.showAlert('Erreur lors de l\'approbation', 'error');
    }
}

async function rejectUser(userId) {
    if (!confirm('Êtes-vous sûr de vouloir rejeter cet utilisateur ?')) return;

    try {
        const response = await window.authManager.makeAuthenticatedRequest(`/api/admin/users/${userId}/reject`, {
            method: 'PATCH'
        });

        if (response.ok) {
            window.authManager.showAlert('Utilisateur rejeté', 'warning');
            await loadUsers();
        } else {
            throw new Error('Erreur lors du rejet');
        }
    } catch (error) {
        console.error('Erreur lors du rejet:', error);
        window.authManager.showAlert('Erreur lors du rejet', 'error');
    }
}

async function deleteUser(userId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.')) return;

    try {
        const response = await window.authManager.makeAuthenticatedRequest(`/api/admin/users/${userId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            window.authManager.showAlert('Utilisateur supprimé', 'success');
            await loadUsers();
        } else {
            throw new Error('Erreur lors de la suppression');
        }
    } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        window.authManager.showAlert('Erreur lors de la suppression', 'error');
    }
}

// Chargement des articles
async function loadArticles() {
    try {
        const response = await window.authManager.makeAuthenticatedRequest('/api/articles/admin/all');
        const articles = await response.json();

        const tbody = document.getElementById('articlesTableBody');
        if (!tbody) return;

        tbody.innerHTML = articles.map(article => createArticleTableRow(article)).join('');

    } catch (error) {
        console.error('Erreur lors du chargement des articles:', error);
        window.authManager.showAlert('Erreur lors du chargement des articles', 'error');
    }
}

function createArticleTableRow(article) {
    return `
        <tr data-article-id="${article.id}">
            <td>
                ${window.utils.escapeHtml(article.title)}
                ${article.featured ? '<span style="color: var(--primary-red); margin-left: 0.5rem;">⭐</span>' : ''}
            </td>
            <td><span class="article-category ${article.category}">${getCategoryLabel(article.category)}</span></td>
            <td><span class="status-badge ${article.status}">${getArticleStatusLabel(article.status)}</span></td>
            <td>${window.utils.escapeHtml(article.firstname)} ${window.utils.escapeHtml(article.lastname)}</td>
            <td>${window.authManager.formatShortDate(article.created_at)}</td>
            <td>
                <div class="table-actions">
                    <button class="btn btn-secondary" onclick="editArticle(${article.id})">Modifier</button>
                    <button class="btn btn-outline" onclick="toggleArticleFeatured(${article.id})">${article.featured ? 'Retirer' : 'Mettre en avant'}</button>
                    <button class="btn btn-danger" onclick="deleteArticle(${article.id})">Supprimer</button>
                </div>
            </td>
        </tr>
    `;
}

// Gestion des événements
function bindAdminEvents() {
    // Bouton nouvel article
    const newArticleBtn = document.getElementById('newArticleBtn');
    if (newArticleBtn) {
        newArticleBtn.addEventListener('click', () => openArticleModal());
    }

    // Filtres
    const userStatusFilter = document.getElementById('userStatusFilter');
    if (userStatusFilter) {
        userStatusFilter.addEventListener('change', filterUsers);
    }

    const logTypeFilter = document.getElementById('logTypeFilter');
    if (logTypeFilter) {
        logTypeFilter.addEventListener('change', loadLogs);
    }

    // Messages - Filtre par statut
    const messageStatusFilter = document.getElementById('messageStatusFilter');
    if (messageStatusFilter) {
        messageStatusFilter.addEventListener('change', (e) => {
            loadMessages(e.target.value);
        });
    }

    // Messages - Marquer tout comme lu
    const markAllReadBtn = document.getElementById('markAllReadBtn');
    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', markAllMessagesAsRead);
    }

    // Modal message - Boutons
    const closeMessageModal = document.getElementById('closeMessageModal');
    const closeMessageDetailBtn = document.getElementById('closeMessageDetailBtn');
    const markAsReadBtn = document.getElementById('markAsReadBtn');
    const markAsRepliedBtn = document.getElementById('markAsRepliedBtn');

    if (closeMessageModal) {
        closeMessageModal.addEventListener('click', () => {
            document.getElementById('messageModal').style.display = 'none';
        });
    }

    if (closeMessageDetailBtn) {
        closeMessageDetailBtn.addEventListener('click', () => {
            document.getElementById('messageModal').style.display = 'none';
        });
    }

    if (markAsReadBtn) {
        markAsReadBtn.addEventListener('click', () => {
            if (currentMessageId) {
                markAsRead(currentMessageId);
            }
        });
    }

    if (markAsRepliedBtn) {
        markAsRepliedBtn.addEventListener('click', () => {
            if (currentMessageId) {
                markAsReplied(currentMessageId);
            }
        });
    }

    // Fermer modal en cliquant à l'extérieur
    const messageModal = document.getElementById('messageModal');
    if (messageModal) {
        messageModal.addEventListener('click', (e) => {
            if (e.target === messageModal) {
                messageModal.style.display = 'none';
            }
        });
    }
}

// Actions articles
async function editArticle(articleId) {
    try {
        const response = await window.authManager.makeAuthenticatedRequest(`/api/articles/${articleId}`);
        const article = await response.json();
        
        openArticleModal(article);
    } catch (error) {
        console.error('Erreur lors du chargement de l\'article:', error);
        window.authManager.showAlert('Erreur lors du chargement de l\'article', 'error');
    }
}

async function toggleArticleFeatured(articleId) {
    try {
        const response = await window.authManager.makeAuthenticatedRequest(`/api/articles/${articleId}/featured`, {
            method: 'PATCH'
        });

        if (response.ok) {
            window.authManager.showAlert('Statut mis en avant modifié', 'success');
            await loadArticles();
        }
    } catch (error) {
        console.error('Erreur lors de la modification:', error);
        window.authManager.showAlert('Erreur lors de la modification', 'error');
    }
}

async function deleteArticle(articleId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet article ?')) return;

    try {
        const response = await window.authManager.makeAuthenticatedRequest(`/api/articles/${articleId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            window.authManager.showAlert('Article supprimé', 'success');
            await loadArticles();
        }
    } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        window.authManager.showAlert('Erreur lors de la suppression', 'error');
    }
}

// Chargement des logs
let currentLogPage = 0;
let currentLogType = 'action';

async function loadLogs() {
    const logTypeFilter = document.getElementById('logTypeFilter');
    currentLogType = logTypeFilter ? logTypeFilter.value : 'action';
    currentLogPage = 0;

    await fetchLogs();
}

async function fetchLogs(page = 0) {
    try {
        const response = await window.authManager.makeAuthenticatedRequest(
            `/api/admin/logs/${currentLogType}?limit=50&offset=${page * 50}`
        );
        const logs = await response.json();

        const tbody = document.getElementById('logsTableBody');
        if (!tbody) return;

        if (page === 0) {
            tbody.innerHTML = '';
        }

        tbody.innerHTML += logs.map(log => createLogTableRow(log, currentLogType)).join('');
        
        updateLogsPagination(logs.length === 50);

    } catch (error) {
        console.error('Erreur lors du chargement des logs:', error);
        window.authManager.showAlert('Erreur lors du chargement des journaux', 'error');
    }
}

function createLogTableRow(log, type) {
    const user = log.firstname ? `${log.firstname} ${log.lastname}` : 'Anonyme';
    
    return `
        <tr>
            <td>${window.authManager.formatDate(log.created_at)}</td>
            <td>${window.utils.escapeHtml(user)}</td>
            <td>${getLogActionLabel(log, type)}</td>
            <td>${window.utils.escapeHtml(log.ip_address || 'N/A')}</td>
            <td>${getLogDetails(log, type)}</td>
        </tr>
    `;
}

function updateLogsPagination(hasMore) {
    const prevBtn = document.getElementById('prevLogsBtn');
    const nextBtn = document.getElementById('nextLogsBtn');
    const pageInfo = document.getElementById('logsPageInfo');

    if (prevBtn) prevBtn.disabled = currentLogPage === 0;
    if (nextBtn) nextBtn.disabled = !hasMore;
    if (pageInfo) pageInfo.textContent = `Page ${currentLogPage + 1}`;
}

// Utilitaires
function getActivityIcon(action) {
    const icons = {
        'register': '👤',
        'login': '🔐',
        'create_article': '📝',
        'update_article': '✏️',
        'delete_article': '🗑️',
        'approve_user': '✅',
        'reject_user': '❌'
    };
    return icons[action] || '📋';
}

function formatActivityDescription(activity) {
    const actions = {
        'register': 'Nouvelle inscription',
        'create_article': 'Article créé',
        'update_article': 'Article modifié',
        'delete_article': 'Article supprimé',
        'approve_user': 'Utilisateur approuvé',
        'reject_user': 'Utilisateur rejeté'
    };
    return actions[activity.action] || activity.action;
}

function getStatusLabel(status) {
    const labels = {
        'pending': 'En attente',
        'approved': 'Approuvé',
        'rejected': 'Rejeté'
    };
    return labels[status] || status;
}

function getRoleLabel(role) {
    const labels = {
        'admin': 'Administrateur',
        'member': 'Membre'
    };
    return labels[role] || role;
}

function getCategoryLabel(category) {
    const labels = {
        'general': 'Général',
        'avantages': 'Avantages',
        'voyages': 'Voyages',
        'retraites': 'Retraites',
        'evenements': 'Événements'
    };
    return labels[category] || category;
}

function getArticleStatusLabel(status) {
    const labels = {
        'published': 'Publié',
        'draft': 'Brouillon'
    };
    return labels[status] || status;
}

function getLogActionLabel(log, type) {
    if (type === 'login') {
        return log.success ? '✅ Connexion réussie' : '❌ Échec de connexion';
    }
    return log.action || 'Action inconnue';
}

function getLogDetails(log, type) {
    if (type === 'login' && !log.success && log.failure_reason) {
        return window.utils.escapeHtml(log.failure_reason);
    }
    if (type === 'visit' && log.page) {
        return window.utils.escapeHtml(log.page);
    }
    if (type === 'action' && log.resource_type) {
        return window.utils.escapeHtml(log.resource_type);
    }
    return '-';
}

// Gestion des articles
let articleModal;
let articleForm;
let currentArticleId = null;

// Modal article
function openArticleModal(article = null) {
    initializeArticleModal();
    
    currentArticleId = article ? article.id : null;
    const isEdit = !!article;
    
    // Mise à jour du titre du modal
    const modalTitle = document.getElementById('articleModalTitle');
    modalTitle.textContent = isEdit ? 'Modifier l\'article' : 'Nouvel article';
    
    // Mise à jour du texte du bouton
    const saveButton = document.getElementById('saveArticleText');
    saveButton.textContent = isEdit ? 'Mettre à jour' : 'Créer l\'article';
    
    const contentEditor = document.getElementById('articleContentEditor');
    const excerptCounter = document.getElementById('excerptCounter');
    
    // Remplir le formulaire si édition
    if (isEdit) {
        document.getElementById('articleId').value = article.id;
        document.getElementById('articleTitle').value = article.title || '';
        document.getElementById('articleCategory').value = article.category || '';
        document.getElementById('articleStatus').value = article.status || 'draft';
        document.getElementById('articleExcerpt').value = article.excerpt || '';
        document.getElementById('articleImageUrl').value = article.image_url || '';
        document.getElementById('articleFeatured').checked = !!article.featured;
        
        // Remplir l'éditeur de contenu
        contentEditor.innerHTML = article.content || '';
        document.getElementById('articleContent').value = article.content || '';
        
        // Mettre à jour le compteur de caractères pour l'excerpt
        const excerptLength = (article.excerpt || '').length;
        excerptCounter.textContent = `${excerptLength}/500`;
        
        // Déclencher la prévisualisation d'image si nécessaire
        if (article.image_url) {
            const event = new Event('input');
            document.getElementById('articleImageUrl').dispatchEvent(event);
        }
    } else {
        // Réinitialiser le formulaire
        articleForm.reset();
        document.getElementById('articleId').value = '';
        document.getElementById('articleStatus').value = 'draft';
        contentEditor.innerHTML = '';
        excerptCounter.textContent = '0/500';
        
        // Masquer la prévisualisation d'image
        document.getElementById('imagePreview').style.display = 'none';
        
        // Nettoyer les erreurs de validation
        const errorDivs = articleModal.querySelectorAll('.field-error');
        errorDivs.forEach(div => div.remove());
        
        // Réinitialiser les styles de validation
        const inputs = articleModal.querySelectorAll('input, select, textarea, .rich-editor');
        inputs.forEach(input => {
            input.style.borderColor = '';
        });
    }
    
    articleModal.style.display = 'flex';
    
    // Focus sur le premier champ
    setTimeout(() => {
        document.getElementById('articleTitle').focus();
    }, 100);
}

function closeArticleModal() {
    if (articleModal) {
        articleModal.style.display = 'none';
        currentArticleId = null;
        if (articleForm) {
            articleForm.reset();
        }
    }
}

async function handleArticleSubmit(e) {
    e.preventDefault();
    
    // S'assurer que le contenu de l'éditeur riche est synchronisé
    const contentEditor = document.getElementById('articleContentEditor');
    const hiddenTextarea = document.getElementById('articleContent');
    hiddenTextarea.value = contentEditor.innerHTML;
    
    const formData = new FormData(articleForm);
    const articleData = {
        title: formData.get('title').trim(),
        content: hiddenTextarea.value.trim(),
        category: formData.get('category'),
        status: formData.get('status'),
        excerpt: formData.get('excerpt').trim() || null,
        image_url: formData.get('image_url').trim() || null,
        featured: formData.has('featured'),
        visibility: formData.get('visibility')
    };
    
    // Validation avancée
    const validationErrors = [];
    
    if (!articleData.title || articleData.title.length < 5) {
        validationErrors.push('Le titre doit contenir au moins 5 caractères.');
    }
    
    if (!articleData.content || contentEditor.innerText.trim().length < 50) {
        validationErrors.push('Le contenu doit contenir au moins 50 caractères.');
    }
    
    if (!articleData.category) {
        validationErrors.push('Veuillez sélectionner une catégorie.');
    }
    
    if (validationErrors.length > 0) {
        window.authManager.showAlert(
            'Veuillez corriger les erreurs suivantes :\n• ' + validationErrors.join('\n• '), 
            'error'
        );
        return;
    }
    
    try {
        const saveButton = document.getElementById('saveArticle');
        const originalText = document.getElementById('saveArticleText').textContent;
        
        // Indicateur de chargement
        document.getElementById('saveArticleText').textContent = 'Enregistrement...';
        saveButton.disabled = true;
        saveButton.style.opacity = '0.7';
        
        const isEdit = currentArticleId !== null;
        const url = isEdit ? `/api/articles/${currentArticleId}` : '/api/articles';
        const method = isEdit ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(articleData)
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Erreur lors de l\'enregistrement');
        }
        
        // Animation de succès
        saveButton.style.background = 'linear-gradient(135deg, #28a745, #20c997)';
        document.getElementById('saveArticleText').textContent = '✓ Enregistré !';
        
        setTimeout(() => {
            window.authManager.showAlert(
                isEdit ? '🎉 Article mis à jour avec succès !' : '🎉 Article créé avec succès !', 
                'success'
            );
            
            closeArticleModal();
            loadArticles(); // Recharger la liste des articles
        }, 1000);
        
    } catch (error) {
        console.error('Erreur lors de l\'enregistrement de l\'article:', error);
        window.authManager.showAlert(
            `❌ Erreur: ${error.message}`, 
            'error'
        );
    } finally {
        // Restaurer le bouton après un délai
        setTimeout(() => {
            const saveButton = document.getElementById('saveArticle');
            const originalText = currentArticleId ? 'Mettre à jour' : 'Créer l\'article';
            document.getElementById('saveArticleText').textContent = originalText;
            saveButton.disabled = false;
            saveButton.style.opacity = '';
            saveButton.style.background = '';
        }, 1500);
    }
}

function initializeArticleModal() {
    if (!articleModal) {
        articleModal = document.getElementById('articleModal');
        articleForm = document.getElementById('articleForm');
        
        // Event listeners pour fermer le modal
        document.getElementById('closeArticleModal').onclick = closeArticleModal;
        document.getElementById('cancelArticle').onclick = closeArticleModal;
        
        // Fermer le modal en cliquant sur l'arrière-plan
        articleModal.onclick = function(e) {
            if (e.target === articleModal) {
                closeArticleModal();
            }
        };
        
        // Gérer la soumission du formulaire
        articleForm.onsubmit = handleArticleSubmit;
        
        // Initialiser les fonctionnalités avancées
        initRichEditor();
        initImagePreview();
        initCharacterCounter();
        initFormValidation();
    }
}

// Éditeur de texte riche
function initRichEditor() {
    const editor = document.getElementById('articleContentEditor');
    const hiddenTextarea = document.getElementById('articleContent');
    const toolbar = document.querySelectorAll('.editor-btn');
    
    // Event listeners pour les boutons de formatage
    toolbar.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const command = btn.dataset.command;
            
            if (command === 'createLink') {
                const url = prompt('URL du lien:');
                if (url) {
                    document.execCommand(command, false, url);
                }
            } else {
                document.execCommand(command, false, null);
            }
            
            // Mettre à jour le textarea caché
            updateHiddenTextarea();
            
            // Focus sur l'éditeur
            editor.focus();
        });
    });
    
    // Synchroniser le contenu avec le textarea caché
    editor.addEventListener('input', updateHiddenTextarea);
    editor.addEventListener('paste', () => {
        setTimeout(updateHiddenTextarea, 10);
    });
    
    function updateHiddenTextarea() {
        hiddenTextarea.value = editor.innerHTML;
    }
}

// Prévisualisation d'image
function initImagePreview() {
    const imageUrlInput = document.getElementById('articleImageUrl');
    const imagePreview = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImg');
    
    imageUrlInput.addEventListener('input', function() {
        const url = this.value.trim();
        
        if (url && isValidImageUrl(url)) {
            previewImg.src = url;
            previewImg.onload = function() {
                imagePreview.style.display = 'block';
            };
            previewImg.onerror = function() {
                imagePreview.style.display = 'none';
            };
        } else {
            imagePreview.style.display = 'none';
        }
    });
    
    function isValidImageUrl(url) {
        return /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(url) || url.includes('unsplash') || url.includes('pexels');
    }
}

// Compteur de caractères
function initCharacterCounter() {
    const excerptTextarea = document.getElementById('articleExcerpt');
    const counter = document.getElementById('excerptCounter');
    const maxLength = 500;
    
    excerptTextarea.addEventListener('input', function() {
        const length = this.value.length;
        counter.textContent = `${length}/${maxLength}`;
        
        // Changement de couleur selon le nombre de caractères
        if (length > maxLength * 0.9) {
            counter.style.color = 'var(--primary-red)';
        } else if (length > maxLength * 0.7) {
            counter.style.color = 'orange';
        } else {
            counter.style.color = 'var(--primary-blue)';
        }
    });
}

// Validation de formulaire améliorée
function initFormValidation() {
    const titleInput = document.getElementById('articleTitle');
    const categorySelect = document.getElementById('articleCategory');
    const contentEditor = document.getElementById('articleContentEditor');
    
    // Validation en temps réel
    titleInput.addEventListener('input', function() {
        validateField(this, this.value.trim().length >= 5, 'Le titre doit contenir au moins 5 caractères');
    });
    
    categorySelect.addEventListener('change', function() {
        validateField(this, this.value !== '', 'Veuillez sélectionner une catégorie');
    });
    
    contentEditor.addEventListener('input', function() {
        const textContent = this.innerText || this.textContent;
        validateField(this, textContent.trim().length >= 50, 'Le contenu doit contenir au moins 50 caractères');
    });
    
    function validateField(element, isValid, errorMessage) {
        const formGroup = element.closest('.form-group');
        let errorDiv = formGroup.querySelector('.field-error');
        
        if (!isValid) {
            element.style.borderColor = 'var(--primary-red)';
            if (!errorDiv) {
                errorDiv = document.createElement('div');
                errorDiv.className = 'field-error';
                formGroup.appendChild(errorDiv);
            }
            errorDiv.textContent = errorMessage;
            errorDiv.style.color = 'var(--primary-red)';
            errorDiv.style.fontSize = '0.8rem';
            errorDiv.style.marginTop = '0.25rem';
        } else {
            element.style.borderColor = 'var(--success-green, #28a745)';
            if (errorDiv) {
                errorDiv.remove();
            }
        }
    }
}

async function handleArticleSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(articleForm);
    const articleData = {
        title: formData.get('title').trim(),
        content: formData.get('content').trim(),
        category: formData.get('category'),
        status: formData.get('status'),
        excerpt: formData.get('excerpt').trim() || null,
        image_url: formData.get('image_url').trim() || null,
        featured: formData.has('featured')
    };
    
    // Validation
    if (!articleData.title || !articleData.content || !articleData.category) {
        window.authManager.showAlert('Veuillez remplir tous les champs requis.', 'error');
        return;
    }
    
    try {
        const saveButton = document.getElementById('saveArticle');
        const originalText = document.getElementById('saveArticleText').textContent;
        
        // Indicateur de chargement
        document.getElementById('saveArticleText').textContent = 'Enregistrement...';
        saveButton.disabled = true;
        
        const isEdit = currentArticleId !== null;
        const url = isEdit ? `/api/articles/${currentArticleId}` : '/api/articles';
        const method = isEdit ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(articleData)
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Erreur lors de l\'enregistrement');
        }
        
        window.authManager.showAlert(
            isEdit ? 'Article mis à jour avec succès !' : 'Article créé avec succès !', 
            'success'
        );
        
        closeArticleModal();
        loadArticles(); // Recharger la liste des articles
        
    } catch (error) {
        console.error('Erreur lors de l\'enregistrement de l\'article:', error);
        window.authManager.showAlert(
            `Erreur: ${error.message}`, 
            'error'
        );
    } finally {
        // Restaurer le bouton
        const saveButton = document.getElementById('saveArticle');
        document.getElementById('saveArticleText').textContent = originalText;
        saveButton.disabled = false;
    }
}

// Fonction pour éditer un article
function editArticle(articleId) {
    // Récupérer les données de l'article depuis le tableau
    const row = document.querySelector(`tr[data-article-id="${articleId}"]`);
    if (!row) {
        window.authManager.showAlert('Article non trouvé.', 'error');
        return;
    }
    
    // Récupérer les données depuis les attributs data- ou faire un appel API
    fetchArticleForEdit(articleId);
}

async function fetchArticleForEdit(articleId) {
    try {
        const response = await fetch(`/api/articles/${articleId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Impossible de récupérer l\'article');
        }
        
        const article = await response.json();
        openArticleModal(article);
        
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'article:', error);
        window.authManager.showAlert('Erreur lors de la récupération de l\'article.', 'error');
    }
}

// Filtres
function initUserFilters() {
    // Implémentation des filtres utilisateurs
}

function filterUsers() {
    // Implémentation du filtrage
}

// ===========================
// GESTION DES MESSAGES
// ===========================

let currentMessages = [];
let currentMessageId = null;

async function loadMessages(status = '') {
    try {
        const url = status ? `/api/admin/messages?status=${status}` : '/api/admin/messages';
        const response = await window.authManager.makeAuthenticatedRequest(url);
        
        if (!response.ok) {
            throw new Error('Erreur lors de la récupération des messages');
        }
        
        const data = await response.json();
        currentMessages = data.messages;
        
        // Mettre à jour les statistiques
        updateMessagesStats(data.stats);
        
        // Afficher les messages
        displayMessages(currentMessages);
        
    } catch (error) {
        console.error('Erreur lors du chargement des messages:', error);
        document.getElementById('messagesList').innerHTML = `
            <div class="error">
                <p>❌ Erreur lors du chargement des messages</p>
                <button onclick="loadMessages()" class="btn btn-primary">Réessayer</button>
            </div>
        `;
    }
}

function updateMessagesStats(stats) {
    document.getElementById('totalMessages').textContent = stats.total || 0;
    document.getElementById('newMessages').textContent = stats.new_count || 0;
    document.getElementById('repliedMessages').textContent = stats.replied_count || 0;
}

function displayMessages(messages) {
    const container = document.getElementById('messagesList');
    
    if (messages.length === 0) {
        container.innerHTML = `
            <div class="no-messages">
                <div class="no-content-icon">📬</div>
                <h3>Aucun message</h3>
                <p>Il n'y a aucun message de contact pour le moment.</p>
            </div>
        `;
        return;
    }
    
    const messagesHtml = messages.map(message => createMessageCard(message)).join('');
    container.innerHTML = `
        <div class="messages-grid">
            ${messagesHtml}
        </div>
    `;
}

function createMessageCard(message) {
    const statusColors = {
        'new': '#e74c3c',
        'read': '#f39c12', 
        'replied': '#27ae60'
    };
    
    const statusLabels = {
        'new': 'Nouveau',
        'read': 'Lu',
        'replied': 'Répondu'
    };
    
    const date = new Date(message.created_at).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    return `
        <div class="message-card ${message.status}" data-message-id="${message.id}">
            <div class="message-header">
                <div class="message-sender">
                    <strong>${window.utils.escapeHtml(message.name)}</strong>
                    <span class="message-email">${window.utils.escapeHtml(message.email)}</span>
                </div>
                <div class="message-status" style="color: ${statusColors[message.status]};">
                    ${statusLabels[message.status]}
                </div>
            </div>
            
            <div class="message-subject">
                <h4>${window.utils.escapeHtml(message.subject)}</h4>
            </div>
            
            <div class="message-preview">
                ${window.utils.truncateText(message.message, 150)}
            </div>
            
            <div class="message-footer">
                <span class="message-date">${date}</span>
                <div class="message-actions">
                    <button class="btn btn-sm btn-outline" onclick="viewMessage(${message.id})">
                        👁️ Voir
                    </button>
                    ${message.status === 'new' ? `
                        <button class="btn btn-sm btn-primary" onclick="markAsRead(${message.id})">
                            ✓ Lu
                        </button>
                    ` : ''}
                    <button class="btn btn-sm btn-danger" onclick="deleteMessage(${message.id})">
                        🗑️ Supprimer
                    </button>
                </div>
            </div>
        </div>
    `;
}

async function viewMessage(messageId) {
    try {
        const response = await window.authManager.makeAuthenticatedRequest(`/api/admin/messages/${messageId}`);
        
        if (!response.ok) {
            throw new Error('Erreur lors de la récupération du message');
        }
        
        const message = await response.json();
        currentMessageId = messageId;
        
        // Remplir le modal avec les données du message
        document.getElementById('messageSender').textContent = message.name;
        document.getElementById('messageEmail').textContent = message.email;
        document.getElementById('messagePhone').textContent = message.phone || 'Non renseigné';
        document.getElementById('messageDate').textContent = new Date(message.created_at).toLocaleString('fr-FR');
        document.getElementById('messageStatus').textContent = getStatusLabel(message.status);
        document.getElementById('messageSubjectText').textContent = message.subject;
        document.getElementById('messageContentText').innerHTML = message.message.replace(/\n/g, '<br>');
        
        // Adapter les boutons selon le statut
        const markAsReadBtn = document.getElementById('markAsReadBtn');
        const markAsRepliedBtn = document.getElementById('markAsRepliedBtn');
        
        markAsReadBtn.style.display = message.status === 'new' ? 'inline-block' : 'none';
        markAsRepliedBtn.style.display = message.status !== 'replied' ? 'inline-block' : 'none';
        
        // Afficher le modal
        document.getElementById('messageModal').style.display = 'flex';
        
        // Marquer automatiquement comme lu si c'est nouveau
        if (message.status === 'new') {
            await updateMessageStatus(messageId, 'read');
        }
        
    } catch (error) {
        console.error('Erreur lors de la visualisation du message:', error);
        window.authManager.showAlert('Erreur lors de la visualisation du message', 'error');
    }
}

function getStatusLabel(status) {
    const labels = {
        'new': 'Nouveau',
        'read': 'Lu',
        'replied': 'Répondu'
    };
    return labels[status] || status;
}

async function markAsRead(messageId) {
    await updateMessageStatus(messageId, 'read');
}

async function markAsReplied(messageId) {
    await updateMessageStatus(messageId, 'replied');
}

async function updateMessageStatus(messageId, status) {
    try {
        const response = await window.authManager.makeAuthenticatedRequest(
            `/api/admin/messages/${messageId}/status`,
            {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            }
        );
        
        if (!response.ok) {
            throw new Error('Erreur lors de la mise à jour du statut');
        }
        
        window.authManager.showAlert('Statut mis à jour', 'success');
        
        // Recharger les messages
        const currentFilter = document.getElementById('messageStatusFilter').value;
        await loadMessages(currentFilter);
        
        // Fermer le modal si ouvert
        document.getElementById('messageModal').style.display = 'none';
        
    } catch (error) {
        console.error('Erreur lors de la mise à jour du statut:', error);
        window.authManager.showAlert('Erreur lors de la mise à jour du statut', 'error');
    }
}

async function deleteMessage(messageId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce message ?')) {
        return;
    }
    
    try {
        const response = await window.authManager.makeAuthenticatedRequest(
            `/api/admin/messages/${messageId}`,
            { method: 'DELETE' }
        );
        
        if (!response.ok) {
            throw new Error('Erreur lors de la suppression du message');
        }
        
        window.authManager.showAlert('Message supprimé', 'success');
        
        // Recharger les messages
        const currentFilter = document.getElementById('messageStatusFilter').value;
        await loadMessages(currentFilter);
        
        // Fermer le modal si ouvert
        document.getElementById('messageModal').style.display = 'none';
        
    } catch (error) {
        console.error('Erreur lors de la suppression du message:', error);
        window.authManager.showAlert('Erreur lors de la suppression du message', 'error');
    }
}

async function markAllMessagesAsRead() {
    if (!confirm('Marquer tous les nouveaux messages comme lus ?')) {
        return;
    }
    
    try {
        const response = await window.authManager.makeAuthenticatedRequest(
            '/api/admin/messages/mark-all-read',
            { method: 'PUT' }
        );
        
        if (!response.ok) {
            throw new Error('Erreur lors de la mise à jour');
        }
        
        window.authManager.showAlert('Tous les messages ont été marqués comme lus', 'success');
        
        // Recharger les messages
        const currentFilter = document.getElementById('messageStatusFilter').value;
        await loadMessages(currentFilter);
        
    } catch (error) {
        console.error('Erreur lors de la mise à jour:', error);
        window.authManager.showAlert('Erreur lors de la mise à jour', 'error');
    }
}