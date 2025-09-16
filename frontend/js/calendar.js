// Système de calendrier pour les événements COS
class EventCalendar {
    constructor() {
        this.currentDate = new Date();
        this.events = [];
        this.selectedDate = null;
        this.viewMode = 'month'; // month, week, day
        this.init();
    }

    init() {
        this.createCalendarInterface();
        this.bindEvents();
        this.loadEvents();
        this.render();
    }

    createCalendarInterface() {
        const calendarContainer = document.createElement('div');
        calendarContainer.className = 'event-calendar';
        calendarContainer.innerHTML = `
            <div class="calendar-header">
                <div class="calendar-controls">
                    <button class="btn-nav" id="prevMonth">‹</button>
                    <div class="calendar-title">
                        <h2 id="calendarTitle">${this.formatMonthYear(this.currentDate)}</h2>
                    </div>
                    <button class="btn-nav" id="nextMonth">›</button>
                </div>
                
                <div class="view-controls">
                    <button class="btn-view ${this.viewMode === 'month' ? 'active' : ''}" data-view="month">Mois</button>
                    <button class="btn-view ${this.viewMode === 'week' ? 'active' : ''}" data-view="week">Semaine</button>
                    <button class="btn-view ${this.viewMode === 'day' ? 'active' : ''}" data-view="day">Jour</button>
                </div>
                
                <div class="calendar-actions">
                    <button class="btn-today" id="todayBtn">Aujourd'hui</button>
                    <button class="btn-add-event" id="addEventBtn">+ Événement</button>
                </div>
            </div>
            
            <div class="calendar-body">
                <div class="calendar-grid" id="calendarGrid">
                    <!-- Le calendrier sera généré ici -->
                </div>
            </div>
            
            <div class="calendar-sidebar">
                <div class="upcoming-events">
                    <h3>Événements à venir</h3>
                    <div class="upcoming-list" id="upcomingEvents">
                        <!-- Liste des événements à venir -->
                    </div>
                </div>
                
                <div class="calendar-legend">
                    <h4>Légende</h4>
                    <div class="legend-item">
                        <span class="legend-color event-general"></span>
                        <span>Général</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-color event-voyage"></span>
                        <span>Voyage</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-color event-retraite"></span>
                        <span>Retraite</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-color event-activite"></span>
                        <span>Activité</span>
                    </div>
                </div>
            </div>
        `;

        // Insérer le calendrier dans la page
        const targetContainer = document.querySelector('.calendar-container, .events-container, main');
        if (targetContainer) {
            targetContainer.appendChild(calendarContainer);
        }

        this.calendarGrid = document.getElementById('calendarGrid');
        this.calendarTitle = document.getElementById('calendarTitle');
    }

