/**
 * Gestion de la galerie photos
 * Fonctionnalités : affichage des albums, navigation, lightbox, filtres
 */

class GalleryManager {
    constructor() {
        this.albums = [];
        this.currentAlbum = null;
        this.currentPhotoIndex = 0;
        this.searchTimeout = null;
        this.currentFilters = {
            search: '',
            tag: ''
        };

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadTags();
        this.loadAlbums();
    }

    setupEventListeners() {
        // Recherche
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                clearTimeout(this.searchTimeout);
                this.searchTimeout = setTimeout(() => {
                    this.currentFilters.search = e.target.value;
                    this.filterAlbums();
                }, 300);
            });
        }

        // Filtre par tag
        const tagFilter = document.getElementById('tagFilter');
        if (tagFilter) {
            tagFilter.addEventListener('change', (e) => {
                this.currentFilters.tag = e.target.value;
                this.filterAlbums();
            });
        }

        // Boutons de vue
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelector('.view-btn.active').classList.remove('active');
                e.target.classList.add('active');
                // TODO: Implémenter changement de vue
            });
        });

        // Retour aux albums
        const backButton = document.getElementById('backToAlbums');
        if (backButton) {
            backButton.addEventListener('click', () => {
                this.showAlbums();
            });
        }

        // Lightbox
        this.setupLightbox();

        // Gestion du clavier
        document.addEventListener('keydown', (e) => {
            if (document.getElementById('lightbox').classList.contains('active')) {
                switch(e.key) {
                    case 'Escape':
                        this.closeLightbox();
                        break;
                    case 'ArrowLeft':
                        this.previousPhoto();
                        break;
                    case 'ArrowRight':
                        this.nextPhoto();
                        break;
                }
            }
        });
    }

    setupLightbox() {
        const lightbox = document.getElementById('lightbox');
        const closeBtn = document.getElementById('lightboxClose');
        const prevBtn = document.getElementById('lightboxPrev');
        const nextBtn = document.getElementById('lightboxNext');

        if (lightbox) {
            lightbox.addEventListener('click', (e) => {
                if (e.target === lightbox) {
                    this.closeLightbox();
                }
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeLightbox());
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.previousPhoto());
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.nextPhoto());
        }
    }

    async loadTags() {
        try {
            const response = await fetch('/api/gallery/tags');
            if (!response.ok) {
                throw new Error('Erreur lors du chargement des tags');
            }

            const data = await response.json();
            if (data.success) {
                this.populateTagFilter(data.tags);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des tags:', error);
        }
    }

    populateTagFilter(tags) {
        const tagFilter = document.getElementById('tagFilter');
        if (!tagFilter) return;

        // Garder l'option "Tous les tags"
        const defaultOption = tagFilter.querySelector('option[value=""]');
        tagFilter.innerHTML = '';
        tagFilter.appendChild(defaultOption);

        tags.forEach(tag => {
            const option = document.createElement('option');
            option.value = tag.id;
            option.textContent = `${tag.name} (${tag.usage_count})`;
            tagFilter.appendChild(option);
        });
    }

    async loadAlbums() {
        try {
            this.showLoading('albumsContainer');

            const token = localStorage.getItem('token');
            const headers = {
                'Content-Type': 'application/json'
            };

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch('/api/gallery/albums', { headers });
            
            if (!response.ok) {
                throw new Error('Erreur lors du chargement des albums');
            }

            const data = await response.json();
            if (data.success) {
                this.albums = data.albums;
                this.displayAlbums(this.albums);
            } else {
                throw new Error(data.message || 'Erreur inconnue');
            }
        } catch (error) {
            console.error('Erreur lors du chargement des albums:', error);
            this.showError('albumsContainer', 'Impossible de charger les albums');
        }
    }

    displayAlbums(albums) {
        const container = document.getElementById('albumsContainer');
        if (!container) return;

        if (albums.length === 0) {
            container.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-images"></i>
                    <h3>Aucun album trouvé</h3>
                    <p>Il n'y a pas encore d'albums à afficher.</p>
                </div>
            `;
            return;
        }

        const albumsGrid = document.createElement('div');
        albumsGrid.className = 'albums-grid';

        albums.forEach(album => {
            const albumCard = this.createAlbumCard(album);
            albumsGrid.appendChild(albumCard);
        });

        container.innerHTML = '';
        container.appendChild(albumsGrid);
    }

    createAlbumCard(album) {
        const card = document.createElement('div');
        card.className = 'album-card';
        card.addEventListener('click', () => this.openAlbum(album.id));

        const coverImage = album.cover_image 
            ? `<img src="${album.cover_image}" alt="${album.title}" loading="lazy">`
            : '<i class="fas fa-images"></i>';

        const createdDate = new Date(album.created_at).toLocaleDateString('fr-FR');
        const eventInfo = album.event_id ? `<span class="stat-item"><i class="fas fa-calendar"></i> Événement</span>` : '';

        card.innerHTML = `
            <div class="album-cover">
                ${coverImage}
            </div>
            <div class="album-info">
                <h3 class="album-title">${album.title}</h3>
                <p class="album-description">${album.description || 'Aucune description disponible'}</p>
                <div class="album-meta">
                    <div class="album-stats">
                        <span class="stat-item">
                            <i class="fas fa-images"></i>
                            ${album.photo_count || 0} photos
                        </span>
                        ${eventInfo}
                    </div>
                    <span class="album-date">${createdDate}</span>
                </div>
            </div>
        `;

        return card;
    }

    async openAlbum(albumId) {
        try {
            this.showLoading('photosGrid');
            document.getElementById('albumsContainer').style.display = 'none';
            document.getElementById('photosContainer').style.display = 'block';

            const token = localStorage.getItem('token');
            const headers = {
                'Content-Type': 'application/json'
            };

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`/api/gallery/albums/${albumId}`, { headers });
            
            if (!response.ok) {
                throw new Error('Erreur lors du chargement de l\'album');
            }

            const data = await response.json();
            if (data.success) {
                this.currentAlbum = data.album;
                this.displayPhotos(data.album.photos);
            } else {
                throw new Error(data.message || 'Erreur inconnue');
            }
        } catch (error) {
            console.error('Erreur lors de l\'ouverture de l\'album:', error);
            this.showError('photosGrid', 'Impossible de charger l\'album');
        }
    }

    displayPhotos(photos) {
        const container = document.getElementById('photosGrid');
        if (!container) return;

        if (photos.length === 0) {
            container.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-image"></i>
                    <h3>Aucune photo</h3>
                    <p>Cet album ne contient pas encore de photos.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = '';

        photos.forEach((photo, index) => {
            const photoItem = this.createPhotoItem(photo, index);
            container.appendChild(photoItem);
        });
    }

    createPhotoItem(photo, index) {
        const item = document.createElement('div');
        item.className = 'photo-item';
        item.addEventListener('click', () => this.openLightbox(index));

        const tags = photo.tags && photo.tags.length > 0 
            ? photo.tags.map(tag => `<span class="photo-tag">${tag}</span>`).join('')
            : '';

        item.innerHTML = `
            <img src="${photo.thumbnail_path}" alt="${photo.title || 'Photo'}" loading="lazy">
            <div class="photo-overlay">
                ${photo.title ? `<div class="photo-title">${photo.title}</div>` : ''}
                ${tags ? `<div class="photo-tags">${tags}</div>` : ''}
            </div>
        `;

        return item;
    }

    openLightbox(photoIndex) {
        if (!this.currentAlbum || !this.currentAlbum.photos) return;

        this.currentPhotoIndex = photoIndex;
        const photo = this.currentAlbum.photos[photoIndex];
        
        const lightbox = document.getElementById('lightbox');
        const image = document.getElementById('lightboxImage');
        const title = document.getElementById('lightboxTitle');
        const description = document.getElementById('lightboxDescription');
        const tags = document.getElementById('lightboxTags');

        if (!lightbox || !image) return;

        // Mettre à jour le contenu
        image.src = photo.file_path;
        image.alt = photo.title || 'Photo';

        if (title) {
            title.textContent = photo.title || 'Sans titre';
        }

        if (description) {
            description.textContent = photo.description || '';
            description.style.display = photo.description ? 'block' : 'none';
        }

        if (tags) {
            if (photo.tags && photo.tags.length > 0) {
                tags.innerHTML = photo.tags.map(tag => 
                    `<span class="photo-tag">${tag}</span>`
                ).join('');
                tags.style.display = 'block';
            } else {
                tags.style.display = 'none';
            }
        }

        // Gérer la navigation
        const prevBtn = document.getElementById('lightboxPrev');
        const nextBtn = document.getElementById('lightboxNext');

        if (prevBtn) {
            prevBtn.style.display = photoIndex > 0 ? 'flex' : 'none';
        }

        if (nextBtn) {
            nextBtn.style.display = photoIndex < this.currentAlbum.photos.length - 1 ? 'flex' : 'none';
        }

        // Afficher la lightbox
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeLightbox() {
        const lightbox = document.getElementById('lightbox');
        if (lightbox) {
            lightbox.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    previousPhoto() {
        if (this.currentPhotoIndex > 0) {
            this.openLightbox(this.currentPhotoIndex - 1);
        }
    }

    nextPhoto() {
        if (this.currentAlbum && this.currentPhotoIndex < this.currentAlbum.photos.length - 1) {
            this.openLightbox(this.currentPhotoIndex + 1);
        }
    }

    showAlbums() {
        document.getElementById('photosContainer').style.display = 'none';
        document.getElementById('albumsContainer').style.display = 'block';
        this.currentAlbum = null;
    }

    filterAlbums() {
        const filteredAlbums = this.albums.filter(album => {
            const matchesSearch = !this.currentFilters.search || 
                album.title.toLowerCase().includes(this.currentFilters.search.toLowerCase()) ||
                (album.description && album.description.toLowerCase().includes(this.currentFilters.search.toLowerCase()));

            // Pour le moment, on ne filtre pas par tag au niveau album
            // car les tags sont associés aux photos, pas aux albums
            
            return matchesSearch;
        });

        this.displayAlbums(filteredAlbums);
    }

    showLoading(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="loading">
                    <i class="fas fa-spinner fa-spin"></i> Chargement...
                </div>
            `;
        }
    }

    showError(containerId, message) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Erreur</h3>
                    <p>${message}</p>
                </div>
            `;
        }
    }
}

// Initialiser la galerie quand le DOM est chargé
document.addEventListener('DOMContentLoaded', () => {
    new GalleryManager();
});