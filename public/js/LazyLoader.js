/**
 * LazyLoader - Utility for implementing lazy loading in social lists
 * Provides efficient loading of large lists with pagination and caching
 */

class LazyLoader {
  constructor(options = {}) {
    this.container = options.container;
    this.loadMoreButton = options.loadMoreButton;
    this.apiEndpoint = options.apiEndpoint;
    this.itemRenderer = options.itemRenderer;
    this.loadingIndicator = options.loadingIndicator;
    
    // Configuration
    this.pageSize = options.pageSize || 20;
    this.includeStats = options.includeStats || false;
    this.autoLoad = options.autoLoad !== false; // Default true
    
    // State
    this.currentPage = 1;
    this.totalPages = 1;
    this.isLoading = false;
    this.hasMore = true;
    this.items = [];
    
    // Cache for loaded pages
    this.pageCache = new Map();
    
    this.init();
  }

  init() {
    if (this.loadMoreButton) {
      this.loadMoreButton.addEventListener('click', () => this.loadMore());
    }
    
    // Auto-load first page
    if (this.autoLoad) {
      this.loadPage(1);
    }
    
    // Intersection Observer for infinite scroll (optional)
    if (this.container && window.IntersectionObserver) {
      this.setupInfiniteScroll();
    }
  }

  setupInfiniteScroll() {
    const sentinel = document.createElement('div');
    sentinel.className = 'lazy-load-sentinel';
    sentinel.style.height = '1px';
    this.container.appendChild(sentinel);

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && this.hasMore && !this.isLoading) {
        this.loadMore();
      }
    }, {
      rootMargin: '100px' // Load when 100px away from viewport
    });

    observer.observe(sentinel);
    this.sentinel = sentinel;
    this.observer = observer;
  }

  async loadPage(page) {
    if (this.isLoading) return;
    
    // Check cache first
    const cacheKey = `page_${page}_${this.includeStats}`;
    if (this.pageCache.has(cacheKey)) {
      const cachedData = this.pageCache.get(cacheKey);
      this.renderItems(cachedData.items, page === 1);
      this.updatePagination(cachedData.pagination);
      return cachedData;
    }

    this.setLoading(true);

    try {
      const url = new URL(this.apiEndpoint, window.location.origin);
      url.searchParams.set('page', page);
      url.searchParams.set('limit', this.pageSize);
      if (this.includeStats) {
        url.searchParams.set('includeStats', 'true');
      }

      const response = await fetch(url, {
        credentials: 'same-origin',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'max-age=180' // 3 minutes client cache
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to load data');
      }

      // Cache the result
      this.pageCache.set(cacheKey, {
        items: data.followers || data.following || [],
        pagination: data.pagination
      });

      // Render items
      const items = data.followers || data.following || [];
      this.renderItems(items, page === 1);
      this.updatePagination(data.pagination);

      return data;

    } catch (error) {
      console.error('LazyLoader: Error loading page', page, error);
      this.showError(error.message);
      throw error;
    } finally {
      this.setLoading(false);
    }
  }

  async loadMore() {
    if (!this.hasMore || this.isLoading) return;
    
    const nextPage = this.currentPage + 1;
    await this.loadPage(nextPage);
  }

  renderItems(items, clearContainer = false) {
    if (!this.container || !this.itemRenderer) return;

    if (clearContainer) {
      // Clear container but keep sentinel
      const children = Array.from(this.container.children);
      children.forEach(child => {
        if (!child.classList.contains('lazy-load-sentinel')) {
          child.remove();
        }
      });
      this.items = [];
    }

    // Render new items
    items.forEach(item => {
      const element = this.itemRenderer(item);
      if (element) {
        // Insert before sentinel if it exists
        if (this.sentinel) {
          this.container.insertBefore(element, this.sentinel);
        } else {
          this.container.appendChild(element);
        }
        this.items.push(item);
      }
    });

    // Update stats display
    this.updateStatsDisplay();
  }

  updatePagination(pagination) {
    this.currentPage = pagination.currentPage;
    this.totalPages = pagination.totalPages;
    this.hasMore = pagination.hasNext;

    // Update load more button
    if (this.loadMoreButton) {
      this.loadMoreButton.style.display = this.hasMore ? 'block' : 'none';
      this.loadMoreButton.textContent = this.hasMore ? 
        `Cargar más (${this.items.length} de ${pagination.total})` : 
        'No hay más elementos';
    }
  }

  updateStatsDisplay() {
    const statsElement = document.querySelector('.lazy-load-stats');
    if (statsElement) {
      statsElement.textContent = `Mostrando ${this.items.length} elementos`;
    }
  }

  setLoading(loading) {
    this.isLoading = loading;

    if (this.loadingIndicator) {
      this.loadingIndicator.style.display = loading ? 'block' : 'none';
    }

    if (this.loadMoreButton) {
      this.loadMoreButton.disabled = loading;
      this.loadMoreButton.textContent = loading ? 'Cargando...' : 'Cargar más';
    }

    // Add loading class to container
    if (this.container) {
      this.container.classList.toggle('loading', loading);
    }
  }

  showError(message) {
    const errorElement = document.createElement('div');
    errorElement.className = 'lazy-load-error alert alert-danger';
    errorElement.innerHTML = `
      <strong>Error:</strong> ${message}
      <button type="button" class="btn btn-sm btn-outline-danger ms-2" onclick="this.parentElement.remove()">
        Cerrar
      </button>
    `;

    if (this.container) {
      this.container.insertBefore(errorElement, this.container.firstChild);
    }

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (errorElement.parentElement) {
        errorElement.remove();
      }
    }, 5000);
  }

  // Toggle stats loading
  toggleStats() {
    this.includeStats = !this.includeStats;
    this.clearCache();
    this.loadPage(1);
  }

  // Clear cache and reload
  refresh() {
    this.clearCache();
    this.currentPage = 1;
    this.hasMore = true;
    this.loadPage(1);
  }

  clearCache() {
    this.pageCache.clear();
  }

  // Cleanup method
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
    if (this.sentinel && this.sentinel.parentElement) {
      this.sentinel.remove();
    }
    this.clearCache();
  }
}

