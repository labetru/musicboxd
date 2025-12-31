// FollowButton Component for Social Network Features
// Handles follow/unfollow functionality with interactive states

class FollowButton {
    constructor(userId, initialState = null) {
        this.userId = userId;
        this.isFollowing = initialState?.isFollowing || false;
        this.canFollow = initialState?.canFollow !== false; // Default to true unless explicitly false
        this.isLoading = false;
        this.element = null;
        this.onStateChange = null; // Callback for state changes
    }

    // Create and return the follow button element
    create(options = {}) {
        const {
            className = 'btn px-4',
            size = 'normal', // 'sm', 'normal', 'lg'
            showIcon = true,
            customText = null
        } = options;

        // Don't create button if user can't follow (not logged in or own profile)
        if (!this.canFollow) {
            return null;
        }

        this.element = document.createElement('button');
        this.element.className = this.getButtonClasses(className, size);
        this.element.disabled = this.isLoading;
        
        // Set initial content
        this.updateButtonContent(showIcon, customText);
        
        // Add event listeners
        this.attachEventListeners(showIcon, customText);
        
        return this.element;
    }

    // Get appropriate CSS classes for button state
    getButtonClasses(baseClass, size) {
        let classes = baseClass;
        
        // Add size class
        if (size === 'sm') classes += ' btn-sm';
        else if (size === 'lg') classes += ' btn-lg';
        
        // Add state-specific classes
        if (this.isLoading) {
            classes += ' btn-secondary';
        } else if (this.isFollowing) {
            classes += ' btn-outline-primary';
        } else {
            classes += ' btn-primary';
        }
        
        return classes;
    }

    // Update button content based on current state
    updateButtonContent(showIcon = true, customText = null) {
        if (!this.element) return;

        let content = '';
        
        if (this.isLoading) {
            content = `
                <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Cargando...
            `;
        } else {
            const icon = showIcon ? this.getStateIcon() : '';
            const text = customText || this.getStateText();
            content = `${icon}<span class="follow-button-text">${text}</span>`;
        }
        
        this.element.innerHTML = content;
        this.element.className = this.getButtonClasses('btn px-4', 'normal');
    }

    // Get icon for current state
    getStateIcon() {
        if (this.isFollowing) {
            return '<i class="fas fa-user-check me-2"></i>';
        } else {
            return '<i class="fas fa-user-plus me-2"></i>';
        }
    }

    // Get text for current state
    getStateText() {
        return this.isFollowing ? 'Siguiendo' : 'Seguir';
    }

