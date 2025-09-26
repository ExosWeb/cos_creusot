/**
 * Système de Calendrier des Événements - COS Creusot
 * Gestion des vues mois/semaine/liste avec événements multi-jours
 */

class CalendarManager {
    constructor() {
        this.currentDate = new Date();
        this.currentView = 'month';
        this.events = [];
        this.filteredEvents = [];
        this.currentFilter = '';
        
        // Éléments DOM
        this.currentPeriodEl = document.getElementById('currentPeriod');
        this.calendarBodyEl = document.getElementById('calendarBody');
        this.monthViewEl = document.getElementById('monthView');
        this.weekViewEl = document.getElementById('weekView');
        this.listViewEl = document.getElementById('listView');
        this.loadingEl = document.getElementById('calendarLoading');
        this.noEventsEl = document.getElementById('noEventsMessage');
        this.categoryFilterEl = document.getElementById('categoryFilter');
        
        // Modal
        this.modal = document.getElementById('eventModal');
        this.modalTitle = document.getElementById('eventModalTitle');
        this.modalCategory = document.getElementById('eventModalCategory');
        this.modalDate = document.getElementById('eventModalDate');
        this.modalTime = document.getElementById('eventModalTime');
        this.modalLocation = document.getElementById('eventModalLocation');
        this.modalParticipants = document.getElementById('eventModalParticipants');
        this.modalDescription = document.getElementById('eventModalDescription');
        this.registerBtn = document.getElementById('eventRegisterBtn');
        this.unregisterBtn = document.getElementById('eventUnregisterBtn');
        
        this.init();
    }

    init() {
        dlog('📅 Initializing Calendar Manager');
        this.setupEventListeners();
        this.loadEvents();
        this.updatePeriodDisplay();
        this.renderCurrentView();
    }

