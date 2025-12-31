/**
 * ClickableUserElements.js
 * Universal system for making usernames and profile pictures clickable throughout the application
 * Implements requirements 5.1, 5.2, 5.3, 5.4, 5.5
 */

class ClickableUserElements {
    constructor() {
        this.observer = null;
        this.initialized = false;
        this.profileViewer = null;
    }

    /**
     * Initialize the clickable user elements system
     * @param {Object} profileViewer - Reference to the ProfileViewer instance
     */
    initialize(profileViewer) {
        if (this.initialized) return;
        
        this.profileViewer = profileViewer;
        this.setupMutationObserver();
        this.enhanceExistingElements();
        this.initialized = true;
    }

    /**
     * Set up mutation observer to automatically enhance new elements
     */
    setupMutationObserver() {
        this.observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            this.enhanceElement(node);
                        }
                    });
                }
            });
        });

        // Start observing the document with the configured parameters
        this.observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    /**
     * Enhance existing elements on page load
     */
    enhanceExistingElements() {
        this.enhanceElement(document.body);
    }

    /**
     * Enhance a specific element and its children
     * @param {Element} element - The element to enhance
     */
    enhanceElement(element) {
        if (!element || !element.querySelectorAll) return;

        // Find and enhance usernames
        this.enhanceUsernames(element);
        
        // Find and enhance profile pictures
        this.enhanceProfilePictures(element);
    }

    /**
     * Find and enhance username elements
     * @param {Element} element - The element to search within
     */
    enhanceUsernames(element) {
        // Common selectors for username elements - ONLY specific user-related elements
        const usernameSelectors = [
            '.review-username',
            '[data-username]',
            '.username:not(.artist-name):not(.album-artist)',
            '.user-name',
            '.profile-username',
            // Look for elements that contain username data but exclude artist names
            '[data-user-id]:not(img):not(.profile-picture-clickable):not(.artist-name):not(.album-artist)'
        ];

        usernameSelectors.forEach(selector => {
            const elements = element.querySelectorAll(selector);
            elements.forEach(el => {
                // Skip if this is an artist name or album-related element
                if (el.classList.contains('artist-name') || 
                    el.classList.contains('album-artist') ||
                    el.closest('.album-info') ||
                    el.closest('.artist-info')) {
                    return;
                }
                this.makeUsernameClickable(el);
            });
        });

        // Don't automatically convert text patterns - too aggressive
        // this.findUsernamesInText(element);
    }

    /**
     * Find username patterns in text content
     * @param {Element} element - The element to search within
     */
    findUsernamesInText(element) {
        // Look for patterns like "Por [username]" or "By [username]"
        const textNodes = this.getTextNodes(element);
        
        textNodes.forEach(node => {
            const text = node.textContent;
            const patterns = [
                /Por\s+([a-zA-Z0-9_]+)/g,
                /By\s+([a-zA-Z0-9_]+)/g,
                /@([a-zA-Z0-9_]+)/g
            ];

            patterns.forEach(pattern => {
                let match;
                while ((match = pattern.exec(text)) !== null) {
                    const username = match[1];
                    // Try to find user ID from nearby elements
                    const userId = this.findNearbyUserId(node.parentElement);
                    if (userId) {
                        this.wrapUsernameInText(node, match, username, userId);
                    }
                }
            });
        });
    }

    /**
     * Get all text nodes within an element
     * @param {Element} element - The element to search
     * @returns {Array} Array of text nodes
     */
    getTextNodes(element) {
        const textNodes = [];
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        let node;
        while (node = walker.nextNode()) {
            if (node.textContent.trim()) {
                textNodes.push(node);
            }
        }

        return textNodes;
    }

    /**
     * Find user ID from nearby elements
     * @param {Element} element - The element to search around
     * @returns {string|null} User ID if found
     */
    findNearbyUserId(element) {
        let current = element;
        let depth = 0;
        const maxDepth = 5;

        while (current && depth < maxDepth) {
            // Check for data-user-id attribute
            if (current.dataset && current.dataset.userId) {
                return current.dataset.userId;
            }

            // Check for onclick handlers that might contain user ID
            if (current.onclick) {
                const onclickStr = current.onclick.toString();
                const userIdMatch = onclickStr.match(/showUserProfile\((\d+)\)/);
                if (userIdMatch) {
                    return userIdMatch[1];
                }
            }

            // Check children for user ID
            const childWithUserId = current.querySelector('[data-user-id]');
            if (childWithUserId && childWithUserId.dataset.userId) {
                return childWithUserId.dataset.userId;
            }

            current = current.parentElement;
            depth++;
        }

        return null;
    }

    /**
     * Wrap username text with clickable element
     * @param {Node} textNode - The text node containing the username
     * @param {Array} match - The regex match result
     * @param {string} username - The username to make clickable
     * @param {string} userId - The user ID
     */
    wrapUsernameInText(textNode, match, username, userId) {
        const text = textNode.textContent;
        const beforeText = text.substring(0, match.index);
        const afterText = text.substring(match.index + match[0].length);

        // Create clickable username element
        const usernameElement = document.createElement('span');
        usernameElement.className = 'username-clickable';
        usernameElement.textContent = username;
        usernameElement.dataset.userId = userId;
        usernameElement.title = `Ver perfil de ${username}`;
        usernameElement.setAttribute('role', 'button');
        usernameElement.setAttribute('tabindex', '0');
        
        this.addUsernameClickHandler(usernameElement, userId, username);

        // Replace the text node with the new structure
        const parent = textNode.parentNode;
        
        if (beforeText) {
            parent.insertBefore(document.createTextNode(beforeText), textNode);
        }
        
        parent.insertBefore(usernameElement, textNode);
        
        if (afterText) {
            parent.insertBefore(document.createTextNode(afterText), textNode);
        }
        
        parent.removeChild(textNode);
    }

    /**
     * Make a username element clickable
     * @param {Element} element - The username element
     */
    makeUsernameClickable(element) {
        if (element.classList.contains('username-clickable')) return;

        const userId = element.dataset.userId || this.findNearbyUserId(element);
        const username = element.textContent.trim() || element.dataset.username;

        if (!userId || !username || isNaN(parseInt(userId))) {
            return;
        }

        // Add clickable styling and behavior
        element.classList.add('username-clickable');
        element.title = `Ver perfil de ${username}`;
        element.setAttribute('role', 'button');
        element.setAttribute('tabindex', '0');
        
        this.addUsernameClickHandler(element, userId, username);
    }

    /**
     * Add click handler to username element
     * @param {Element} element - The username element
     * @param {string} userId - The user ID
     * @param {string} username - The username
     */
    addUsernameClickHandler(element, userId, username) {
        const clickHandler = (event) => {
            event.preventDefault();
            event.stopPropagation();
            
            if (this.profileViewer && this.profileViewer.showUserProfile) {
                this.profileViewer.showUserProfile(parseInt(userId));
            } else {
                console.warn('ProfileViewer not available for username click:', username);
            }
        };

        element.addEventListener('click', clickHandler);
        
        // Add keyboard support
        element.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                clickHandler(event);
            }
        });
    }

    /**
     * Find and enhance profile picture elements
     * @param {Element} element - The element to search within
     */
    enhanceProfilePictures(element) {
        // Common selectors for profile picture elements - ONLY user profile pictures
        const profilePictureSelectors = [
            'img[src*="profile_pics"]',  // Only images from profile_pics directory
            'img[data-user-id]:not([src*="spotify"]):not([src*="album"])',  // Only user images, not album covers
            '.profile-picture',
            '.user-avatar',
            '#profilePicture',
            '#navbarProfilePicture',
            '.review-profile-pic'
        ];

        profilePictureSelectors.forEach(selector => {
            const elements = element.querySelectorAll(selector);
            elements.forEach(img => {
                // Skip if this is an album cover or artist image
                if (img.src.includes('spotify') || 
                    img.src.includes('album') ||
                    img.src.includes('artist') ||
                    img.closest('.album-cover') ||
                    img.closest('.artist-image')) {
                    return;
                }
                this.makeProfilePictureClickable(img);
            });
        });
    }

    /**
     * Make a profile picture element clickable
     * @param {Element} img - The image element
     */
    makeProfilePictureClickable(img) {
        if (!img || img.tagName !== 'IMG') return;
        if (img.classList.contains('profile-picture-clickable')) return;

        const userId = img.dataset.userId || this.findNearbyUserId(img);
        
        if (!userId || isNaN(parseInt(userId))) {
            return;
        }

        // Add clickable styling and behavior
        img.classList.add('profile-picture-clickable');
        
        // Add size class based on image dimensions
        const size = this.getProfilePictureSize(img);
        img.classList.add(`size-${size}`);
        
        // Add context class based on location
        const context = this.getProfilePictureContext(img);
        if (context) {
            img.classList.add(`in-${context}`);
        }

        img.title = 'Ver perfil de usuario';
        img.setAttribute('role', 'button');
        img.setAttribute('tabindex', '0');
        
        this.addProfilePictureClickHandler(img, userId);
    }

    /**
     * Determine profile picture size category
     * @param {Element} img - The image element
     * @returns {string} Size category (small, medium, large)
     */
    getProfilePictureSize(img) {
        const style = window.getComputedStyle(img);
        const width = parseInt(style.width) || img.width || 0;
        
        if (width <= 40) return 'small';
        if (width <= 80) return 'medium';
        return 'large';
    }

    /**
     * Determine profile picture context
     * @param {Element} img - The image element
     * @returns {string|null} Context (navbar, review, profile, etc.)
     */
    getProfilePictureContext(img) {
        if (img.closest('.navbar')) return 'navbar';
        if (img.closest('.review') || img.closest('[class*="review"]')) return 'review';
        if (img.closest('#profileContainer')) return 'profile';
        if (img.closest('.notification')) return 'notification';
        return null;
    }

    /**
     * Add click handler to profile picture element
     * @param {Element} img - The image element
     * @param {string} userId - The user ID
     */
    addProfilePictureClickHandler(img, userId) {
        const clickHandler = (event) => {
            event.preventDefault();
            event.stopPropagation();
            
            if (this.profileViewer && this.profileViewer.showUserProfile) {
                this.profileViewer.showUserProfile(parseInt(userId));
            } else {
                console.warn('ProfileViewer not available for profile picture click');
            }
        };

        img.addEventListener('click', clickHandler);
        
        // Add keyboard support
        img.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                clickHandler(event);
            }
        });
    }

    /**
     * Manually enhance specific elements (for dynamic content)
     * @param {Element} element - The element to enhance
     */
    enhanceSpecificElement(element) {
        if (!element) return;
        this.enhanceElement(element);
    }

    /**
     * Destroy the clickable user elements system
     */
    destroy() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        
        // Remove all clickable classes and handlers
        const clickableUsernames = document.querySelectorAll('.username-clickable');
        clickableUsernames.forEach(el => {
            el.classList.remove('username-clickable');
            el.removeAttribute('role');
            el.removeAttribute('tabindex');
            el.title = '';
        });

        const clickableProfilePics = document.querySelectorAll('.profile-picture-clickable');
        clickableProfilePics.forEach(el => {
            el.classList.remove('profile-picture-clickable', 'size-small', 'size-medium', 'size-large');
            el.classList.remove('in-navbar', 'in-review', 'in-profile', 'in-notification');
            el.removeAttribute('role');
            el.removeAttribute('tabindex');
            el.title = '';
        });

        this.initialized = false;
    }
}

// Create global instance
window.clickableUserElements = new ClickableUserElements();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ClickableUserElements;
}