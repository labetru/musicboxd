// ========================
// SOCIAL LISTS COMPONENT - OPTIMIZED WITH LAZY LOADING
// ========================

class SocialLists {
    constructor() {
        this.currentList = null; // 'followers' or 'following'
        this.currentUserId = null;
        this.lazyLoader = null;
        this.isLoading = false;
        this.init();
    }

    init() {
        this.createModalHTML();
        this.attachEventListeners();
    }

    createModalHTML() {
        // Check if modal already exists
        if (document.getElementById('socialListsModal')) {
            return;
        }

        const modalHTML = `
            <div class="modal fade" id="socialListsModal" tabindex="-1" aria-labelledby="socialListsModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="socialListsModalLabel">Lista Social</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
                        </div>
                        <div class="modal-body">
                            <!-- Loading State -->
                            <div id="socialListsLoading" class="text-center p-4" style="display: none;">
                                <div class="spinner-border text-primary" role="status">
                                    <span class="visually-hidden">Cargando...</span>
                                </div>
                                <p class="mt-2 text-muted">Cargando lista...</p>
                            </div>

                            <!-- Error State -->
                            <div id="socialListsError" class="text-center p-4" style="display: none;">
                                <div class="alert alert-danger" role="alert">
                                    <i class="fas fa-exclamation-triangle me-2"></i>
                                    <span id="socialListsErrorMessage">Error cargando la lista</span>
                                </div>
                                <button class="btn btn-outline-primary" onclick="socialLists.retryLoad()">
                                    <i class="fas fa-redo me-2"></i>Reintentar
                                </button>
                            </div>

                            <!-- Empty State -->
                            <div id="socialListsEmpty" class="text-center p-4" style="display: none;">
                                <div class="empty-state">
                                    <i class="fas fa-users fa-3x text-muted mb-3"></i>
                                    <h6 class="text-muted" id="socialListsEmptyMessage">No hay usuarios en esta lista</h6>
                                </div>
                            </div>

                            <!-- List Content -->
                            <div id="socialListsContent" style="display: none;">
                                <div class="row mb-3">
                                    <div class="col-md-6">
                                        <h6 id="socialListsTitle" class="mb-0">Lista</h6>
                                        <small class="text-muted" id="socialListsSubtitle">Información de la lista</small>
                                    </div>
                                    <div class="col-md-6 text-end">
                                        <small class="text-muted lazy-load-stats">0 usuarios</small>
                                        <button class="btn btn-sm btn-outline-secondary ms-2" onclick="socialLists.refresh()" title="Actualizar lista">
                                            <i class="fas fa-sync-alt"></i>
                                        </button>
                                    </div>
                                </div>

                                <!-- User List Container -->
                                <div id="socialListsUsers" class="social-users-list list-group">
                                    <!-- Users will be populated here by LazyLoader -->
                                </div>

                                <!-- Load More Button -->
                                <div class="text-center mt-3">
                                    <button id="loadMoreButton" class="btn btn-outline-primary" style="display: none;">
                                        Cargar más
                                    </button>
                                </div>

                                <!-- Loading Indicator -->
                                <div id="lazyLoadingIndicator" class="text-center p-3" style="display: none;">
                                    <div class="spinner-border spinner-border-sm text-primary" role="status">
                                        <span class="visually-hidden">Cargando más...</span>
                                    </div>
                                    <small class="text-muted ms-2">Cargando más usuarios...</small>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    attachEventListeners() {
        // Listen for modal close events to reset state
        const modal = document.getElementById('socialListsModal');
        if (modal) {
            modal.addEventListener('hidden.bs.modal', () => {
                this.resetState();
            });
        }
    }

    resetState() {
        this.currentList = null;
        this.currentUserId = null;
        this.isLoading = false;
        
        // Destroy lazy loader
        if (this.lazyLoader) {
            this.lazyLoader.destroy();
            this.lazyLoader = null;
        }
    }

    // Show followers list with lazy loading
    async showFollowers(userId, username = null) {
        this.currentList = 'followers';
        this.currentUserId = userId;

        // Update modal title
        const modalTitle = document.getElementById('socialListsModalLabel');
        if (modalTitle) {
            modalTitle.textContent = username ? `Seguidores de ${username}` : 'Seguidores';
        }

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('socialListsModal'));
        modal.show();

        // Initialize lazy loader
        this.initializeLazyLoader();
    }

    // Show following list with lazy loading
    async showFollowing(userId, username = null) {
        this.currentList = 'following';
        this.currentUserId = userId;

        // Update modal title
        const modalTitle = document.getElementById('socialListsModalLabel');
        if (modalTitle) {
            modalTitle.textContent = username ? `${username} sigue a` : 'Siguiendo';
        }

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('socialListsModal'));
        modal.show();

        // Initialize lazy loader
        this.initializeLazyLoader();
    }

    // Initialize lazy loader
    initializeLazyLoader() {
        if (!this.currentList || !this.currentUserId) {
            return;
        }

        // Clean up existing loader
        if (this.lazyLoader) {
            this.lazyLoader.destroy();
        }

        const container = document.getElementById('socialListsUsers');
        const loadMoreButton = document.getElementById('loadMoreButton');
        const loadingIndicator = document.getElementById('lazyLoadingIndicator');
        const statsToggle = document.getElementById('includeStatsToggle');

        if (!container) {
            console.error('Social lists container not found');
            return;
        }

        // Create lazy loader
        this.lazyLoader = new LazyLoader({
            container: container,
            loadMoreButton: loadMoreButton,
            loadingIndicator: loadingIndicator,
            apiEndpoint: `${API_BASE_URL}/api/users/${this.currentUserId}/${this.currentList}`,
            itemRenderer: this.createItemRenderer(),
            pageSize: 20, // Optimized page size
            includeStats: false, // Always false since we removed the toggle
            autoLoad: true
        });

        // Show content state
        this.showContentState();

        // Update title info
        this.updateListTitle();
    }

    // Create item renderer for lazy loader
    createItemRenderer() {
        return (user) => {
            const div = document.createElement('div');
            div.className = 'list-group-item social-user-item d-flex align-items-center p-3';
            div.setAttribute('data-user-id', user.id);

            const profileImageUrl = getProfileImageUrl(user.profilePictureUrl, '50');
            const isCurrentUser = user.id === currentUserId;
            const canUnfollow = this.currentList === 'following' && user.relationship?.canUnfollow;
            const isFollowedByCurrentUser = user.relationship?.isFollowedByCurrentUser;

            // Stats HTML (only if stats are included)
            let statsHTML = '';
            if (user.stats) {
                statsHTML = `
                    <div class="d-flex align-items-center text-muted small mt-1">
                        <span class="me-3">
                            <i class="fas fa-star text-warning me-1"></i>
                            ${user.stats.averageStars} promedio
                        </span>
                        <span>
                            <i class="fas fa-music me-1"></i>
                            ${user.stats.reviewCount} reseñas
                        </span>
                    </div>
                `;
            }

            // Follow date HTML
            let followDateHTML = '';
            if (user.followedSince) {
                const followDate = new Date(user.followedSince).toLocaleDateString();
                followDateHTML = `<small class="text-muted">Siguiendo desde ${followDate}</small>`;
            }

            div.innerHTML = `
                <img src="${profileImageUrl}" 
                     alt="Foto de perfil de ${user.username}" 
                     class="rounded-circle me-3 clickable-profile-pic" 
                     data-user-id="${user.id}"
                     style="width: 50px; height: 50px; object-fit: cover; cursor: pointer;"
                     onerror="handleImageError(this, '50')"
                     title="Ver perfil de ${user.username}">
                
                <div class="flex-grow-1">
                    <h6 class="mb-1">
                        <span class="clickable-username text-primary fw-bold" 
                              data-user-id="${user.id}"
                              style="cursor: pointer; text-decoration: underline;"
                              title="Ver perfil de ${user.username}">
                            ${user.username}
                        </span>
                        ${isCurrentUser ? '<small class="text-muted">(Tú)</small>' : ''}
                    </h6>
                    ${statsHTML}
                    ${followDateHTML}
                </div>
                
                <div class="social-user-actions">
                    ${this.renderUserActions(user, canUnfollow, isFollowedByCurrentUser, isCurrentUser)}
                </div>
            `;

            return div;
        };
    }

    // Render user action buttons
    renderUserActions(user, canUnfollow, isFollowedByCurrentUser, isCurrentUser) {
        if (isCurrentUser) {
            return '<small class="text-muted">Tu perfil</small>';
        }

        let actionsHTML = '';

        // Unfollow button (only in following list and if user can unfollow)
        if (canUnfollow) {
            actionsHTML += `
                <button class="btn btn-outline-danger btn-sm me-2" 
                        onclick="socialLists.unfollowUser(${user.id}, '${user.username}')"
                        title="Dejar de seguir a ${user.username}">
                    <i class="fas fa-user-minus me-1"></i>
                    Dejar de seguir
                </button>
            `;
        }

        // Follow/Following button (only in followers list)
        if (this.currentList === 'followers' && currentUserId && currentUserId !== user.id) {
            if (isFollowedByCurrentUser) {
                actionsHTML += `
                    <button class="btn btn-outline-secondary btn-sm" 
                            onclick="socialLists.toggleFollow(${user.id}, '${user.username}', false)"
                            title="Dejar de seguir a ${user.username}">
                        <i class="fas fa-user-check me-1"></i>
                        Siguiendo
                    </button>
                `;
            } else {
                actionsHTML += `
                    <button class="btn btn-outline-primary btn-sm" 
                            onclick="socialLists.toggleFollow(${user.id}, '${user.username}', true)"
                            title="Seguir a ${user.username}">
                        <i class="fas fa-user-plus me-1"></i>
                        Seguir
                    </button>
                `;
            }
        }

        return actionsHTML;
    }

    // Update list title
    updateListTitle() {
        const title = document.getElementById('socialListsTitle');
        const subtitle = document.getElementById('socialListsSubtitle');

        if (title && subtitle) {
            if (this.currentList === 'followers') {
                title.textContent = 'Seguidores';
                subtitle.textContent = 'Usuarios que siguen a este perfil';
            } else {
                title.textContent = 'Siguiendo';
                subtitle.textContent = 'Usuarios seguidos por este perfil';
            }
        }
    }

    // Navigate to user profile
    navigateToProfile(userId) {
        // Close modal first
        const modal = bootstrap.Modal.getInstance(document.getElementById('socialListsModal'));
        if (modal) {
            modal.hide();
        }

        // Navigate to profile using existing ProfileViewer
        if (window.profileViewer) {
            profileViewer.showUserProfile(userId);
        } else {
            console.error('ProfileViewer not available');
        }
    }

    // Unfollow user from following list
    async unfollowUser(userId, username) {
        if (!confirm(`¿Estás seguro de que quieres dejar de seguir a ${username}?`)) {
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/users/${userId}/follow`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success) {
                // Show success message
                this.showNotification(`Ya no sigues a ${username}`, 'success');
                
                // Refresh the lazy loader
                if (this.lazyLoader) {
                    this.lazyLoader.refresh();
                }
                
                // Update follow button if it exists in the main app
                if (window.followButton) {
                    followButton.updateButtonState(userId, false);
                }
            } else {
                throw new Error(data.error || 'Error al dejar de seguir');
            }

        } catch (error) {
            console.error('Error unfollowing user:', error);
            this.showNotification(`Error al dejar de seguir a ${username}: ${error.message}`, 'error');
        }
    }

    // Toggle follow status (for followers list)
    async toggleFollow(userId, username, shouldFollow) {
        const action = shouldFollow ? 'seguir' : 'dejar de seguir';
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/users/${userId}/follow`, {
                method: shouldFollow ? 'POST' : 'DELETE',
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success) {
                const message = shouldFollow ? `Ahora sigues a ${username}` : `Ya no sigues a ${username}`;
                this.showNotification(message, 'success');
                
                // Refresh the lazy loader
                if (this.lazyLoader) {
                    this.lazyLoader.refresh();
                }
                
                // Update follow button if it exists in the main app
                if (window.followButton) {
                    followButton.updateButtonState(userId, shouldFollow);
                }
            } else {
                throw new Error(data.error || `Error al ${action}`);
            }

        } catch (error) {
            console.error(`Error ${action} user:`, error);
            this.showNotification(`Error al ${action} a ${username}: ${error.message}`, 'error');
        }
    }

    // Refresh the current list
    refresh() {
        if (this.lazyLoader) {
            this.lazyLoader.refresh();
        }
    }

    // State management methods
    showLoadingState() {
        this.hideAllStates();
        const loading = document.getElementById('socialListsLoading');
        if (loading) loading.style.display = 'block';
    }

    showErrorState(message) {
        this.hideAllStates();
        const error = document.getElementById('socialListsError');
        const errorMessage = document.getElementById('socialListsErrorMessage');
        if (error && errorMessage) {
            errorMessage.textContent = message;
            error.style.display = 'block';
        }
    }

    showEmptyState() {
        this.hideAllStates();
        const empty = document.getElementById('socialListsEmpty');
        const emptyMessage = document.getElementById('socialListsEmptyMessage');
        if (empty && emptyMessage) {
            const message = this.currentList === 'followers' 
                ? 'Este usuario no tiene seguidores aún'
                : 'Este usuario no sigue a nadie aún';
            emptyMessage.textContent = message;
            empty.style.display = 'block';
        }
    }

    showContentState() {
        this.hideAllStates();
        const content = document.getElementById('socialListsContent');
        if (content) content.style.display = 'block';
    }

    hideAllStates() {
        const states = ['socialListsLoading', 'socialListsError', 'socialListsEmpty', 'socialListsContent'];
        states.forEach(stateId => {
            const element = document.getElementById(stateId);
            if (element) element.style.display = 'none';
        });
    }

    // Retry loading
    async retryLoad() {
        if (this.lazyLoader) {
            this.lazyLoader.refresh();
        } else {
            this.initializeLazyLoader();
        }
    }

    // Show notification
    showNotification(message, type) {
        // Use the existing notification system from app.js
        if (window.showNotification) {
            showNotification(message, type, 'socialListsNotification');
        } else {
            // Fallback to console if notification system not available
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
}

// Create global instance
const socialLists = new SocialLists();

// Make it available globally
window.socialLists = socialLists;

// Add event delegation for clickable elements
document.addEventListener('click', (e) => {
    // Handle clickable profile pictures
    if (e.target.classList.contains('clickable-profile-pic')) {
        const userId = e.target.getAttribute('data-user-id');
        if (userId && socialLists) {
            socialLists.navigateToProfile(parseInt(userId));
        }
    }
    
    // Handle clickable usernames
    if (e.target.classList.contains('clickable-username')) {
        const userId = e.target.getAttribute('data-user-id');
        if (userId && socialLists) {
            socialLists.navigateToProfile(parseInt(userId));
        }
    }
});

// Make it available globally
window.socialLists = socialLists;