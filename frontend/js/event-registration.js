// Gestion des inscriptions aux événements
class EventRegistrationManager {
    constructor() {
        this.registrations = new Map(); // Cache des inscriptions
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadUserRegistrations();
    }

    bindEvents() {
        // Délégation d'événements pour les boutons d'inscription
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-register-event')) {
                e.preventDefault();
                const eventId = parseInt(e.target.dataset.eventId);
                this.registerToEvent(eventId, e.target);
            }

            if (e.target.classList.contains('btn-unregister-event')) {
                e.preventDefault();
                const eventId = parseInt(e.target.dataset.eventId);
                this.unregisterFromEvent(eventId, e.target);
            }

            if (e.target.classList.contains('btn-view-registrations')) {
                e.preventDefault();
                const eventId = parseInt(e.target.dataset.eventId);
                this.viewEventRegistrations(eventId);
            }
        });
    }

    async loadUserRegistrations() {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        try {
            // Charger toutes les inscriptions de l'utilisateur connecté
            const response = await fetch('/api/user/registrations', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    data.registrations.forEach(reg => {
                        this.registrations.set(reg.event_id, reg);
                    });
                    this.updateRegistrationButtons();
                }
            }
        } catch (error) {
            console.error('Erreur lors du chargement des inscriptions:', error);
        }
    }

    async registerToEvent(eventId, buttonElement) {
        const token = localStorage.getItem('authToken');
        if (!token) {
            this.showAuthRequired();
            return;
        }

        try {
            buttonElement.disabled = true;
            buttonElement.innerHTML = '<span class="loading-spinner"></span> Inscription...';

            const response = await fetch(`/api/events/${eventId}/register`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.success) {
                this.registrations.set(eventId, { 
                    event_id: eventId, 
                    status: 'registered',
                    registration_date: new Date().toISOString()
                });
                
                this.updateRegistrationButtons();
                this.showNotification('Inscription réussie !', 'success');
                
                // Mettre à jour le compteur de participants si disponible
                this.updateParticipantCount(eventId, 1);
                
                // Émettre un événement personnalisé
                window.dispatchEvent(new CustomEvent('eventRegistrationChanged', {
                    detail: { type: 'register', eventId: eventId }
                }));
                
            } else {
                this.showNotification(data.message || 'Erreur lors de l\'inscription', 'error');
                buttonElement.disabled = false;
                this.resetButtonText(buttonElement, 'S\'inscrire');
            }

        } catch (error) {
            console.error('Erreur lors de l\'inscription:', error);
            this.showNotification('Erreur de connexion', 'error');
            buttonElement.disabled = false;
            this.resetButtonText(buttonElement, 'S\'inscrire');
        }
    }

    async unregisterFromEvent(eventId, buttonElement) {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        if (!confirm('Êtes-vous sûr de vouloir vous désinscrire de cet événement ?')) {
            return;
        }

        try {
            buttonElement.disabled = true;
            buttonElement.innerHTML = '<span class="loading-spinner"></span> Désinscription...';

            const response = await fetch(`/api/events/${eventId}/register`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (data.success) {
                this.registrations.delete(eventId);
                this.updateRegistrationButtons();
                this.showNotification('Désinscription réussie', 'success');
                
                // Mettre à jour le compteur de participants
                this.updateParticipantCount(eventId, -1);
                
                // Émettre un événement personnalisé
                window.dispatchEvent(new CustomEvent('eventRegistrationChanged', {
                    detail: { type: 'unregister', eventId: eventId }
                }));
                
            } else {
                this.showNotification(data.message || 'Erreur lors de la désinscription', 'error');
                buttonElement.disabled = false;
                this.resetButtonText(buttonElement, 'Se désinscrire');
            }

        } catch (error) {
            console.error('Erreur lors de la désinscription:', error);
            this.showNotification('Erreur de connexion', 'error');
            buttonElement.disabled = false;
            this.resetButtonText(buttonElement, 'Se désinscrire');
        }
    }

    updateRegistrationButtons() {
        const eventCards = document.querySelectorAll('[data-event-id]');
        
        eventCards.forEach(card => {
            const eventId = parseInt(card.dataset.eventId);
            const isRegistered = this.registrations.has(eventId);
            const registerBtn = card.querySelector('.btn-register-event, .btn-unregister-event');
            
            if (registerBtn) {
                if (isRegistered) {
                    registerBtn.className = 'btn-unregister-event btn-secondary';
                    registerBtn.innerHTML = '✓ Inscrit - Se désinscrire';
                    registerBtn.dataset.eventId = eventId;
                } else {
                    registerBtn.className = 'btn-register-event btn-primary';
                    registerBtn.innerHTML = 'S\'inscrire';
                    registerBtn.dataset.eventId = eventId;
                    registerBtn.disabled = false;
                }
            }
        });
    }

    updateParticipantCount(eventId, change) {
        const participantCounters = document.querySelectorAll(`[data-event-id="${eventId}"] .participant-count`);
        
        participantCounters.forEach(counter => {
            const currentText = counter.textContent;
            const match = currentText.match(/(\d+)/);
            if (match) {
                const currentCount = parseInt(match[1]);
                const newCount = currentCount + change;
                counter.textContent = currentText.replace(/\d+/, newCount);
            }
        });
    }

    resetButtonText(button, text) {
        setTimeout(() => {
            button.innerHTML = text;
        }, 500);
    }

    showAuthRequired() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content auth-required-modal">
                <div class="modal-header">
                    <h3>Connexion requise</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="auth-required-content">
                        <div class="auth-icon">🔐</div>
                        <p>Vous devez être connecté et votre compte approuvé pour vous inscrire aux événements.</p>
                    </div>
                </div>
                <div class="modal-footer">
                    <a href="/connexion" class="btn-primary">Se connecter</a>
                    <a href="/inscription" class="btn-secondary">Créer un compte</a>
                    <button class="btn-outline" onclick="this.closest('.modal-overlay').remove()">Fermer</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    async viewEventRegistrations(eventId) {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        try {
            const response = await fetch(`/api/events/${eventId}/registrations`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (data.success) {
                this.showRegistrationsModal(eventId, data.registrations);
            } else {
                this.showNotification(data.message || 'Impossible de charger les inscriptions', 'error');
            }

        } catch (error) {
            console.error('Erreur lors du chargement des inscriptions:', error);
            this.showNotification('Erreur de connexion', 'error');
        }
    }

    showRegistrationsModal(eventId, registrations) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content registrations-modal">
                <div class="modal-header">
                    <h3>Inscriptions à l'événement</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="registrations-stats">
                        <div class="stat-item">
                            <span class="stat-number">${registrations.length}</span>
                            <span class="stat-label">Inscrits</span>
                        </div>
                    </div>
                    
                    <div class="registrations-list">
                        ${registrations.length === 0 ? 
                            '<p class="no-registrations">Aucune inscription pour le moment</p>' :
                            registrations.map(reg => `
                                <div class="registration-item">
                                    <div class="registration-info">
                                        <strong>${reg.firstname} ${reg.lastname}</strong>
                                        <span class="registration-email">${reg.email}</span>
                                        ${reg.phone ? `<span class="registration-phone">${reg.phone}</span>` : ''}
                                    </div>
                                    <div class="registration-date">
                                        ${this.formatDate(reg.registration_date)}
                                    </div>
                                    <div class="registration-status status-${reg.status}">
                                        ${this.getStatusLabel(reg.status)}
                                    </div>
                                </div>
                            `).join('')
                        }
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-primary" onclick="eventRegistration.exportRegistrations(${eventId})">
                        📥 Exporter
                    </button>
                    <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Fermer</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    async exportRegistrations(eventId) {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        try {
            const response = await fetch(`/api/events/${eventId}/registrations/export`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `inscriptions-evenement-${eventId}.csv`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                this.showNotification('Export réalisé avec succès', 'success');
            } else {
                this.showNotification('Erreur lors de l\'export', 'error');
            }

        } catch (error) {
            console.error('Erreur lors de l\'export:', error);
            this.showNotification('Erreur de connexion', 'error');
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${this.getNotificationIcon(type)}</span>
                <span class="notification-message">${message}</span>
            </div>
        `;

        document.body.appendChild(notification);

        // Animation d'entrée
        setTimeout(() => notification.classList.add('show'), 100);

        // Suppression automatique
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }

    getNotificationIcon(type) {
        const icons = {
            'success': '✅',
            'error': '❌',
            'warning': '⚠️',
            'info': 'ℹ️'
        };
        return icons[type] || icons.info;
    }

    getStatusLabel(status) {
        const labels = {
            'registered': 'Inscrit',
            'cancelled': 'Annulé',
            'attended': 'Présent'
        };
        return labels[status] || status;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Méthode pour ajouter les boutons d'inscription aux cartes d'événements
    addRegistrationButtonsToEvents() {
        const eventCards = document.querySelectorAll('.event-card, .related-article-card');
        const token = localStorage.getItem('authToken');
        
        eventCards.forEach(card => {
            const eventId = card.dataset.eventId || card.dataset.id;
            if (!eventId) return;

            const actionsContainer = card.querySelector('.article-actions, .event-actions');
            if (!actionsContainer) return;

            // Vérifier si le bouton n'existe pas déjà
            if (actionsContainer.querySelector('.btn-register-event, .btn-unregister-event')) {
                return;
            }

            const isRegistered = this.registrations.has(parseInt(eventId));
            const buttonHTML = token ? 
                `<button class="${isRegistered ? 'btn-unregister-event btn-secondary' : 'btn-register-event btn-primary'}" 
                         data-event-id="${eventId}">
                    ${isRegistered ? '✓ Inscrit - Se désinscrire' : 'S\'inscrire'}
                </button>` :
                `<button class="btn-register-event btn-primary" data-event-id="${eventId}">
                    S'inscrire
                </button>`;

            actionsContainer.insertAdjacentHTML('beforeend', buttonHTML);
        });
    }
}

// CSS pour les notifications et modales
const style = document.createElement('style');
style.textContent = `
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 10001;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        min-width: 300px;
        max-width: 500px;
    }
    
    .notification.show {
        transform: translateX(0);
    }
    
    .notification-success { border-left: 4px solid #28a745; }
    .notification-error { border-left: 4px solid #dc3545; }
    .notification-warning { border-left: 4px solid #ffc107; }
    .notification-info { border-left: 4px solid #17a2b8; }
    
    .notification-content {
        padding: 1rem;
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }
    
    .notification-icon {
        font-size: 1.2rem;
    }
    
    .notification-message {
        flex: 1;
        font-weight: 500;
    }
    
    .loading-spinner {
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-top: 2px solid white;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        display: inline-block;
        margin-right: 0.5rem;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    .auth-required-modal {
        max-width: 400px;
    }
    
    .auth-required-content {
        text-align: center;
        padding: 1rem 0;
    }
    
    .auth-icon {
        font-size: 3rem;
        margin-bottom: 1rem;
    }
    
    .registrations-modal {
        max-width: 700px;
    }
    
    .registrations-stats {
        display: flex;
        gap: 2rem;
        margin-bottom: 2rem;
        justify-content: center;
    }
    
    .stat-item {
        text-align: center;
    }
    
    .stat-number {
        display: block;
        font-size: 2rem;
        font-weight: bold;
        color: var(--primary-color, #2c5aa0);
    }
    
    .stat-label {
        font-size: 0.9rem;
        color: #6c757d;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    
    .registrations-list {
        max-height: 400px;
        overflow-y: auto;
    }
    
    .registration-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1rem;
        border: 1px solid #e1e8ed;
        border-radius: 8px;
        margin-bottom: 0.5rem;
        background: #f8f9fa;
    }
    
    .registration-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }
    
    .registration-email, .registration-phone {
        font-size: 0.9rem;
        color: #6c757d;
    }
    
    .registration-date {
        font-size: 0.85rem;
        color: #6c757d;
        margin: 0 1rem;
    }
    
    .registration-status {
        padding: 0.25rem 0.75rem;
        border-radius: 20px;
        font-size: 0.8rem;
        font-weight: 600;
    }
    
    .status-registered { background: #d4edda; color: #155724; }
    .status-cancelled { background: #f8d7da; color: #721c24; }
    .status-attended { background: #d1ecf1; color: #0c5460; }
    
    .no-registrations {
        text-align: center;
        color: #6c757d;
        padding: 2rem;
        font-style: italic;
    }
`;
document.head.appendChild(style);

// Méthode alias pour compatibilité
EventRegistrationManager.prototype.registerForEvent = function(eventId, buttonElement) {
    return this.registerToEvent(eventId, buttonElement);
};

// Initialisation automatique
document.addEventListener('DOMContentLoaded', () => {
    window.eventRegistration = new EventRegistrationManager();
    
    // Ajouter les boutons d'inscription après le chargement des événements
    setTimeout(() => {
        window.eventRegistration.addRegistrationButtonsToEvents();
    }, 2000);
});