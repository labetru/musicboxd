// ProfileViewer Component for Social Network Features
// Handles loading and displaying public user profiles

class ProfileViewer {
    constructor() {
        this.currentProfileUserId = null;
        this.followButton = null;
        this.isLoading = false;
    }

    // Main function to show a user's public profile
    async showUserProfile(userId) {
        if (!userId || isNaN(parseInt(userId))) {
            console.error('Invalid user ID provided to ProfileViewer');
            return;
        }

        const targetUserId = parseInt(userId);
        
        // Prevent loading the same profile multiple times
        if (this.currentProfileUserId === targetUserId && !this.isLoading) {
            return;
        }

        this.currentProfileUserId = targetUserId;
        this.isLoading = true;

        try {
            // Hide other containers and show profile viewer
            this.showProfileContainer();
            
            // Show loading state
            this.showLoadingState();
            
            // Load profile data
            await this.loadProfileData(targetUserId);
            
        } catch (error) {
            console.error('Error showing user profile:', error);
            this.showErrorState('Error al cargar el perfil del usuario');
        } finally {
            this.isLoading = false;
        }
    }

    // Show the profile container and hide others
    showProfileContainer() {
        // Hide all other main containers
        document.getElementById("authContainer").style.display = "none";
        document.getElementById("albumFeed").style.display = "none";
        document.getElementById("searchContainer").style.display = "none";
        document.getElementById("albumDetailContainer").style.display = "none";
        
        // Show navbar and profile container
        document.getElementById("navbar").style.display = "block";
        
        // Create or show profile viewer container
        let profileViewerContainer = document.getElementById("profileViewerContainer");
        if (!profileViewerContainer) {
            profileViewerContainer = this.createProfileViewerContainer();
        }
        
        profileViewerContainer.style.display = "block";
        
        // Hide the existing profile container (user's own profile)
        const existingProfileContainer = document.getElementById("profileContainer");
        if (existingProfileContainer) {
            existingProfileContainer.style.display = "none";
        }
    }

    // Create the profile viewer container HTML structure
    createProfileViewerContainer() {
        const container = document.createElement('div');
        container.id = 'profileViewerContainer';
        container.className = 'container my-4';
        container.innerHTML = `
            <div class="row">
                <div class="col-md-8 mx-auto">
                    <div id="profileViewerContent">
                        <!-- Profile content will be inserted here -->
                    </div>
                </div>
            </div>
        `;
        
        // Insert after the existing profile container
        const existingProfileContainer = document.getElementById("profileContainer");
        existingProfileContainer.parentNode.insertBefore(container, existingProfileContainer.nextSibling);
        
        return container;
    }

    // Show loading state
    showLoadingState() {
        const content = document.getElementById("profileViewerContent");
        content.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Cargando perfil...</span>
                </div>
                <p class="mt-3 text-muted">Cargando perfil del usuario...</p>
            </div>
        `;
    }

    // Show error state
    showErrorState(message) {
        const content = document.getElementById("profileViewerContent");
        content.innerHTML = `
            <div class="text-center py-5">
                <div class="alert alert-danger" role="alert">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    ${message}
                </div>
                <button class="btn btn-primary" onclick="showApp()">
                    <i class="fas fa-arrow-left me-2"></i>Volver al inicio
                </button>
            </div>
        `;
    }

    // Load and display profile data
    async loadProfileData(userId) {
        try {
            // Load profile data, follow status, and top reviews in parallel
            const [profileResponse, followStatusResponse, topReviewsResponse] = await Promise.all([
                fetch(`${API_BASE_URL}/api/users/${userId}/profile`, { credentials: "include" }),
                this.loadFollowStatus(userId),
                fetch(`${API_BASE_URL}/api/users/${userId}/top-reviews?limit=5`, { credentials: "include" })
            ]);

            if (!profileResponse.ok) {
                if (profileResponse.status === 404) {
                    throw new Error('Usuario no encontrado');
                } else if (profileResponse.status === 401) {
                    throw new Error('No autorizado para ver este perfil');
                } else {
                    throw new Error('Error al cargar el perfil');
                }
            }

            const profileData = await profileResponse.json();
            const followStatus = followStatusResponse;
            
            let topReviewsData = null;
            if (topReviewsResponse.ok) {
                topReviewsData = await topReviewsResponse.json();
            }

            // Render the complete profile
            this.renderProfile(profileData.profile, followStatus, topReviewsData);

        } catch (error) {
            console.error('Error loading profile data:', error);
            throw error;
        }
    }

    // Load follow status for the current user
    async loadFollowStatus(userId) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/users/${userId}/follow-status`, { 
                credentials: "include" 
            });
            