// Export for use in other modules
window.LazyLoader = LazyLoader;

// Utility function to create a default item renderer for social lists
LazyLoader.createSocialListRenderer = function(options = {}) {
  const showStats = options.showStats !== false;
  const showFollowButton = options.showFollowButton !== false;
  const currentUserId = options.currentUserId;

  return function(item) {
    const div = document.createElement('div');
    div.className = 'list-group-item d-flex align-items-center justify-content-between';
    
    const profilePicUrl = item.profilePictureUrl || '/icons/icono_ftperfil_predeterminado.svg';
    
    let statsHtml = '';
    if (showStats && item.stats) {
      statsHtml = `
        <small class="text-muted">
          ${item.stats.reviewCount} reseñas • ⭐ ${item.stats.averageStars}
        </small>
      `;
    }

    let followButtonHtml = '';
    if (showFollowButton && item.relationship && currentUserId !== item.id) {
      const canUnfollow = item.relationship.canUnfollow;
      const isFollowed = item.relationship.isFollowedByCurrentUser;
      
      if (canUnfollow) {
        followButtonHtml = `
          <button class="btn btn-sm btn-outline-danger unfollow-btn" data-user-id="${item.id}">
            Dejar de seguir
          </button>
        `;
      } else if (!isFollowed) {
        followButtonHtml = `
          <button class="btn btn-sm btn-primary follow-btn" data-user-id="${item.id}">
            Seguir
          </button>
        `;
      }
    }

    div.innerHTML = `
      <div class="d-flex align-items-center">
        <img src="${profilePicUrl}" alt="${item.username}" 
             class="rounded-circle me-3 clickable-profile-pic" 
             data-user-id="${item.id}"
             style="width: 40px; height: 40px; object-fit: cover;">
        <div>
          <h6 class="mb-1">
            <span class="clickable-username" data-user-id="${item.id}">${item.username}</span>
          </h6>
          ${statsHtml}
          ${item.followedSince ? `<small class="text-muted">Siguiendo desde ${new Date(item.followedSince).toLocaleDateString()}</small>` : ''}
        </div>
      </div>
      <div class="d-flex align-items-center gap-2">
        ${followButtonHtml}
      </div>
    `;

    return div;
  };
};