    setupEventListeners() {
        // Navigation
        document.getElementById('prevBtn').addEventListener('click', () => this.navigatePrevious());
        document.getElementById('nextBtn').addEventListener('click', () => this.navigateNext());
        document.getElementById('todayBtn').addEventListener('click', () => this.goToToday());
        
        // Vues
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchView(e.target.dataset.view));
        });
        
        // Filtres
        this.categoryFilterEl.addEventListener('change', (e) => this.filterEvents(e.target.value));
        
        // Modal
        document.querySelector('.event-modal-close').addEventListener('click', () => this.closeModal());
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.closeModal();
        });
        
        // Échap pour fermer le modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.classList.contains('show')) {
                this.closeModal();
            }
        });
        
        // Boutons d'inscription
        this.registerBtn.addEventListener('click', () => this.registerToEvent());
        this.unregisterBtn.addEventListener('click', () => this.unregisterFromEvent());
    }

    async loadEvents() {
        try {
            this.showLoading();
            dlog('🔄 Loading events from API');
            
            // Calculer la plage de dates (mois courant + précédent + suivant)
            const startDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() - 1, 1);
            const endDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 2, 0);
            
            const params = new URLSearchParams({
                from_date: startDate.toISOString().split('T')[0],
                to_date: endDate.toISOString().split('T')[0],
                limit: 100
            });
            
            const response = await fetch(`/api/events?${params}`, {
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            this.events = data.events || [];
            this.filteredEvents = [...this.events];
            
            dlog('✅ Events loaded:', this.events.length);
            this.hideLoading();
            this.renderCurrentView();
            
        } catch (error) {
            derror('❌ Failed to load events:', error);
            this.hideLoading();
            this.showNoEvents();
        }
    }

    filterEvents(category) {
        this.currentFilter = category;
        
        if (category) {
            this.filteredEvents = this.events.filter(event => event.category === category);
        } else {
            this.filteredEvents = [...this.events];
        }
        
        dlog('🔍 Filtered events:', this.filteredEvents.length, 'for category:', category || 'all');
        this.renderCurrentView();
    }

    switchView(view) {
        if (view === this.currentView) return;
        
        this.currentView = view;
        
        // Mettre à jour les boutons
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        
        // Mettre à jour les vues
        document.querySelectorAll('.calendar-view').forEach(viewEl => {
            viewEl.classList.remove('active');
        });
        
        document.getElementById(`${view}View`).classList.add('active');
        
        this.updatePeriodDisplay();
        this.renderCurrentView();
        
        dlog('🔄 Switched to view:', view);
    }

    navigatePrevious() {
        switch (this.currentView) {
            case 'month':
                this.currentDate.setMonth(this.currentDate.getMonth() - 1);
                break;
            case 'week':
                this.currentDate.setDate(this.currentDate.getDate() - 7);
                break;
            case 'list':
                this.currentDate.setMonth(this.currentDate.getMonth() - 1);
                break;
        }
        
        this.updatePeriodDisplay();
        this.loadEvents(); // Recharger pour la nouvelle période
    }

    navigateNext() {
        switch (this.currentView) {
            case 'month':
                this.currentDate.setMonth(this.currentDate.getMonth() + 1);
                break;
            case 'week':
                this.currentDate.setDate(this.currentDate.getDate() + 7);
                break;
            case 'list':
                this.currentDate.setMonth(this.currentDate.getMonth() + 1);
                break;
        }
        
        this.updatePeriodDisplay();
        this.loadEvents(); // Recharger pour la nouvelle période
    }

    goToToday() {
        this.currentDate = new Date();
        this.updatePeriodDisplay();
        this.loadEvents();
    }

    updatePeriodDisplay() {
        let periodText = '';
        
        switch (this.currentView) {
            case 'month':
                periodText = this.currentDate.toLocaleDateString('fr-FR', { 
                    month: 'long', 
                    year: 'numeric' 
                });
                break;
            case 'week':
                const startOfWeek = this.getStartOfWeek(this.currentDate);
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(endOfWeek.getDate() + 6);
                
                periodText = `${startOfWeek.getDate()} - ${endOfWeek.getDate()} ${endOfWeek.toLocaleDateString('fr-FR', { 
                    month: 'long', 
                    year: 'numeric' 
                })}`;
                break;
            case 'list':
                periodText = this.currentDate.toLocaleDateString('fr-FR', { 
                    month: 'long', 
                    year: 'numeric' 
                });
                break;
        }
        
        this.currentPeriodEl.textContent = periodText.charAt(0).toUpperCase() + periodText.slice(1);
    }

    renderCurrentView() {
        switch (this.currentView) {
            case 'month':
                this.renderMonthView();
                break;
            case 'week':
                this.renderWeekView();
                break;
            case 'list':
                this.renderListView();
                break;
        }
    }

    renderMonthView() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        // Commencer le lundi de la semaine de la première date
        const startDate = this.getStartOfWeek(firstDay);
        
        // Finir le dimanche de la semaine de la dernière date
        const endDate = new Date(lastDay);
        while (endDate.getDay() !== 0) {
            endDate.setDate(endDate.getDate() + 1);
        }
        
        let html = '';
        const currentDate = new Date(startDate);
        
        while (currentDate <= endDate) {
            const dayEvents = this.getEventsForDate(currentDate);
            const isToday = this.isToday(currentDate);
            const isCurrentMonth = currentDate.getMonth() === month;
            const hasEvents = dayEvents.length > 0;
            
            const dayClass = [
                'calendar-day',
                !isCurrentMonth && 'other-month',
                isToday && 'today',
                hasEvents && 'has-events'
            ].filter(Boolean).join(' ');
            
            html += `
                <div class="${dayClass}" data-date="${currentDate.toISOString().split('T')[0]}">
                    <div class="day-number">${currentDate.getDate()}</div>
                    <div class="day-events">
                        ${this.renderDayEvents(dayEvents, currentDate)}
                    </div>
                </div>
            `;
            
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        this.calendarBodyEl.innerHTML = html;
        
        // Ajouter les event listeners
        this.calendarBodyEl.querySelectorAll('.calendar-event').forEach(eventEl => {
            eventEl.addEventListener('click', (e) => {
                e.stopPropagation();
                const eventId = eventEl.dataset.eventId;
                this.openEventModal(eventId);
            });
        });
    }

    renderDayEvents(events, date) {
        if (events.length === 0) return '';
        
        return events.slice(0, 3).map(event => {
            const startDate = new Date(event.start_date);
            const endDate = new Date(event.end_date);
            const currentDateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            
            // Déterminer la position de l'événement multi-jours
            let eventClass = 'calendar-event ' + (event.category || 'general');
            
            if (startDate.getTime() !== endDate.getTime()) {
                eventClass += ' multi-day';
                
                if (this.isSameDate(startDate, currentDateOnly)) {
                    eventClass += ' event-start';
                } else if (this.isSameDate(endDate, currentDateOnly)) {
                    eventClass += ' event-end';
                } else {
                    eventClass += ' event-middle';
                }
            }
            
            return `
                <div class="${eventClass}" data-event-id="${event.id}" title="${event.title}">
                    ${event.title}
                </div>
            `;
        }).join('') + (events.length > 3 ? `<div class="more-events">+${events.length - 3} autres</div>` : '');
    }

    renderWeekView() {
        const startOfWeek = this.getStartOfWeek(this.currentDate);
        const weekDays = [];
        
        // Générer les 7 jours de la semaine
        for (let i = 0; i < 7; i++) {
            const date = new Date(startOfWeek);
            date.setDate(date.getDate() + i);
            weekDays.push(date);
        }
        
        // Générer les créneaux horaires
        let timeSlotsHtml = '';
        for (let hour = 0; hour < 24; hour++) {
            timeSlotsHtml += `
                <div class="time-slot">
                    ${hour.toString().padStart(2, '0')}:00
                </div>
            `;
        }
        document.getElementById('timeSlots').innerHTML = timeSlotsHtml;
        
        // Générer les jours de la semaine
        let weekDaysHtml = '';
        weekDays.forEach(date => {
            const dayEvents = this.getEventsForDate(date);
            const isToday = this.isToday(date);
            
            weekDaysHtml += `
                <div class="week-day">
                    <div class="week-day-header ${isToday ? 'today' : ''}">
                        <div>${date.toLocaleDateString('fr-FR', { weekday: 'short' })}</div>
                        <div>${date.getDate()}</div>
                    </div>
                    <div class="week-day-content">
                        ${this.renderWeekEvents(dayEvents)}
                    </div>
                </div>
            `;
        });
        
        document.getElementById('weekDays').innerHTML = weekDaysHtml;
        
        // Ajouter les event listeners
        document.querySelectorAll('.week-event').forEach(eventEl => {
            eventEl.addEventListener('click', () => {
                const eventId = eventEl.dataset.eventId;
                this.openEventModal(eventId);
            });
        });
    }

    renderWeekEvents(events) {
        return events.map(event => {
            const startTime = event.start_time || '00:00';
            const endTime = event.end_time || '23:59';
            
            const [startHour, startMinute] = startTime.split(':').map(Number);
            const [endHour, endMinute] = endTime.split(':').map(Number);
            
            const startPosition = (startHour * 60 + startMinute);
            const duration = (endHour * 60 + endMinute) - startPosition;
            const height = Math.max(30, duration); // Minimum 30px
            
            return `
                <div class="week-event ${event.category || 'general'}" 
                     data-event-id="${event.id}"
                     style="top: ${startPosition}px; height: ${height}px;"
                     title="${event.title}">
                    <strong>${event.title}</strong><br>
                    <small>${startTime} - ${endTime}</small>
                </div>
            `;
        }).join('');
    }

    renderListView() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        // Événements du mois courant
        const monthEvents = this.filteredEvents.filter(event => {
            const eventDate = new Date(event.start_date);
            return eventDate.getFullYear() === year && eventDate.getMonth() === month;
        });
        
        // Trier par date
        monthEvents.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
        
        if (monthEvents.length === 0) {
            this.showNoEvents();
            return;
        }
        
        const listHtml = monthEvents.map(event => {
            const startDate = new Date(event.start_date);
            const endDate = new Date(event.end_date);
            const isMultiDay = !this.isSameDate(startDate, endDate);
            
            return `
                <div class="event-list-item" data-event-id="${event.id}">
                    <div class="event-date-column">
                        <div class="event-date-day">${startDate.getDate()}</div>
                        <div class="event-date-month">${startDate.toLocaleDateString('fr-FR', { month: 'short' })}</div>
                    </div>
                    <div class="event-content-column">
                        <h3 class="event-list-title">${event.title}</h3>
                        <div class="event-list-meta">
                            <span class="event-list-time">
                                <i class="fas fa-clock"></i>
                                ${isMultiDay 
                                    ? `Du ${startDate.toLocaleDateString('fr-FR')} au ${endDate.toLocaleDateString('fr-FR')}`
                                    : `${event.start_time || '00:00'} - ${event.end_time || '23:59'}`
                                }
                            </span>
                            ${event.location ? `
                                <span class="event-list-location">
                                    <i class="fas fa-map-marker-alt"></i>
                                    ${event.location}
                                </span>
                            ` : ''}
                            <span class="event-category ${event.category || 'general'}">
                                ${this.getCategoryDisplayName(event.category)}
                            </span>
                        </div>
                        ${event.description ? `
                            <p class="event-list-description">
                                ${event.description.length > 150 
                                    ? event.description.substring(0, 150) + '...'
                                    : event.description
                                }
                            </p>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
        document.getElementById('eventsList').innerHTML = listHtml;
        
        // Ajouter les event listeners
        document.querySelectorAll('.event-list-item').forEach(item => {
            item.addEventListener('click', () => {
                const eventId = item.dataset.eventId;
                this.openEventModal(eventId);
            });
        });
        
        this.hideLoading();
        this.hideNoEvents();
    }

    getEventsForDate(date) {
        const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        
        return this.filteredEvents.filter(event => {
            const startDate = new Date(event.start_date);
            const endDate = new Date(event.end_date);
            
            const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
            const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
            
            return dateOnly >= startDateOnly && dateOnly <= endDateOnly;
        });
    }

    openEventModal(eventId) {
        const event = this.events.find(e => e.id === parseInt(eventId));
        if (!event) return;
        
        dlog('📖 Opening event modal:', event.title);
        
        // Remplir le modal
        this.modalTitle.textContent = event.title;
        this.modalCategory.textContent = this.getCategoryDisplayName(event.category);
        this.modalCategory.className = `event-category ${event.category || 'general'}`;
        
        // Date
        const startDate = new Date(event.start_date);
        const endDate = new Date(event.end_date);
        const isMultiDay = !this.isSameDate(startDate, endDate);
        
        if (isMultiDay) {
            this.modalDate.textContent = `Du ${startDate.toLocaleDateString('fr-FR')} au ${endDate.toLocaleDateString('fr-FR')}`;
        } else {
            this.modalDate.textContent = startDate.toLocaleDateString('fr-FR');
        }
        
        // Heure
        if (event.start_time && event.end_time) {
            this.modalTime.textContent = `${event.start_time} - ${event.end_time}`;
        } else {
            this.modalTime.textContent = 'Toute la journée';
        }
        
        // Lieu
        this.modalLocation.textContent = event.location || 'Non spécifié';
        
        // Participants
        const participantsText = event.max_participants 
            ? `${event.participants_count || 0} / ${event.max_participants}`
            : `${event.participants_count || 0} inscrits`;
        this.modalParticipants.textContent = participantsText;
        
        // Description
        this.modalDescription.textContent = event.description || 'Aucune description disponible.';
        
        // Boutons d'inscription (TODO: implémenter la logique d'inscription)
        this.registerBtn.style.display = 'inline-flex';
        this.unregisterBtn.style.display = 'none';
        
        // Afficher le modal
        this.modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    closeModal() {
        this.modal.classList.remove('show');
        document.body.style.overflow = '';
    }

    async registerToEvent() {
        // TODO: Implémenter l'inscription à un événement
        dlog('📝 Register to event (TODO)');
    }

    async unregisterFromEvent() {
        // TODO: Implémenter la désinscription d'un événement
        dlog('❌ Unregister from event (TODO)');
    }

    // Utilitaires
    getStartOfWeek(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Lundi = début de semaine
        return new Date(d.setDate(diff));
    }

    isToday(date) {
        const today = new Date();
        return this.isSameDate(date, today);
    }

    isSameDate(date1, date2) {
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
    }

    getCategoryDisplayName(category) {
        const names = {
            voyages: 'Voyages',
            retraites: 'Retraités',
            evenements: 'Événements',
            general: 'Général'
        };
        return names[category] || 'Autre';
    }

    showLoading() {
        this.loadingEl.style.display = 'block';
        this.hideNoEvents();
    }

    hideLoading() {
        this.loadingEl.style.display = 'none';
    }

    showNoEvents() {
        this.noEventsEl.style.display = 'block';
        this.hideLoading();
    }

    hideNoEvents() {
        this.noEventsEl.style.display = 'none';
    }
}

// Initialiser le calendrier au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    dlog('🚀 Initializing Calendar System');
    new CalendarManager();
});
