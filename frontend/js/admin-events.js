// Gestion administrative des événements
class AdminEventsManager {
    constructor() {
        this.events = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.filters = {
            status: '',
            category: '',
            search: ''
        };
        this.currentEventId = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadEvents();
        this.loadStats();
    }

    bindEvents() {
        // Bouton pour ajouter un événement
        document.getElementById('addEventBtn')?.addEventListener('click', () => {
            this.showEventModal();
        });

        // Filtres
        document.getElementById('eventsStatusFilter')?.addEventListener('change', (e) => {
            this.filters.status = e.target.value;
            this.applyFilters();
        });

        document.getElementById('eventsCategoryFilter')?.addEventListener('change', (e) => {
            this.filters.category = e.target.value;
            this.applyFilters();
        });

        document.getElementById('eventsSearchFilter')?.addEventListener('input', (e) => {
            this.filters.search = e.target.value;
            this.applyFilters();
        });

        // Actualiser
        document.getElementById('refreshEventsBtn')?.addEventListener('click', () => {
            this.loadEvents();
            this.loadStats();
        });

        // Modales
        document.getElementById('closeEventModal')?.addEventListener('click', () => {
            this.hideEventModal();
        });

        document.getElementById('cancelEventBtn')?.addEventListener('click', () => {
            this.hideEventModal();
        });

        document.getElementById('closeRegistrationsModal')?.addEventListener('click', () => {
            this.hideRegistrationsModal();
        });

        document.getElementById('closeRegistrationsBtn')?.addEventListener('click', () => {
            this.hideRegistrationsModal();
        });

        // Formulaire d'événement
        document.getElementById('eventForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveEvent();
        });

