/**
 * PerformanceMonitor - Simple client-side performance monitoring
 * Tracks page load times, API response times, and user interactions
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      pageLoad: null,
      apiCalls: new Map(),
      userInteractions: [],
      cacheHits: 0,
      cacheMisses: 0
    };
    
    this.init();
  }

  init() {
    // Monitor page load performance
    this.trackPageLoad();
    
    // Monitor API calls
    this.interceptFetch();
    
    // Monitor user interactions
    this.trackUserInteractions();
    
    // Send metrics periodically
    this.startMetricsReporting();
  }

  trackPageLoad() {
    if (window.performance && window.performance.timing) {
      window.addEventListener('load', () => {
        const timing = window.performance.timing;
        const pageLoadTime = timing.loadEventEnd - timing.navigationStart;
        const domContentLoadedTime = timing.domContentLoadedEventEnd - timing.navigationStart;
        const firstPaintTime = timing.responseStart - timing.navigationStart;

        this.metrics.pageLoad = {
          total: pageLoadTime,
          domContentLoaded: domContentLoadedTime,
          firstPaint: firstPaintTime,
          timestamp: Date.now()
        };

        console.log('Page Load Performance:', this.metrics.pageLoad);
      });
    }
  }

  interceptFetch() {
    const originalFetch = window.fetch;
    const self = this;

    window.fetch = function(...args) {
      const startTime = Date.now();
      const url = args[0];
      
      return originalFetch.apply(this, args)
        .then(response => {
          const endTime = Date.now();
          const duration = endTime - startTime;
          
          // Track API call performance
          self.trackApiCall(url, duration, response.status, response.ok);
          
          // Track cache hits/misses
          const cacheHeader = response.headers.get('X-Cache');
          if (cacheHeader === 'HIT') {
            self.metrics.cacheHits++;
          } else if (cacheHeader === 'MISS') {
            self.metrics.cacheMisses++;
          }
          
          return response;
        })
        .catch(error => {
          const endTime = Date.now();
          const duration = endTime - startTime;
          
          self.trackApiCall(url, duration, 0, false, error.message);
          throw error;
        });
    };
  }

  trackApiCall(url, duration, status, success, error = null) {
    const apiCall = {
      url: url.toString(),
      duration,
      status,
      success,
      error,
      timestamp: Date.now()
    };

    // Store in metrics
    if (!this.metrics.apiCalls.has(url)) {
      this.metrics.apiCalls.set(url, []);
    }
    this.metrics.apiCalls.get(url).push(apiCall);

    // Log slow API calls
    if (duration > 2000) {
      console.warn('Slow API call detected:', apiCall);
    }

    // Log failed API calls
    if (!success) {
      console.error('Failed API call:', apiCall);
    }
  }

  trackUserInteractions() {
    // Track clicks on social elements
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('clickable-username') || 
          e.target.classList.contains('clickable-profile-pic') ||
          e.target.classList.contains('follow-btn') ||
          e.target.classList.contains('unfollow-btn')) {
        
        this.metrics.userInteractions.push({
          type: 'click',
          element: e.target.className,
          timestamp: Date.now()
        });
      }
    });

    // Track modal opens
    document.addEventListener('shown.bs.modal', (e) => {
      this.metrics.userInteractions.push({
        type: 'modal_open',
        modal: e.target.id,
        timestamp: Date.now()
      });
    });
  }

  startMetricsReporting() {
    // Send metrics every 5 minutes
    setInterval(() => {
      this.sendMetrics();
    }, 300000);

    // Send metrics on page unload
    window.addEventListener('beforeunload', () => {
      this.sendMetrics(true);
    });
  }

  sendMetrics(isUnload = false) {
    const metricsData = {
      pageLoad: this.metrics.pageLoad,
      apiCalls: this.getApiCallsSummary(),
      userInteractions: this.metrics.userInteractions.length,
      cachePerformance: {
        hits: this.metrics.cacheHits,
        misses: this.metrics.cacheMisses,
        hitRate: this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) || 0
      },
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // Use sendBeacon for unload events, fetch for regular reporting
    if (isUnload && navigator.sendBeacon) {
      navigator.sendBeacon('/log-error', JSON.stringify({
        component: 'PerformanceMonitor',
        level: 'info',
        error: { metrics: metricsData }
      }));
    } else {
      // Send to existing error logging endpoint
      fetch('/log-error', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          component: 'PerformanceMonitor',
          level: 'info',
          error: { metrics: metricsData }
        })
      }).catch(err => {
        console.warn('Failed to send performance metrics:', err);
      });
    }

    // Reset interaction counter
    this.metrics.userInteractions = [];
  }

  getApiCallsSummary() {
    const summary = {};
    
    for (const [url, calls] of this.metrics.apiCalls.entries()) {
      const durations = calls.map(call => call.duration);
      const successCount = calls.filter(call => call.success).length;
      
      summary[url] = {
        count: calls.length,
        averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
        minDuration: Math.min(...durations),
        maxDuration: Math.max(...durations),
        successRate: successCount / calls.length,
        lastCall: Math.max(...calls.map(call => call.timestamp))
      };
    }
    
    return summary;
  }

  // Public method to get current metrics
  getMetrics() {
    return {
      ...this.metrics,
      apiCallsSummary: this.getApiCallsSummary()
    };
  }

  // Public method to log custom performance events
  logCustomEvent(eventName, data = {}) {
    this.metrics.userInteractions.push({
      type: 'custom',
      event: eventName,
      data,
      timestamp: Date.now()
    });
  }
}

// Initialize performance monitoring
const performanceMonitor = new PerformanceMonitor();

// Make it available globally for custom logging
window.performanceMonitor = performanceMonitor;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PerformanceMonitor;
}