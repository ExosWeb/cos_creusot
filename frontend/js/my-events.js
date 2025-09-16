// Gestionnaire pour la page "Mes Événements"
class MyEventsManager {
    constructor() {
        this.userRegistrations = [];
        this.availableEvents = [];
        this.currentTab = 'upcoming';
        this.filters = {
            category: '',
            search: ''
        };
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadUserRegistrations();
        this.loadAvailableEvents();
    }

    bindEvents() {
        // Navigation entre les onglets
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Recherche dans les événements disponibles
        const searchInput = document.getElementById('availableSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filters.search = e.target.value.toLowerCase();
                this.filterAvailableEvents();
            });
        }

        // Filtre par catégorie
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                this.filters.category = e.target.value;
                this.filterAvailableEvents();
            });
        }

        // Écouter les événements d'inscription/désinscription
        window.addEventListener('eventRegistrationChanged', (e) => {
            this.handleRegistrationChange(e.detail);
        });
    }

    switchTab(tabName) {
        // Mettre à jour les boutons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Mettre à jour les contenus
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === tabName);
        });

        this.currentTab = tabName;

        // Charger les données si nécessaire
        if (tabName === 'available' && this.availableEvents.length === 0) {
            this.loadAvailableEvents();
        }
    }

    async loadUserRegistrations() {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) return;

            const response = await fetch('/api/events/user/registrations', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (data.success) {
                this.userRegistrations = data.registrations;
                this.displayUserEvents();
            } else {
                this.showError('Erreur lors du chargement de vos événements');
            }

        } catch (error) {
            console.error('Erreur:', error);
            this.showError('Erreur de connexion');
        }
    }

    async loadAvailableEvents() {
        try {
            const token = localStorage.getItem('authToken');
            const headers = {};
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch('/api/events', { headers });
            const data = await response.json();

            if (data.success) {
                // Filtrer seulement les événements à venir non inscrits
                const now = new Date();
                this.availableEvents = data.events.filter(event => {
                    const eventDate = new Date(event.start_date);
                    const isUpcoming = eventDate >= now;
                    const isNotRegistered = !this.userRegistrations.find(reg => reg.event_id === event.id);
                    return isUpcoming && isNotRegistered;
                });
                
                this.displayAvailableEvents();
            }

        } catch (error) {
            console.error('Erreur:', error);
            this.showError('Erreur lors du chargement des événements disponibles');
        }
    }

    displayUserEvents() {
        const now = new Date();
        
        // Séparer les événements à venir et passés
        const upcomingEvents = this.userRegistrations.filter(reg => {
            const eventDate = new Date(reg.start_date);
            return eventDate >= now;
        });

        const pastEvents = this.userRegistrations.filter(reg => {
            const eventDate = new Date(reg.start_date);
            return eventDate < now;
        });

        this.displayEventsList('upcomingEvents', upcomingEvents, 'noUpcomingEvents');
        this.displayEventsList('pastEvents', pastEvents, 'noPastEvents');
    }

    displayEventsList(containerId, events, noEventsId) {
        const container = document.getElementById(containerId);
        const noEventsDiv = document.getElementById(noEventsId);

        if (!container) return;

        if (events.length === 0) {
            container.innerHTML = '';
            if (noEventsDiv) noEventsDiv.style.display = 'block';
            return;
        }

        if (noEventsDiv) noEventsDiv.style.display = 'none';

        container.innerHTML = events.map(event => this.renderEventCard(event, true)).join('');
    }

    displayAvailableEvents() {
        this.filteredAvailableEvents = [...this.availableEvents];
        this.filterAvailableEvents();
    }

    filterAvailableEvents() {
        let filtered = [...this.availableEvents];

        // Filtre par catégorie
        if (this.filters.category) {
            filtered = filtered.filter(event => event.category === this.filters.category);
        }

        // Filtre par recherche
        if (this.filters.search) {
            filtered = filtered.filter(event => 
                event.title.toLowerCase().includes(this.filters.search) ||
                (event.description && event.description.toLowerCase().includes(this.filters.search)) ||
                (event.location && event.location.toLowerCase().includes(this.filters.search))
            );
        }

        this.filteredAvailableEvents = filtered;
        this.displayEventsList('availableEvents', filtered, 'noAvailableEvents');
    }

    renderEventCard(event, isRegistered = false) {
        const eventDate = new Date(event.start_date);
        const isUpcoming = eventDate >= new Date();
        const formattedDate = eventDate.toLocaleDateString('fr-FR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        const categoryEmojis = {
            general: '📅',
            voyage: '✈️',
            retraite: '🏖️',
            activite: '🎭'
        };

        const statusClass = isRegistered 
            ? (isUpcoming ? 'registered-upcoming' : 'registered-past')
            : 'available';

        const actionButtons = isRegistered && isUpcoming
            ? `<button class="btn btn-warning btn-sm" onclick="window.eventRegistrationManager?.unregisterFromEvent(${event.event_id || event.id})">
                 Se désinscrire
               </button>`
            : !isRegistered && isUpcoming
            ? `<button class="btn btn-success btn-sm" onclick="window.eventRegistrationManager?.registerToEvent(${event.id})">
                 S'inscrire
               </button>`
            : '';

        const participantsInfo = event.max_participants 
            ? `<div class="participants-info">
                 <span class="participants-count">${event.participants_count || 0}/${event.max_participants} places</span>
               </div>`
            : '<div class="participants-info"><span class="unlimited">Places illimitées</span></div>';

        return `
            <div class="event-card ${statusClass}">
                <div class="event-card-header">
                    <div class="event-category">
                        <span class="category-icon">${categoryEmojis[event.category] || '📅'}</span>
                        <span class="category-name">${this.getCategoryName(event.category)}</span>
                    </div>
                    <div class="event-status">
                        ${isRegistered ? (isUpcoming ? '✅ Inscrit' : '📚 Passé') : '🎯 Disponible'}
                    </div>
                </div>

                <div class="event-card-body">
                    <h3 class="event-title">${event.title}</h3>
                    
                    <div class="event-meta">
                        <div class="event-date">
                            <span class="meta-icon">📅</span>
                            <span>${formattedDate}</span>
                        </div>
                        
                        <div class="event-time">
                            <span class="meta-icon">⏰</span>
                            <span>${this.formatTime(event.start_time)} - ${this.formatTime(event.end_time)}</span>
                        </div>
                        
                        ${event.location ? `
                            <div class="event-location">
                                <span class="meta-icon">📍</span>
                                <span>${event.location}</span>
                            </div>
                        ` : ''}
                    </div>

                    ${event.description ? `
                        <div class="event-description">
                            <p>${event.description.substring(0, 150)}${event.description.length > 150 ? '...' : ''}</p>
                        </div>
                    ` : ''}

                    ${participantsInfo}
                </div>

                <div class="event-card-footer">
                    <div class="event-actions">
                        ${actionButtons}
                        <button class="btn btn-outline btn-sm" onclick="this.showEventDetails(${event.event_id || event.id})">
                            Détails
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    showEventDetails(eventId) {
        // Utiliser la modale du calendrier existante
        if (window.eventCalendar) {
            window.eventCalendar.showEventDetails(eventId);
        } else {
            // Fallback vers la page des événements
            window.location.href = `/evenements#event-${eventId}`;
        }
    }

    handleRegistrationChange(detail) {
        // Recharger les données après un changement d'inscription
        this.loadUserRegistrations();
        this.loadAvailableEvents();

        // Afficher une notification
        this.showNotification(
            detail.type === 'register' 
                ? 'Inscription réussie !' 
                : 'Désinscription réussie !',
            'success'
        );
    }

    getCategoryName(category) {
        const categories = {
            general: 'Général',
            voyage: 'Voyage',
            retraite: 'Retraite',
            activite: 'Activité'
        };
        return categories[category] || 'Autre';
    }

    formatTime(time) {
        if (!time) return '';
        return time.substring(0, 5); // HH:MM
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type = 'info') {
        // Créer et afficher une notification
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">&times;</button>
        `;

        // Ajouter au DOM
        document.body.appendChild(notification);

        // Supprimer automatiquement après 5 secondes
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }
}

// Fonction globale pour afficher les détails d'un événement
function showEventDetails(eventId) {
    if (window.myEventsManager) {
        window.myEventsManager.showEventDetails(eventId);
    }
}