        document.getElementById('saveEventBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.saveEvent();
        });

        // Export des inscriptions
        document.getElementById('exportRegistrationsBtn')?.addEventListener('click', () => {
            this.exportRegistrations();
        });
    }

    async loadEvents() {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/events?limit=100', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();
            if (data.success) {
                this.events = data.events;
                this.displayEvents();
            }
        } catch (error) {
            console.error('Erreur lors du chargement des événements:', error);
            this.showError('Erreur lors du chargement des événements');
        }
    }

    async loadStats() {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/admin/stats/events', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();
            if (data.success) {
                this.updateStats(data.stats);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des statistiques:', error);
        }
    }

    updateStats(stats) {
        document.getElementById('totalEvents').textContent = stats.total || 0;
        document.getElementById('upcomingEvents').textContent = stats.upcoming || 0;
        document.getElementById('totalRegistrations').textContent = stats.total_registrations || 0;
        document.getElementById('avgParticipants').textContent = stats.avg_participants || 0;
    }

    applyFilters() {
        this.currentPage = 1;
        this.displayEvents();
    }

    displayEvents() {
        let filteredEvents = [...this.events];

        // Appliquer les filtres
        if (this.filters.status) {
            filteredEvents = filteredEvents.filter(event => event.status === this.filters.status);
        }

        if (this.filters.category) {
            filteredEvents = filteredEvents.filter(event => event.category === this.filters.category);
        }

        if (this.filters.search) {
            const searchTerm = this.filters.search.toLowerCase();
            filteredEvents = filteredEvents.filter(event => 
                event.title.toLowerCase().includes(searchTerm) ||
                (event.description && event.description.toLowerCase().includes(searchTerm)) ||
                (event.location && event.location.toLowerCase().includes(searchTerm))
            );
        }

        // Pagination
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const paginatedEvents = filteredEvents.slice(startIndex, endIndex);

        this.renderEventsTable(paginatedEvents);
        this.renderPagination(filteredEvents.length);
    }

    renderEventsTable(events) {
        const tbody = document.getElementById('eventsTableBody');
        if (!tbody) return;

        if (events.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">Aucun événement trouvé</td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = events.map(event => `
            <tr>
                <td>
                    <div class="event-title-cell">
                        <strong>${event.title}</strong>
                        ${event.is_member_only ? '<span class="badge badge-member">👤 Membres</span>' : ''}
                    </div>
                </td>
                <td>
                    <div class="event-date-cell">
                        ${this.formatDate(event.start_date)}
                        <small>${this.formatTime(event.start_time)} - ${this.formatTime(event.end_time)}</small>
                    </div>
                </td>
                <td>
                    <span class="badge badge-category badge-${event.category}">
                        ${this.getCategoryName(event.category)}
                    </span>
                </td>
                <td>
                    <div class="registrations-cell">
                        <strong>${event.participants_count || 0}</strong>
                        ${event.max_participants ? `/ ${event.max_participants}` : ''}
                        <button class="btn-link btn-sm" onclick="adminEventsManager.viewRegistrations(${event.id})" title="Voir les inscriptions">
                            👥
                        </button>
                    </div>
                </td>
                <td>
                    <span class="badge badge-status badge-${event.status}">
                        ${this.getStatusName(event.status)}
                    </span>
                </td>
                <td>
                    <div class="actions-cell">
                        <button class="btn-sm btn-outline" onclick="adminEventsManager.editEvent(${event.id})" title="Modifier">
                            ✏️
                        </button>
                        <button class="btn-sm btn-outline" onclick="adminEventsManager.viewRegistrations(${event.id})" title="Inscriptions">
                            👥
                        </button>
                        <button class="btn-sm btn-danger" onclick="adminEventsManager.deleteEvent(${event.id})" title="Supprimer">
                            🗑️
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    renderPagination(totalItems) {
        const totalPages = Math.ceil(totalItems / this.itemsPerPage);
        const pagination = document.getElementById('eventsPagination');
        
        if (!pagination || totalPages <= 1) {
            if (pagination) pagination.innerHTML = '';
            return;
        }

        let paginationHTML = '';
        
        if (this.currentPage > 1) {
            paginationHTML += `<button onclick="adminEventsManager.goToPage(${this.currentPage - 1})">« Précédent</button>`;
        }

        for (let i = Math.max(1, this.currentPage - 2); i <= Math.min(totalPages, this.currentPage + 2); i++) {
            paginationHTML += `
                <button class="${i === this.currentPage ? 'active' : ''}" 
                        onclick="adminEventsManager.goToPage(${i})">${i}</button>
            `;
        }

        if (this.currentPage < totalPages) {
            paginationHTML += `<button onclick="adminEventsManager.goToPage(${this.currentPage + 1})">Suivant »</button>`;
        }

        pagination.innerHTML = paginationHTML;
    }

    goToPage(page) {
        this.currentPage = page;
        this.displayEvents();
    }

    showEventModal(event = null) {
        const modal = document.getElementById('eventModal');
        const title = document.getElementById('eventModalTitle');
        const form = document.getElementById('eventForm');

        if (event) {
            title.textContent = 'Modifier l\'événement';
            this.fillEventForm(event);
            this.currentEventId = event.id;
        } else {
            title.textContent = 'Nouvel événement';
            form.reset();
            this.currentEventId = null;
        }

        modal.style.display = 'flex';
    }

    hideEventModal() {
        document.getElementById('eventModal').style.display = 'none';
        document.getElementById('eventForm').reset();
        this.currentEventId = null;
    }

    fillEventForm(event) {
        document.getElementById('eventTitle').value = event.title || '';
        document.getElementById('eventDescription').value = event.description || '';
        document.getElementById('eventStartDate').value = event.start_date || '';
        document.getElementById('eventEndDate').value = event.end_date || '';
        document.getElementById('eventStartTime').value = event.start_time || '';
        document.getElementById('eventEndTime').value = event.end_time || '';
        document.getElementById('eventLocation').value = event.location || '';
        document.getElementById('eventCategory').value = event.category || 'general';
        document.getElementById('eventMaxParticipants').value = event.max_participants || '';
        document.getElementById('eventMemberOnly').checked = event.is_member_only || false;
        document.getElementById('eventStatus').value = event.status || 'draft';
    }

    async saveEvent() {
        const form = document.getElementById('eventForm');
        const formData = new FormData(form);
        
        const eventData = {
            title: formData.get('title'),
            description: formData.get('description'),
            start_date: formData.get('start_date'),
            end_date: formData.get('end_date'),
            start_time: formData.get('start_time'),
            end_time: formData.get('end_time'),
            location: formData.get('location'),
            category: formData.get('category'),
            max_participants: formData.get('max_participants') ? parseInt(formData.get('max_participants')) : null,
            is_member_only: formData.get('is_member_only') === 'on',
            status: formData.get('status')
        };

        try {
            const token = localStorage.getItem('authToken');
            const url = this.currentEventId ? `/api/events/${this.currentEventId}` : '/api/events';
            const method = this.currentEventId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(eventData)
            });

            const data = await response.json();

            if (data.success) {
                this.showSuccess(this.currentEventId ? 'Événement modifié avec succès' : 'Événement créé avec succès');
                this.hideEventModal();
                this.loadEvents();
                this.loadStats();
            } else {
                this.showError(data.message || 'Erreur lors de l\'enregistrement');
            }

        } catch (error) {
            console.error('Erreur:', error);
            this.showError('Erreur de connexion');
        }
    }

    async editEvent(eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (event) {
            this.showEventModal(event);
        }
    }

    async deleteEvent(eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (!event) return;

        if (!confirm(`Êtes-vous sûr de vouloir supprimer l'événement "${event.title}" ?\n\nCette action est irréversible.`)) {
            return;
        }

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`/api/events/${eventId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (data.success) {
                this.showSuccess('Événement supprimé avec succès');
                this.loadEvents();
                this.loadStats();
            } else {
                this.showError(data.message || 'Erreur lors de la suppression');
            }

        } catch (error) {
            console.error('Erreur:', error);
            this.showError('Erreur de connexion');
        }
    }

    async viewRegistrations(eventId) {
        this.currentEventId = eventId;
        const event = this.events.find(e => e.id === eventId);
        
        if (!event) return;

        document.getElementById('registrationsModalTitle').textContent = `Inscriptions - ${event.title}`;
        document.getElementById('registrationsModal').style.display = 'flex';

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`/api/events/${eventId}/registrations`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (data.success) {
                this.displayRegistrations(data.registrations);
            } else {
                this.showError('Erreur lors du chargement des inscriptions');
            }

        } catch (error) {
            console.error('Erreur:', error);
            this.showError('Erreur de connexion');
        }
    }

    displayRegistrations(registrations) {
        const tbody = document.getElementById('registrationsTableBody');
        const countSpan = document.getElementById('registrationsCount');

        countSpan.textContent = `${registrations.length} inscription(s)`;

        if (registrations.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center">Aucune inscription</td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = registrations.map(reg => `
            <tr>
                <td>${reg.firstname} ${reg.lastname}</td>
                <td>${reg.email}</td>
                <td>${reg.phone || 'Non renseigné'}</td>
                <td>${this.formatDateTime(reg.registration_date)}</td>
                <td>
                    <span class="badge badge-status badge-${reg.status}">
                        ${this.getStatusName(reg.status)}
                    </span>
                </td>
            </tr>
        `).join('');
    }

    hideRegistrationsModal() {
        document.getElementById('registrationsModal').style.display = 'none';
    }

    async exportRegistrations() {
        if (!this.currentEventId) return;

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`/api/events/${this.currentEventId}/export`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `inscriptions_evenement_${this.currentEventId}.csv`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                this.showSuccess('Export téléchargé avec succès');
            } else {
                this.showError('Erreur lors de l\'export');
            }

        } catch (error) {
            console.error('Erreur:', error);
            this.showError('Erreur de connexion');
        }
    }

    // Méthodes utilitaires
    formatDate(dateString) {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('fr-FR', {
            weekday: 'short',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    formatTime(timeString) {
        if (!timeString) return '';
        return timeString.substring(0, 5);
    }

    formatDateTime(dateTimeString) {
        if (!dateTimeString) return '';
        return new Date(dateTimeString).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    getCategoryName(category) {
        const categories = {
            general: 'Général',
            voyage: 'Voyage',
            retraite: 'Retraite',
            activite: 'Activité'
        };
        return categories[category] || category;
    }

    getStatusName(status) {
        const statuses = {
            draft: 'Brouillon',
            published: 'Publié',
            cancelled: 'Annulé',
            registered: 'Inscrit'
        };
        return statuses[status] || status;
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type = 'info') {
        // Réutiliser le système de notifications existant
        const notification = document.createElement('div');
        notification.className = `admin-notification ${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">&times;</button>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }
}