    bindEvents() {
        // Navigation mois précédent/suivant
        document.getElementById('prevMonth').addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
            this.render();
        });

        document.getElementById('nextMonth').addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
            this.render();
        });

        // Bouton aujourd'hui
        document.getElementById('todayBtn').addEventListener('click', () => {
            this.currentDate = new Date();
            this.render();
        });

        // Changement de vue
        document.querySelectorAll('.btn-view').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.viewMode = e.target.dataset.view;
                document.querySelectorAll('.btn-view').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.render();
            });
        });

        // Bouton ajouter événement
        document.getElementById('addEventBtn').addEventListener('click', () => {
            this.showEventModal();
        });
    }

    async loadEvents() {
        try {
            const response = await fetch('/api/events');
            if (response.ok) {
                const data = await response.json();
                this.events = Array.isArray(data) ? data : (data.events || []);
            } else {
                console.warn('Pas d\'événements trouvés');
                this.events = [];
            }
        } catch (error) {
            console.error('Erreur lors du chargement des événements:', error);
            this.events = [];
        }
    }

    render() {
        this.calendarTitle.textContent = this.formatMonthYear(this.currentDate);
        
        switch (this.viewMode) {
            case 'month':
                this.renderMonthView();
                break;
            case 'week':
                this.renderWeekView();
                break;
            case 'day':
                this.renderDayView();
                break;
        }
        
        this.renderUpcomingEvents();
    }

    renderMonthView() {
        const firstDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
        const lastDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());

        let html = '<div class="calendar-month">';
        
        // En-têtes des jours de la semaine
        html += '<div class="calendar-weekdays">';
        const weekdays = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
        weekdays.forEach(day => {
            html += `<div class="weekday">${day}</div>`;
        });
        html += '</div>';

        // Grille du calendrier
        html += '<div class="calendar-days">';
        const currentDate = new Date(startDate);
        
        for (let week = 0; week < 6; week++) {
            for (let day = 0; day < 7; day++) {
                const isCurrentMonth = currentDate.getMonth() === this.currentDate.getMonth();
                const isToday = this.isToday(currentDate);
                const dayEvents = this.getEventsForDate(currentDate);
                
                html += `
                    <div class="calendar-day ${isCurrentMonth ? 'current-month' : 'other-month'} ${isToday ? 'today' : ''}" 
                         data-date="${currentDate.toISOString().split('T')[0]}">
                        <div class="day-number">${currentDate.getDate()}</div>
                        <div class="day-events">
                            ${dayEvents.map(event => `
                                <div class="event-item event-${event.category || 'general'}" 
                                     onclick="eventCalendar.showEventDetails(${event.id})">
                                    <span class="event-time">${this.formatTime(event.start_time)}</span>
                                    <span class="event-title">${event.title}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
                
                currentDate.setDate(currentDate.getDate() + 1);
            }
            
            // Arrêter si on a dépassé le mois suivant
            if (currentDate.getMonth() !== this.currentDate.getMonth() && currentDate.getMonth() !== (this.currentDate.getMonth() + 1) % 12) {
                break;
            }
        }
        
        html += '</div></div>';
        this.calendarGrid.innerHTML = html;

        // Ajouter les événements de clic sur les jours
        document.querySelectorAll('.calendar-day').forEach(dayEl => {
            dayEl.addEventListener('click', (e) => {
                if (e.target.classList.contains('calendar-day')) {
                    this.selectDate(dayEl.dataset.date);
                }
            });
        });
    }

    renderWeekView() {
        const startOfWeek = this.getStartOfWeek(this.currentDate);
        const dates = [];
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(startOfWeek);
            date.setDate(date.getDate() + i);
            dates.push(date);
        }

        let html = '<div class="calendar-week">';
        
        // En-tête avec les dates
        html += '<div class="week-header">';
        html += '<div class="time-column"></div>';
        dates.forEach(date => {
            const isToday = this.isToday(date);
            html += `
                <div class="week-day ${isToday ? 'today' : ''}">
                    <div class="day-name">${this.getDayName(date)}</div>
                    <div class="day-date">${date.getDate()}</div>
                </div>
            `;
        });
        html += '</div>';

        // Grille horaire
        html += '<div class="week-grid">';
        for (let hour = 0; hour < 24; hour++) {
            html += `
                <div class="hour-row">
                    <div class="time-label">${hour.toString().padStart(2, '0')}:00</div>
                    ${dates.map(date => {
                        const hourEvents = this.getEventsForDateHour(date, hour);
                        return `
                            <div class="hour-cell" data-date="${date.toISOString().split('T')[0]}" data-hour="${hour}">
                                ${hourEvents.map(event => `
                                    <div class="event-block event-${event.category || 'general'}" 
                                         onclick="eventCalendar.showEventDetails(${event.id})">
                                        ${event.title}
                                    </div>
                                `).join('')}
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }
        html += '</div></div>';
        
        this.calendarGrid.innerHTML = html;
    }

    renderDayView() {
        let html = '<div class="calendar-day-view">';
        
        html += `
            <div class="day-header">
                <h3>${this.formatFullDate(this.currentDate)}</h3>
            </div>
        `;

        const dayEvents = this.getEventsForDate(this.currentDate);
        
        if (dayEvents.length === 0) {
            html += '<div class="no-events">Aucun événement prévu pour cette journée</div>';
        } else {
            html += '<div class="day-events-list">';
            dayEvents.forEach(event => {
                html += `
                    <div class="event-card event-${event.category || 'general'}" 
                         onclick="eventCalendar.showEventDetails(${event.id})">
                        <div class="event-time">
                            ${this.formatTime(event.start_time)} - ${this.formatTime(event.end_time)}
                        </div>
                        <div class="event-info">
                            <h4>${event.title}</h4>
                            <p>${event.description || ''}</p>
                            <div class="event-meta">
                                <span class="event-location">${event.location || ''}</span>
                                <span class="event-participants">${event.max_participants ? `${event.participants_count || 0}/${event.max_participants}` : ''}</span>
                            </div>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
        }
        
        html += '</div>';
        this.calendarGrid.innerHTML = html;
    }

    renderUpcomingEvents() {
        const upcoming = this.getUpcomingEvents(5);
        const upcomingContainer = document.getElementById('upcomingEvents');
        
        if (upcoming.length === 0) {
            upcomingContainer.innerHTML = '<p class="no-upcoming">Aucun événement à venir</p>';
            return;
        }

        upcomingContainer.innerHTML = upcoming.map(event => `
            <div class="upcoming-item" onclick="eventCalendar.showEventDetails(${event.id})">
                <div class="upcoming-date">${this.formatShortDate(new Date(event.start_date))}</div>
                <div class="upcoming-info">
                    <div class="upcoming-title">${event.title}</div>
                    <div class="upcoming-time">${this.formatTime(event.start_time)}</div>
                </div>
                <div class="upcoming-category event-${event.category || 'general'}"></div>
            </div>
        `).join('');
    }

    getEventsForDate(date) {
        const dateStr = date.toISOString().split('T')[0];
        return this.events.filter(event => {
            const eventDate = new Date(event.start_date).toISOString().split('T')[0];
            return eventDate === dateStr;
        });
    }

    getEventsForDateHour(date, hour) {
        const events = this.getEventsForDate(date);
        return events.filter(event => {
            const startHour = parseInt(event.start_time.split(':')[0]);
            return startHour === hour;
        });
    }

    getUpcomingEvents(limit = 5) {
        const now = new Date();
        return this.events
            .filter(event => new Date(event.start_date) >= now)
            .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
            .slice(0, limit);
    }

    selectDate(dateStr) {
        this.selectedDate = new Date(dateStr);
        // Mettre en surbrillance la date sélectionnée
        document.querySelectorAll('.calendar-day').forEach(day => day.classList.remove('selected'));
        document.querySelector(`[data-date="${dateStr}"]`).classList.add('selected');
    }

    showEventDetails(eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (!event) return;

        // Créer une modale pour afficher les détails de l'événement
        this.showEventModal(event);
    }

    showEventModal(event = null) {
        const isEdit = !!event;
        const modalHTML = `
            <div class="modal-overlay" id="eventModal">
                <div class="modal-content event-modal">
                    <div class="modal-header">
                        <h3>${isEdit ? 'Détails de l\'événement' : 'Nouvel événement'}</h3>
                        <button class="modal-close" onclick="eventCalendar.closeModal()">&times;</button>
                    </div>
                    
                    <div class="modal-body">
                        ${isEdit ? this.renderEventDetails(event) : this.renderEventForm()}
                    </div>
                    
                    <div class="modal-footer">
                        ${isEdit ? 
                            `<button class="btn-secondary" onclick="eventCalendar.editEvent(${event.id})">Modifier</button>
                             <button class="btn-danger" onclick="eventCalendar.deleteEvent(${event.id})">Supprimer</button>` :
                            `<button class="btn-primary" onclick="eventCalendar.saveEvent()">Créer</button>`
                        }
                        <button class="btn-secondary" onclick="eventCalendar.closeModal()">Fermer</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    renderEventDetails(event) {
        // Déterminer si l'utilisateur est connecté et peut s'inscrire
        const userToken = localStorage.getItem('authToken');
        const canRegister = userToken && !event.is_user_registered;
        const canUnregister = userToken && event.is_user_registered;
        const isEventFull = event.max_participants && event.participants_count >= event.max_participants;
        
        return `
            <div class="event-details">
                <div class="detail-item">
                    <strong>Titre:</strong> ${event.title}
                </div>
                <div class="detail-item">
                    <strong>Date:</strong> ${this.formatFullDate(new Date(event.start_date))}
                </div>
                <div class="detail-item">
                    <strong>Heure:</strong> ${this.formatTime(event.start_time)} - ${this.formatTime(event.end_time)}
                </div>
                <div class="detail-item">
                    <strong>Lieu:</strong> ${event.location || 'Non spécifié'}
                </div>
                <div class="detail-item">
                    <strong>Description:</strong> 
                    <div class="description-content">${event.description || 'Aucune description'}</div>
                </div>
                <div class="detail-item">
                    <strong>Catégorie:</strong> ${this.getCategoryName(event.category)}
                </div>
                <div class="detail-item">
                    <strong>Places:</strong> 
                    ${event.max_participants ? 
                        `<span class="${isEventFull ? 'text-warning' : ''}">${event.participants_count || 0} / ${event.max_participants} participants</span>` : 
                        'Illimité'
                    }
                </div>
                
                <!-- Section d'inscription -->
                <div class="event-registration">
                    ${!userToken ? `
                        <div class="registration-notice">
                            <p>🔒 Vous devez être connecté pour vous inscrire à cet événement</p>
                            <div class="auth-actions">
                                <a href="/login" class="btn btn-primary">Se connecter</a>
                                <a href="/register" class="btn btn-outline">S'inscrire</a>
                            </div>
                        </div>
                    ` : event.is_member_only ? `
                        <div class="registration-actions">
                            ${canRegister && !isEventFull ? `
                                <button class="btn btn-success" onclick="window.eventRegistrationManager?.registerToEvent(${event.id})">
                                    ✓ S'inscrire à l'événement
                                </button>
                            ` : ''}
                            ${canUnregister ? `
                                <button class="btn btn-warning" onclick="window.eventRegistrationManager?.unregisterFromEvent(${event.id})">
                                    ✗ Se désinscrire
                                </button>
                            ` : ''}
                            ${isEventFull && !canUnregister ? `
                                <div class="registration-full">
                                    <span class="text-warning">⚠️ Événement complet</span>
                                </div>
                            ` : ''}
                            ${event.is_user_registered ? `
                                <div class="registration-status">
                                    <span class="text-success">✓ Vous êtes inscrit</span>
                                </div>
                            ` : ''}
                        </div>
                    ` : `
                        <div class="registration-notice">
                            <p>ℹ️ Événement ouvert à tous - aucune inscription requise</p>
                        </div>
                    `}
                </div>
            </div>
        `;
    }

    renderEventForm() {
        return `
            <form class="event-form" id="eventForm">
                <div class="form-group">
                    <label>Titre de l'événement *</label>
                    <input type="text" name="title" required>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Date *</label>
                        <input type="date" name="start_date" required>
                    </div>
                    <div class="form-group">
                        <label>Heure début *</label>
                        <input type="time" name="start_time" required>
                    </div>
                    <div class="form-group">
                        <label>Heure fin</label>
                        <input type="time" name="end_time">
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Lieu</label>
                    <input type="text" name="location">
                </div>
                
                <div class="form-group">
                    <label>Description</label>
                    <textarea name="description" rows="4"></textarea>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Catégorie</label>
                        <select name="category">
                            <option value="general">Général</option>
                            <option value="voyage">Voyage</option>
                            <option value="retraite">Retraite</option>
                            <option value="activite">Activité</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Nombre max de participants</label>
                        <input type="number" name="max_participants" min="1">
                    </div>
                </div>
            </form>
        `;
    }

    closeModal() {
        const modal = document.getElementById('eventModal');
        if (modal) {
            modal.remove();
        }
    }

    // Méthode pour recharger un événement après inscription/désinscription
    async refreshEvent(eventId) {
        try {
            const response = await fetch(`/api/events/${eventId}`);
            const data = await response.json();
            
            if (data.success) {
                // Mettre à jour l'événement dans la liste locale
                const eventIndex = this.events.findIndex(e => e.id === eventId);
                if (eventIndex !== -1) {
                    this.events[eventIndex] = data.event;
                }
                
                // Rerendre le calendrier
                this.render();
                
                // Si la modale est ouverte, la mettre à jour
                const modal = document.getElementById('eventModal');
                if (modal) {
                    this.closeModal();
                    this.showEventDetails(eventId);
                }
            }
        } catch (error) {
            console.error('Erreur lors du rafraîchissement de l\'événement:', error);
        }
    }

    // Fonctions utilitaires pour les dates
    formatMonthYear(date) {
        return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    }

    formatFullDate(date) {
        return date.toLocaleDateString('fr-FR', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }

    formatShortDate(date) {
        return date.toLocaleDateString('fr-FR', { 
            month: 'short', 
            day: 'numeric' 
        });
    }

    formatTime(timeStr) {
        if (!timeStr) return '';
        return timeStr.substring(0, 5); // HH:MM
    }

    isToday(date) {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    }

    getStartOfWeek(date) {
        const startOfWeek = new Date(date);
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day;
        startOfWeek.setDate(diff);
        return startOfWeek;
    }

    getDayName(date) {
        return date.toLocaleDateString('fr-FR', { weekday: 'short' });
    }

    getCategoryName(category) {
        const categories = {
            'general': 'Général',
            'voyage': 'Voyage',
            'retraite': 'Retraite',
            'activite': 'Activité'
        };
        return categories[category] || category;
    }
}

// Initialisation automatique
document.addEventListener('DOMContentLoaded', () => {
    // Vérifier si on est sur une page qui a besoin du calendrier
    const needsCalendar = document.querySelector('.calendar-container, .events-container') || 
                         document.body.classList.contains('events-page') ||
                         window.location.pathname.includes('evenements');
    
    if (needsCalendar) {
        window.eventCalendar = new EventCalendar();
    }
});