            if (response.ok) {
                return await response.json();
            } else {
                // If not authenticated or other error, return default state
                return {
                    success: false,
                    isFollowing: false,
                    canFollow: false
                };
            }
        } catch (error) {
            console.error('Error loading follow status:', error);
            return {
                success: false,
                isFollowing: false,
                canFollow: false
            };
        }
    }

    // Render the complete profile
    renderProfile(profile, followStatus, topReviewsData) {
        const content = document.getElementById("profileViewerContent");
        
        // Generate profile picture URL with error handling
        const profilePictureUrl = profile.profilePictureUrl ? 
            getProfileImageUrl(profile.profilePictureUrl, '120') : 
            '/icons/icono_ftperfil_predeterminado.svg';

        // Generate follow button HTML
        const followButtonHtml = this.generateFollowButtonHtml(followStatus);

        // Generate top reviews HTML
        const topReviewsHtml = this.generateTopReviewsHtml(topReviewsData);

        content.innerHTML = `
            <!-- Back button -->
            <div class="mb-3">
                <button class="btn btn-outline-secondary" onclick="showApp()">
                    <i class="fas fa-arrow-left me-2"></i>Volver al inicio
                </button>
            </div>

            <!-- Profile header -->
            <div class="card p-4 mb-4 shadow-sm bg-white">
                <div class="row align-items-center">
                    <div class="col-auto">
                        <img src="${profilePictureUrl}" 
                             alt="Foto de perfil de ${profile.username}" 
                             class="rounded-circle border border-3 border-white shadow-sm profile-picture-clickable" 
                             style="width: 120px; height: 120px; object-fit: cover; cursor: pointer;"
                             onclick="profileViewer.showUserProfile(${profile.id})"
                             onerror="handleImageError(this, '120')">
                    </div>
                    <div class="col">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <h2 class="mb-1 text-primary profile-username-clickable" 
                                    style="cursor: pointer;"
                                    onclick="profileViewer.showUserProfile(${profile.id})">
                                    ${profile.username}
                                </h2>
                                <p class="text-muted mb-2">
                                    Miembro desde ${this.formatDate(profile.memberSince)}
                                </p>
                                <div class="d-flex gap-4">
                                    <div class="text-center">
                                        <strong class="d-block text-primary social-stat-clickable" 
                                                style="cursor: pointer; font-size: 1.2rem;"
                                                onclick="profileViewer.showFollowersList(${profile.id})">
                                            ${profile.socialStats.followersCount}
                                        </strong>
                                        <small class="text-muted">Seguidores</small>
                                    </div>
                                    <div class="text-center">
                                        <strong class="d-block text-primary social-stat-clickable" 
                                                style="cursor: pointer; font-size: 1.2rem;"
                                                onclick="profileViewer.showFollowingList(${profile.id})">
                                            ${profile.socialStats.followingCount}
                                        </strong>
                                        <small class="text-muted">Siguiendo</small>
                                    </div>
                                </div>
                            </div>
                            <div>
                                ${followButtonHtml}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Review statistics -->
            <div class="row text-center mb-4">
                <div class="col-md-6">
                    <div class="card p-3 shadow-sm h-100">
                        <h3 class="display-5 text-primary">${profile.reviewStats.totalReviews}</h3>
                        <p class="text-muted mb-0">Reseñas Totales</p>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card p-3 shadow-sm h-100">
                        <h3 class="display-5 text-warning">${profile.reviewStats.averageStars}</h3>
                        <p class="text-muted mb-0">Promedio de Estrellas</p>
                    </div>
                </div>
            </div>

            <!-- Top reviews section -->
            <div class="card p-4 shadow-sm">
                <h4 class="mb-3">
                    <i class="fas fa-star text-warning me-2"></i>
                    Álbumes Mejor Reseñados (4+ Estrellas)
                </h4>
                ${topReviewsHtml}
            </div>
        `;

        // Initialize follow button functionality
        this.initializeFollowButton(profile.id, followStatus);
    }

    // Generate follow button HTML based on status
    generateFollowButtonHtml(followStatus) {
        if (!followStatus.success || !followStatus.canFollow) {
            return ''; // Don't show follow button if user can't follow (not logged in or own profile)
        }

        // Return placeholder div where the FollowButton component will be inserted
        return `<div id="followButtonContainer"></div>`;
    }

    // Generate top reviews HTML
    generateTopReviewsHtml(topReviewsData) {
        if (!topReviewsData || !topReviewsData.success || !topReviewsData.reviews || topReviewsData.reviews.length === 0) {
            return `
                <div class="text-center py-4">
                    <i class="fas fa-music text-muted mb-3" style="font-size: 3rem;"></i>
                    <p class="text-muted">Este usuario aún no tiene reseñas de alta puntuación (4+ estrellas).</p>
                </div>
            `;
        }

        const reviewsHtml = topReviewsData.reviews.map(review => {
            const stars = createStars(review.stars);
            return `
                <div class="border-bottom py-3 review-item" 
                     style="cursor: pointer;"
                     onclick="window.renderAlbumDetailsLogic('${review.spotifyId}')">
                    <div class="row align-items-center">
                        <div class="col-auto">
                            <img src="${review.albumCoverUrl}" 
                                 alt="Portada de ${review.albumName}" 
                                 class="rounded shadow-sm" 
                                 style="width: 80px; height: 80px; object-fit: cover;">
                        </div>
                        <div class="col">
                            <h6 class="mb-1 text-primary">${review.albumName}</h6>
                            <p class="mb-1 text-muted">${review.artistName}</p>
                            <div class="mb-2">
                                <span class="text-warning">${stars}</span>
                                <small class="text-muted ms-2">(${review.stars}/5 estrellas)</small>
                            </div>
                            <p class="mb-0 small text-break" style="font-style: italic;">
                                "${review.comment}"
                            </p>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        return `<div class="top-reviews-list">${reviewsHtml}</div>`;
    }

    // Initialize follow button functionality
    initializeFollowButton(userId, followStatus) {
        const followButtonContainer = document.getElementById('followButtonContainer');
        if (!followButtonContainer || !followStatus.success || !followStatus.canFollow) {
            return;
        }

        // Create new FollowButton instance
        this.followButton = new FollowButton(userId, {
            isFollowing: followStatus.isFollowing,
            canFollow: followStatus.canFollow
        });

        // Set up state change callback to update social stats
        this.followButton.onStateChanged((stateChange) => {
            // Update social stats counters in the UI
            if (stateChange.updatedStats) {
                this.updateSocialStatsCounters(stateChange.updatedStats);
            }
        });

        // Create and insert the button element
        const buttonElement = this.followButton.create({
            className: 'btn px-4',
            size: 'normal',
            showIcon: true
        });

        if (buttonElement) {
            followButtonContainer.appendChild(buttonElement);
        }
    }

    // Update social stats counters in the UI
    updateSocialStatsCounters(updatedStats) {
        if (!updatedStats) return;

        // Update followers count - find the element that shows followers count
        const followersElements = document.querySelectorAll('.social-stat-clickable');
        if (followersElements.length > 0 && updatedStats.followers_count !== undefined) {
            // First element should be followers, second should be following
            followersElements[0].textContent = updatedStats.followers_count;
        }
    }

    // Show followers list using SocialLists component
    showFollowersList(userId) {
        // Get username for the modal title
        const usernameElement = document.querySelector('.profile-username-clickable');
        const username = usernameElement ? usernameElement.textContent : null;
        
        // Use SocialLists component to show followers
        if (window.socialLists) {
            socialLists.showFollowers(userId, username);
        } else {
            console.error('SocialLists component not available');
            this.showNotification('Error: Componente de listas sociales no disponible', 'error');
        }
    }

    // Show following list using SocialLists component
    showFollowingList(userId) {
        // Get username for the modal title
        const usernameElement = document.querySelector('.profile-username-clickable');
        const username = usernameElement ? usernameElement.textContent : null;
        
        // Use SocialLists component to show following
        if (window.socialLists) {
            socialLists.showFollowing(userId, username);
        } else {
            console.error('SocialLists component not available');
            this.showNotification('Error: Componente de listas sociales no disponible', 'error');
        }
    }

    // Utility function to format dates
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }

    // Show notification messages
    showNotification(message, type = 'info') {
        // Use the existing notification system from app.js
        if (typeof showNotification === 'function') {
            showNotification(message, type, 'profileViewerNotification');
        } else {
            // Fallback to console if notification system not available
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }

    // Hide profile viewer and return to main app
    hide() {
        const container = document.getElementById("profileViewerContainer");
        if (container) {
            container.style.display = "none";
        }
        
        // Clean up follow button
        if (this.followButton) {
            this.followButton.destroy();
            this.followButton = null;
        }
        
        this.currentProfileUserId = null;
    }
}

// Create global instance
const profileViewer = new ProfileViewer();

// Make it available globally for onclick handlers
window.profileViewer = profileViewer;