    // Attach event listeners to the button
    attachEventListeners(showIcon, customText) {
        if (!this.element) return;

        // Main click handler
        this.element.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            await this.handleToggle();
        });

        // Hover effects for "Siguiendo" state
        if (this.isFollowing) {
            this.addHoverEffects(showIcon, customText);
        }
    }

    // Add hover effects for "Siguiendo" state
    addHoverEffects(showIcon, customText) {
        if (!this.element || !this.isFollowing) return;

        const mouseEnterHandler = () => {
            if (!this.isLoading && this.isFollowing) {
                this.element.className = this.element.className.replace('btn-outline-primary', 'btn-danger');
                const icon = showIcon ? '<i class="fas fa-user-minus me-2"></i>' : '';
                const text = customText || 'Dejar de seguir';
                this.element.innerHTML = `${icon}<span class="follow-button-text">${text}</span>`;
            }
        };

        const mouseLeaveHandler = () => {
            if (!this.isLoading && this.isFollowing) {
                this.element.className = this.element.className.replace('btn-danger', 'btn-outline-primary');
                const icon = showIcon ? '<i class="fas fa-user-check me-2"></i>' : '';
                const text = customText || 'Siguiendo';
                this.element.innerHTML = `${icon}<span class="follow-button-text">${text}</span>`;
            }
        };

        this.element.addEventListener('mouseenter', mouseEnterHandler);
        this.element.addEventListener('mouseleave', mouseLeaveHandler);

        // Store handlers for potential cleanup
        this.element._hoverHandlers = { mouseEnterHandler, mouseLeaveHandler };
    }

    // Remove hover effects
    removeHoverEffects() {
        if (!this.element || !this.element._hoverHandlers) return;

        const { mouseEnterHandler, mouseLeaveHandler } = this.element._hoverHandlers;
        this.element.removeEventListener('mouseenter', mouseEnterHandler);
        this.element.removeEventListener('mouseleave', mouseLeaveHandler);
        delete this.element._hoverHandlers;
    }

    // Handle follow/unfollow toggle
    async handleToggle() {
        if (this.isLoading || !this.canFollow) return;

        const wasFollowing = this.isFollowing;
        const endpoint = `${API_BASE_URL}/api/users/${this.userId}/follow`;
        const method = wasFollowing ? 'DELETE' : 'POST';

        // Set loading state
        this.setLoading(true);

        try {
            const response = await fetch(endpoint, {
                method: method,
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Update state
                this.isFollowing = !wasFollowing;
                
                // Update button appearance
                this.updateButtonContent(true);
                
                // Re-add hover effects if now following
                if (this.isFollowing) {
                    this.addHoverEffects(true);
                } else {
                    this.removeHoverEffects();
                }
                
                // Show success notification
                const action = this.isFollowing ? 'seguido' : 'dejado de seguir';
                this.showNotification(`Has ${action} a este usuario correctamente`, 'success');
                
                // Call state change callback if provided
                if (this.onStateChange) {
                    this.onStateChange({
                        isFollowing: this.isFollowing,
                        updatedStats: {
                            followers_count: data.counts?.following_followers_count,
                            following_count: data.counts?.follower_following_count
                        },
                        action: this.isFollowing ? 'followed' : 'unfollowed'
                    });
                }
                
            } else {
                throw new Error(data.error || 'Error al actualizar el seguimiento');
            }

        } catch (error) {
            console.error('Error toggling follow status:', error);
            
            // Show error notification
            let errorMessage = 'Error al actualizar el seguimiento. Inténtalo de nuevo.';
            
            if (error.message.includes('fetch')) {
                errorMessage = 'Error de conexión. Verifica tu conexión a internet.';
            } else if (error.message.includes('401') || error.message.includes('unauthorized')) {
                errorMessage = 'Debes iniciar sesión para seguir usuarios.';
            } else if (error.message.includes('404')) {
                errorMessage = 'Usuario no encontrado.';
            }
            
            this.showNotification(errorMessage, 'error');
            
        } finally {
            this.setLoading(false);
        }
    }

    // Set loading state
    setLoading(loading) {
        this.isLoading = loading;
        
        if (this.element) {
            this.element.disabled = loading;
            this.updateButtonContent(true);
        }
    }

    // Update the button state externally
    updateState(newState) {
        const oldState = {
            isFollowing: this.isFollowing,
            canFollow: this.canFollow
        };

        // Update internal state
        if (newState.isFollowing !== undefined) {
            this.isFollowing = newState.isFollowing;
        }
        if (newState.canFollow !== undefined) {
            this.canFollow = newState.canFollow;
        }

        // Update button if it exists
        if (this.element) {
            if (!this.canFollow) {
                // Hide button if user can't follow
                this.element.style.display = 'none';
            } else {
                this.element.style.display = '';
                this.updateButtonContent(true);
                
                // Handle hover effects
                if (this.isFollowing && !oldState.isFollowing) {
                    this.addHoverEffects(true);
                } else if (!this.isFollowing && oldState.isFollowing) {
                    this.removeHoverEffects();
                }
            }
        }
    }

    // Set callback for state changes
    onStateChanged(callback) {
        this.onStateChange = callback;
    }

    // Show notification
    showNotification(message, type = 'info') {
        // Use the existing notification system from app.js
        if (typeof showNotification === 'function') {
            showNotification(message, type, 'followButtonNotification');
        } else {
            // Fallback to console if notification system not available
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }

    // Destroy the button and clean up
    destroy() {
        if (this.element) {
            this.removeHoverEffects();
            if (this.element.parentNode) {
                this.element.parentNode.removeChild(this.element);
            }
            this.element = null;
        }
        this.onStateChange = null;
    }

    // Static method to create a follow button quickly
    static create(userId, initialState, options = {}) {
        const button = new FollowButton(userId, initialState);
        return button.create(options);
    }

    // Static method to check follow status from server
    static async checkFollowStatus(userId) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/users/${userId}/follow-status`, {
                credentials: 'include'
            });

            if (response.ok) {
                return await response.json();
            } else {
                return {
                    success: false,
                    isFollowing: false,
                    canFollow: false,
                    error: 'Failed to check follow status'
                };
            }
        } catch (error) {
            console.error('Error checking follow status:', error);
            return {
                success: false,
                isFollowing: false,
                canFollow: false,
                error: error.message
            };
        }
    }
}

// Make FollowButton available globally
window.FollowButton = FollowButton;