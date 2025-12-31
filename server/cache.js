// Simple in-memory cache implementation for performance optimization
// This provides basic caching functionality without external dependencies

class MemoryCache {
  constructor(options = {}) {
    this.cache = new Map();
    this.defaultTTL = options.defaultTTL || 300000; // 5 minutes default
    this.maxSize = options.maxSize || 1000; // Maximum number of cached items
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0
    };
    
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 300000);
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {any|null} Cached value or null if not found/expired
   */
  get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      return null;
    }
    
    // Check if expired
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }
    
    // Update access time for LRU
    item.lastAccess = Date.now();
    this.stats.hits++;
    return item.value;
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds (optional)
   */
  set(key, value, ttl = this.defaultTTL) {
    // Evict oldest items if cache is full
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictOldest();
    }
    
    const expiry = Date.now() + ttl;
    const item = {
      value,
      expiry,
      lastAccess: Date.now(),
      createdAt: Date.now()
    };
    
    this.cache.set(key, item);
    this.stats.sets++;
  }

  /**
   * Delete value from cache
   * @param {string} key - Cache key
   * @returns {boolean} True if key existed and was deleted
   */
  delete(key) {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.deletes++;
    }
    return deleted;
  }

  /**
   * Clear all cached values
   */
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    this.stats.deletes += size;
  }

  /**
   * Get cache statistics
   * @returns {object} Cache statistics
   */
  getStats() {
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0
    };
  }

  /**
   * Check if key exists in cache (without updating access time)
   * @param {string} key - Cache key
   * @returns {boolean} True if key exists and is not expired
   */
  has(key) {
    const item = this.cache.get(key);
    if (!item) return false;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Get or set pattern - get value if exists, otherwise compute and cache
   * @param {string} key - Cache key
   * @param {function} computeFn - Function to compute value if not cached
   * @param {number} ttl - Time to live in milliseconds (optional)
   * @returns {Promise<any>} Cached or computed value
   */
  async getOrSet(key, computeFn, ttl = this.defaultTTL) {
    let value = this.get(key);
    
    if (value !== null) {
      return value;
    }
    
    // Compute new value
    value = await computeFn();
    this.set(key, value, ttl);
    return value;
  }

  /**
   * Remove expired entries from cache
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`Cache cleanup: removed ${cleaned} expired entries`);
    }
  }

  /**
   * Evict oldest accessed item to make room
   */
  evictOldest() {
    let oldestKey = null;
    let oldestTime = Date.now();
    
    for (const [key, item] of this.cache.entries()) {
      if (item.lastAccess < oldestTime) {
        oldestTime = item.lastAccess;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  /**
   * Destroy cache and cleanup intervals
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

// Create cache instances for different data types
export const profileCache = new MemoryCache({
  defaultTTL: 600000, // 10 minutes for profiles
  maxSize: 500
});

export const socialStatsCache = new MemoryCache({
  defaultTTL: 300000, // 5 minutes for social stats
  maxSize: 1000
});

export const topReviewsCache = new MemoryCache({
  defaultTTL: 900000, // 15 minutes for top reviews
  maxSize: 300
});

export const notificationCountCache = new MemoryCache({
  defaultTTL: 60000, // 1 minute for notification counts
  maxSize: 1000
});

// Export the cache class for custom instances
export { MemoryCache };

// Graceful shutdown cleanup
process.on('SIGTERM', () => {
  console.log('Cleaning up caches...');
  profileCache.destroy();
  socialStatsCache.destroy();
  topReviewsCache.destroy();
  notificationCountCache.destroy();
});

process.on('SIGINT', () => {
  console.log('Cleaning up caches...');
  profileCache.destroy();
  socialStatsCache.destroy();
  topReviewsCache.destroy();
  notificationCountCache.destroy();
});