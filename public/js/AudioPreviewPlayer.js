/**
 * AudioPreviewPlayer - Reproductor de muestras de audio para MusicBoxd
 * 
 * Componente que permite reproducir muestras de 30 segundos de álbumes
 * utilizando las preview URLs oficiales de Spotify.
 */

class AudioPreviewPlayer {
  constructor(containerId, albumId) {
    this.containerId = containerId;
    this.albumId = albumId;
    this.audioElement = null;
    this.currentTrack = null;
    this.state = 'stopped'; // 'stopped', 'loading', 'playing', 'paused', 'error'
    this.tracks = [];
    this.ui = null;
    
    // Performance optimizations
    this.tracksLoaded = false; // Lazy loading flag
    this.loadTracksPromise = null; // Promise caching for concurrent requests
    this.debounceTimers = new Map(); // Debouncing timers
    this.memoryCleanupInterval = null; // Memory cleanup interval
    
    // Singleton pattern - solo una instancia activa
    if (AudioPreviewPlayer.activeInstance) {
      AudioPreviewPlayer.activeInstance.destroy();
    }
    AudioPreviewPlayer.activeInstance = this;
    
    // Bind methods to maintain context
    this.handleAudioEnd = this.handleAudioEnd.bind(this);
    this.handleAudioError = this.handleAudioError.bind(this);
    this.handleAudioLoadStart = this.handleAudioLoadStart.bind(this);
    this.handleAudioCanPlay = this.handleAudioCanPlay.bind(this);
    
    // Start memory cleanup monitoring
    this.startMemoryCleanup();
  }

  /**
   * Inicializa el reproductor con lazy loading
   */
  async initialize() {
    try {
      
      // Crear UI component
      this.ui = new AudioPreviewUI(this);
      this.ui.render();
      
      // No cargar tracks inmediatamente - usar lazy loading
      // Los tracks se cargarán cuando el usuario haga clic en play
      
      return true;
    } catch (error) {
      console.error('Error inicializando AudioPreviewPlayer:', error);
      this.handleError(error);
      return false;
    }
  }

  /**
   * Carga los tracks del álbum con cache de sesión y lazy loading
   * Requisito: 1.2, 1.3 - Obtener y validar tracks con preview_url (optimizado)
   */
  async loadTracks() {
    try {
      // Si ya están cargados, no hacer nada
      if (this.tracksLoaded && this.tracks.length > 0) {
        return;
      }
      
      // Si ya hay una promesa de carga en progreso, reutilizarla
      if (this.loadTracksPromise) {
        return await this.loadTracksPromise;
      }
      
      // Verificar cache de sesión primero
      const cachedTracks = AudioPreviewPlayer.getFromSessionCache(this.albumId);
      if (cachedTracks) {
        this.tracks = cachedTracks;
        this.tracksLoaded = true;
        this.setState('stopped');
        return;
      }
      
      // Crear promesa de carga para evitar requests duplicados
      this.loadTracksPromise = this._performTracksLoad();
      
      try {
        await this.loadTracksPromise;
      } finally {
        // Limpiar la promesa cuando termine (exitosa o con error)
        this.loadTracksPromise = null;
      }
      
    } catch (error) {
      console.error('Error cargando tracks:', error);
      this.loadTracksPromise = null;
      
      // Determinar si es error de red o de API
      const context = error.message.includes('fetch') || error.name === 'TypeError' ? 
        'network' : 'spotify_api';
      
      this.handleError(error, context);
    }
  }

  /**
   * Realiza la carga real de tracks desde la API
   * @private
   */
  async _performTracksLoad() {
    this.setState('loading');
    
    const response = await fetch(`${API_BASE_URL}/album/${this.albumId}/tracks`, {
      credentials: 'include',
      timeout: 10000 // 10 segundos timeout
    });
    
    if (!response.ok) {
      const errorMessage = `Error ${response.status}: ${response.statusText}`;
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    
    if (!data.tracks || !Array.isArray(data.tracks)) {
      throw new Error('Formato de respuesta inválido del servidor');
    }
    
    this.tracks = data.tracks;
    this.tracksLoaded = true;
    
    // Guardar en cache de sesión
    AudioPreviewPlayer.saveToSessionCache(this.albumId, this.tracks);
    
    // Verificar si hay tracks con preview disponible
    const tracksWithPreview = this.tracks.filter(track => track.available);
    
    if (tracksWithPreview.length === 0) {
      // Este es un caso especial - no es un error técnico sino falta de contenido
      this.handleError(new Error('No hay muestras de audio disponibles'), 'no_preview');
      return;
    }
    
    this.setState('stopped');
    
    // Reset retry counter en caso de éxito
    this.retryCount = 0;
    this.isRecovering = false;
  }

  /**
   * Inicia la reproducción con debouncing y lazy loading
   * Requisitos: 1.3, 1.4 - Selección aleatoria y reproducción (optimizado)
   */
  async play() {
    // Implementar debouncing para evitar múltiples clics rápidos
    const debouncedPlay = this.debounce('play', async () => {
      try {
        // Detener cualquier reproducción anterior (Requisito 5.1)
        this.stop();
        
        // Lazy loading: cargar tracks solo cuando se necesiten
        if (!this.tracksLoaded) {
          await this.loadTracks();
        }
        
        // Verificar que tenemos tracks disponibles
        if (!this.tracks || this.tracks.length === 0) {
          throw new Error('No hay tracks cargados. Reintentando carga...');
        }
        
        // Seleccionar track aleatorio con preview disponible
        const selectedTrack = this.selectRandomTrack();
        if (!selectedTrack) {
          throw new Error('No hay tracks disponibles para reproducir');
        }
        
        this.currentTrack = selectedTrack;
        this.setState('loading');
        
        // Crear elemento de audio
        this.createAudioElement();
        
        // Validar URL de preview antes de usarla
        if (!selectedTrack.preview_url || !this.isValidPreviewUrl(selectedTrack.preview_url)) {
          throw new Error(`URL de preview inválida para track: ${selectedTrack.name}`);
        }
        
        // Configurar URL de audio
        this.audioElement.src = selectedTrack.preview_url;
        
        // Intentar reproducir con timeout
        const playPromise = this.audioElement.play();
        
        if (playPromise !== undefined) {
          // Agregar timeout para la reproducción
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout al iniciar reproducción')), 5000);
          });
          
          await Promise.race([playPromise, timeoutPromise]);
          this.setState('playing');
          
          // Reset retry counter en caso de éxito
          this.retryCount = 0;
          this.isRecovering = false;
        }
        
      } catch (error) {
        console.error('Error al reproducir:', error);
        
        // Determinar contexto del error
        let context = 'audio';
        if (error.message.includes('tracks') || error.message.includes('carga')) {
          context = 'network';
        } else if (error.message.includes('preview') || error.message.includes('URL')) {
          context = 'no_preview';
        }
        
        this.handleError(error, context);
      }
    }, 300); // 300ms debounce
    
    return debouncedPlay();
  }

  /**
   * Valida que una URL de preview sea válida
   */
  isValidPreviewUrl(url) {
    if (!url || typeof url !== 'string') {
      return false;
    }
    
    // Verificar que sea una URL de Spotify válida
    const spotifyPreviewPattern = /^https:\/\/p\.scdn\.co\/mp3-preview\//;
    return spotifyPreviewPattern.test(url);
  }

  /**
   * Pausa la reproducción actual
   * Requisito: 2.3 - Control de pausa inmediato
   */
  pause() {
    if (this.audioElement && this.state === 'playing') {
      this.audioElement.pause();
      this.setState('paused');
    }
  }

  /**
   * Reanuda la reproducción pausada
   * Requisito: 2.4 - Reanudar desde posición actual
   */
  resume() {
    if (this.audioElement && this.state === 'paused') {
      this.audioElement.play()
        .then(() => {
          this.setState('playing');
        })
        .catch(error => {
          console.error('Error al reanudar:', error);
          this.handleError(error);
        });
    }
  }

  /**
   * Detiene la reproducción y reinicia la posición
   * Requisito: 2.5 - Detener y reiniciar posición
   */
  stop() {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
      this.cleanupAudioElement();
    }
    
    this.currentTrack = null;
    this.setState('stopped');
  }

  /**
   * Destruye el reproductor y limpia recursos de manera optimizada
   * Requisitos: 5.2, 5.3 - Limpieza automática durante navegación (optimizado)
   */
  destroy() {
    // Detener reproducción
    this.stop();
    
    // Limpiar estado de recuperación
    this.isRecovering = false;
    this.retryCount = 0;
    
    // Limpiar timers de debouncing
    this.clearAllDebounceTimers();
    
    // Detener monitoreo de memoria
    this.stopMemoryCleanup();
    
    // Limpiar UI
    if (this.ui) {
      this.ui.destroy();
      this.ui = null;
    }
    
    // Limpiar cache de promesas
    this.loadTracksPromise = null;
    
    // Limpiar referencia singleton
    if (AudioPreviewPlayer.activeInstance === this) {
      AudioPreviewPlayer.activeInstance = null;
    }
    
    // Limpiar propiedades para liberar memoria
    this.tracks = [];
    this.currentTrack = null;
    this.containerId = null;
    this.albumId = null;
    this.tracksLoaded = false;
    
    // Forzar garbage collection si está disponible (solo en desarrollo)
    if (window.gc && typeof window.gc === 'function') {
      setTimeout(() => window.gc(), 100);
    }
  }

  /**
   * Implementa debouncing para evitar llamadas excesivas
   * @param {string} key - Clave única para el timer
   * @param {Function} func - Función a ejecutar
   * @param {number} delay - Delay en milisegundos
   * @returns {Function} Función debounced
   */
  debounce(key, func, delay) {
    return (...args) => {
      // Limpiar timer anterior si existe
      if (this.debounceTimers.has(key)) {
        clearTimeout(this.debounceTimers.get(key));
      }
      
      // Crear nuevo timer
      const timerId = setTimeout(() => {
        this.debounceTimers.delete(key);
        func.apply(this, args);
      }, delay);
      
      this.debounceTimers.set(key, timerId);
      
      // Retornar promesa para poder usar await
      return new Promise((resolve, reject) => {
        const originalTimer = this.debounceTimers.get(key);
        this.debounceTimers.set(key, setTimeout(async () => {
          this.debounceTimers.delete(key);
          try {
            const result = await func.apply(this, args);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        }, delay));
        
        // Limpiar el timer original
        if (originalTimer) {
          clearTimeout(originalTimer);
        }
      });
    };
  }

  /**
   * Limpia todos los timers de debouncing
   */
  clearAllDebounceTimers() {
    for (const [key, timerId] of this.debounceTimers) {
      clearTimeout(timerId);
    }
    this.debounceTimers.clear();
  }

  /**
   * Inicia el monitoreo de limpieza de memoria
   */
  startMemoryCleanup() {
    // Limpiar interval anterior si existe
    if (this.memoryCleanupInterval) {
      clearInterval(this.memoryCleanupInterval);
    }
    
    // Ejecutar limpieza cada 5 minutos
    this.memoryCleanupInterval = setInterval(() => {
      this.performMemoryCleanup();
    }, 5 * 60 * 1000); // 5 minutos
  }

  /**
   * Detiene el monitoreo de limpieza de memoria
   */
  stopMemoryCleanup() {
    if (this.memoryCleanupInterval) {
      clearInterval(this.memoryCleanupInterval);
      this.memoryCleanupInterval = null;
    }
  }

  /**
   * Realiza limpieza de memoria periódica
   */
  performMemoryCleanup() {
    try {
      // Limpiar cache de sesión si es muy grande
      AudioPreviewPlayer.cleanupSessionCache();
      
      // Limpiar referencias circulares si las hay
      if (this.audioElement && !this.isPlaying()) {
        this.cleanupAudioElement();
      }
      
      // Log de uso de memoria si está disponible
      if (performance.memory) {
        const memInfo = performance.memory;
        const usedMB = Math.round(memInfo.usedJSHeapSize / 1024 / 1024);
        const totalMB = Math.round(memInfo.totalJSHeapSize / 1024 / 1024);
        
        // Si el uso de memoria es muy alto, forzar limpieza más agresiva
        if (usedMB > 50) { // 50MB threshold
          this.performAggressiveCleanup();
        }
      }
    } catch (error) {
      console.warn('Error en limpieza de memoria:', error);
    }
  }

  /**
   * Realiza limpieza agresiva de memoria cuando es necesario
   */
  performAggressiveCleanup() {
    // Limpiar cache completo
    AudioPreviewPlayer.clearSessionCache();
    
    // Resetear estado si no está reproduciendo
    if (!this.isPlaying()) {
      this.tracks = [];
      this.tracksLoaded = false;
      this.currentTrack = null;
    }
    
    // Limpiar todos los timers
    this.clearAllDebounceTimers();
  }

  /**
   * Selecciona un track aleatorio que tenga preview disponible
   * Requisito: 1.3 - Selección aleatoria de tracks válidos
   */
  selectRandomTrack() {
    const availableTracks = this.tracks.filter(track => track.available);
    
    if (availableTracks.length === 0) {
      return null;
    }
    
    const randomIndex = Math.floor(Math.random() * availableTracks.length);
    return availableTracks[randomIndex];
  }

  /**
   * Crea y configura el elemento de audio
   */
  createAudioElement() {
    this.cleanupAudioElement();
    
    this.audioElement = new Audio();
    this.audioElement.preload = 'metadata';
    this.audioElement.volume = 1.0;
    
    // Event listeners
    this.audioElement.addEventListener('ended', this.handleAudioEnd);
    this.audioElement.addEventListener('error', this.handleAudioError);
    this.audioElement.addEventListener('loadstart', this.handleAudioLoadStart);
    this.audioElement.addEventListener('canplay', this.handleAudioCanPlay);
    this.audioElement.addEventListener('timeupdate', () => {
      if (this.ui) {
        this.ui.updateProgress();
      }
    });
  }

  /**
   * Limpia el elemento de audio y sus event listeners
   */
  cleanupAudioElement() {
    if (this.audioElement) {
      this.audioElement.removeEventListener('ended', this.handleAudioEnd);
      this.audioElement.removeEventListener('error', this.handleAudioError);
      this.audioElement.removeEventListener('loadstart', this.handleAudioLoadStart);
      this.audioElement.removeEventListener('canplay', this.handleAudioCanPlay);
      this.audioElement.src = '';
      this.audioElement = null;
    }
  }

  /**
   * Maneja el final de la reproducción
   * Requisito: 3.4 - Volver al estado inicial al completar
   */
  handleAudioEnd() {
    this.setState('stopped');
    this.currentTrack = null;
    this.cleanupAudioElement();
  }

  /**
   * Maneja errores de audio
   */
  handleAudioError(event) {
    console.error('Error de audio:', event);
    this.handleError(new Error('Error al reproducir el audio'));
  }

  /**
   * Maneja el inicio de carga del audio
   */
  handleAudioLoadStart() {
    // Audio loading started
  }

  /**
   * Maneja cuando el audio está listo para reproducir
   */
  handleAudioCanPlay() {
    // Audio ready to play
  }

  /**
   * Actualiza el estado del reproductor
   */
  setState(newState) {
    const oldState = this.state;
    this.state = newState;
    
    // Actualizar UI
    if (this.ui) {
      this.ui.updateState();
    }
  }

  /**
   * Maneja errores del reproductor con sistema robusto de recuperación
   * Requisitos: 6.1, 6.2, 6.3, 6.4, 6.5
   */
  handleError(error, context = 'general') {
    // Logging detallado para debugging
    const errorInfo = {
      message: error.message || 'Error desconocido',
      context: context,
      albumId: this.albumId,
      currentTrack: this.currentTrack ? this.currentTrack.name : null,
      state: this.state,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    console.error('Error en AudioPreviewPlayer:', errorInfo);
    
    // Determinar tipo de error y estrategia de recuperación
    const errorType = this.categorizeError(error, context);
    const recoveryStrategy = this.getRecoveryStrategy(errorType);
    
    // Intentar recuperación automática si es posible
    if (recoveryStrategy.canRecover && !this.isRecovering) {
      this.attemptRecovery(errorType, recoveryStrategy, errorInfo);
    } else {
      // Mostrar error al usuario con mensaje user-friendly
      this.showUserFriendlyError(errorType, errorInfo);
      this.setState('error');
    }
  }

  /**
   * Categoriza el tipo de error para determinar estrategia de recuperación
   */
  categorizeError(error, context) {
    const message = error.message.toLowerCase();
    
    // Errores de red
    if (message.includes('fetch') || message.includes('network') || 
        message.includes('timeout') || context === 'network') {
      return 'NETWORK_ERROR';
    }
    
    // Errores de API de Spotify
    if (context === 'spotify_api' || message.includes('spotify') || 
        message.includes('401') || message.includes('403')) {
      return 'SPOTIFY_API_ERROR';
    }
    
    // Errores de audio/reproducción
    if (message.includes('audio') || message.includes('play') || 
        context === 'audio' || error.name === 'NotAllowedError') {
      return 'AUDIO_ERROR';
    }
    
    // No hay tracks con preview
    if (message.includes('preview') || message.includes('tracks') || 
        context === 'no_preview') {
      return 'NO_PREVIEW_ERROR';
    }
    
    // Error general
    return 'GENERAL_ERROR';
  }

  /**
   * Obtiene la estrategia de recuperación para cada tipo de error
   */
  getRecoveryStrategy(errorType) {
    const strategies = {
      NETWORK_ERROR: {
        canRecover: true,
        maxRetries: 3,
        retryDelay: 2000,
        exponentialBackoff: true,
        fallbackMessage: 'Problema de conexión. Reintentando...'
      },
      SPOTIFY_API_ERROR: {
        canRecover: true,
        maxRetries: 2,
        retryDelay: 3000,
        exponentialBackoff: false,
        fallbackMessage: 'Error del servicio de música. Reintentando...'
      },
      AUDIO_ERROR: {
        canRecover: false,
        maxRetries: 0,
        fallbackMessage: 'No se puede reproducir audio en este navegador'
      },
      NO_PREVIEW_ERROR: {
        canRecover: false,
        maxRetries: 0,
        fallbackMessage: 'Este álbum no tiene muestras de audio disponibles'
      },
      GENERAL_ERROR: {
        canRecover: false,
        maxRetries: 0,
        fallbackMessage: 'Error inesperado en el reproductor'
      }
    };
    
    return strategies[errorType] || strategies.GENERAL_ERROR;
  }

  /**
   * Intenta recuperación automática del error
   */
  async attemptRecovery(errorType, strategy, errorInfo) {
    this.isRecovering = true;
    this.retryCount = (this.retryCount || 0) + 1;
    
    if (this.retryCount > strategy.maxRetries) {
      console.error('Máximo de reintentos alcanzado', errorInfo);
      this.isRecovering = false;
      this.retryCount = 0;
      this.showUserFriendlyError(errorType, errorInfo);
      this.setState('error');
      return;
    }
    
    // Mostrar mensaje de reintento al usuario
    if (this.ui) {
      this.ui.showRetryMessage(strategy.fallbackMessage, this.retryCount, strategy.maxRetries);
    }
    
    // Calcular delay con backoff exponencial si está habilitado
    const delay = strategy.exponentialBackoff ? 
      strategy.retryDelay * Math.pow(2, this.retryCount - 1) : 
      strategy.retryDelay;
    
    // Esperar antes del reintento
    await new Promise(resolve => setTimeout(resolve, delay));
    
    try {
      // Intentar recuperación según el tipo de error
      await this.executeRecovery(errorType);
      
      // Si llegamos aquí, la recuperación fue exitosa
      this.isRecovering = false;
      this.retryCount = 0;
      
      if (this.ui) {
        this.ui.hideRetryMessage();
        this.ui.showSuccessMessage('Conexión restaurada');
      }
      
    } catch (recoveryError) {
      console.error(`Fallo en recuperación ${this.retryCount}:`, recoveryError);
      // Recursivamente intentar de nuevo
      await this.attemptRecovery(errorType, strategy, errorInfo);
    }
  }

  /**
   * Ejecuta la lógica de recuperación específica para cada tipo de error
   */
  async executeRecovery(errorType) {
    switch (errorType) {
      case 'NETWORK_ERROR':
      case 'SPOTIFY_API_ERROR':
        // Reintentar carga de tracks
        await this.loadTracks();
        break;
        
      case 'AUDIO_ERROR':
        // Intentar con otro track si hay disponibles
        if (this.tracks && this.tracks.length > 0) {
          const newTrack = this.selectRandomTrack();
          if (newTrack && newTrack.id !== this.currentTrack?.id) {
            this.currentTrack = newTrack;
            await this.play();
          } else {
            throw new Error('No hay tracks alternativos disponibles');
          }
        } else {
          throw new Error('No hay tracks para reintentar');
        }
        break;
        
      default:
        throw new Error(`No hay estrategia de recuperación para ${errorType}`);
    }
  }

  /**
   * Muestra mensaje de error user-friendly al usuario
   */
  showUserFriendlyError(errorType, errorInfo) {
    const userMessages = {
      NETWORK_ERROR: 'Sin conexión a internet. Verifica tu conexión y vuelve a intentar.',
      SPOTIFY_API_ERROR: 'El servicio de música no está disponible temporalmente. Intenta más tarde.',
      AUDIO_ERROR: 'Tu navegador no puede reproducir este audio. Intenta actualizar la página.',
      NO_PREVIEW_ERROR: 'Este álbum no tiene muestras de audio disponibles.',
      GENERAL_ERROR: 'Ocurrió un error inesperado. Intenta recargar la página.'
    };
    
    const message = userMessages[errorType] || userMessages.GENERAL_ERROR;
    
    if (this.ui) {
      this.ui.showError(message);
    }
    
    // Log adicional para debugging en producción
    if (window.location.hostname !== 'localhost') {
      this.logErrorToServer(errorInfo);
    }
  }

  /**
   * Envía logs de error al servidor para monitoreo (opcional)
   */
  async logErrorToServer(errorInfo) {
    try {
      await fetch(`${API_BASE_URL}/log-error`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          component: 'AudioPreviewPlayer',
          error: errorInfo,
          level: 'error'
        })
      });
    } catch (logError) {
      // Fallar silenciosamente si no se puede enviar el log
      console.warn('No se pudo enviar log de error al servidor:', logError);
    }
  }

  /**
   * Obtiene el tiempo actual de reproducción
   */
  getCurrentTime() {
    return this.audioElement ? this.audioElement.currentTime : 0;
  }

  /**
   * Obtiene la duración total (siempre 30 segundos para previews)
   */
  getDuration() {
    return 30; // Las previews de Spotify son siempre de 30 segundos
  }

  /**
   * Verifica si el reproductor está reproduciendo
   */
  isPlaying() {
    return this.state === 'playing';
  }

  /**
   * Verifica si el reproductor está pausado
   */
  isPaused() {
    return this.state === 'paused';
  }

  /**
   * Verifica si el reproductor está cargando
   */
  isLoading() {
    return this.state === 'loading';
  }

  /**
   * Verifica si hay un error
   */
  hasError() {
    return this.state === 'error';
  }

  // ============================================================================
  // MÉTODOS ESTÁTICOS PARA CACHE DE SESIÓN
  // ============================================================================

  /**
   * Obtiene datos del cache de sesión
   * @param {string} albumId - ID del álbum
   * @returns {Array|null} Tracks cacheados o null
   */
  static getFromSessionCache(albumId) {
    try {
      const cacheKey = `audioPreview_tracks_${albumId}`;
      const cached = sessionStorage.getItem(cacheKey);
      
      if (!cached) {
        return null;
      }
      
      const parsedCache = JSON.parse(cached);
      
      // Verificar que el cache no sea muy viejo (30 minutos)
      const cacheAge = Date.now() - parsedCache.timestamp;
      const maxAge = 30 * 60 * 1000; // 30 minutos
      
      if (cacheAge > maxAge) {
        sessionStorage.removeItem(cacheKey);
        return null;
      }
      
      return parsedCache.tracks;
    } catch (error) {
      console.warn('Error leyendo cache de sesión:', error);
      return null;
    }
  }

  /**
   * Guarda datos en el cache de sesión
   * @param {string} albumId - ID del álbum
   * @param {Array} tracks - Tracks a cachear
   */
  static saveToSessionCache(albumId, tracks) {
    try {
      const cacheKey = `audioPreview_tracks_${albumId}`;
      const cacheData = {
        tracks: tracks,
        timestamp: Date.now(),
        albumId: albumId
      };
      
      sessionStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Error guardando en cache de sesión:', error);
      // Si sessionStorage está lleno, limpiar cache viejo
      if (error.name === 'QuotaExceededError') {
        AudioPreviewPlayer.cleanupSessionCache();
        // Intentar guardar de nuevo
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(cacheData));
        } catch (retryError) {
          console.warn('Error en segundo intento de cache:', retryError);
        }
      }
    }
  }

  /**
   * Limpia el cache de sesión de entradas viejas
   */
  static cleanupSessionCache() {
    try {
      const keysToRemove = [];
      const maxAge = 30 * 60 * 1000; // 30 minutos
      
      // Buscar todas las claves de cache de audio preview
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith('audioPreview_tracks_')) {
          try {
            const cached = sessionStorage.getItem(key);
            if (cached) {
              const parsedCache = JSON.parse(cached);
              const cacheAge = Date.now() - parsedCache.timestamp;
              
              if (cacheAge > maxAge) {
                keysToRemove.push(key);
              }
            }
          } catch (parseError) {
            // Si no se puede parsear, marcar para eliminación
            keysToRemove.push(key);
          }
        }
      }
      
      // Eliminar claves viejas
      keysToRemove.forEach(key => {
        sessionStorage.removeItem(key);
      });
      
    } catch (error) {
      console.warn('Error limpiando cache de sesión:', error);
    }
  }

  /**
   * Limpia todo el cache de sesión de audio preview
   */
  static clearSessionCache() {
    try {
      const keysToRemove = [];
      
      // Buscar todas las claves de cache de audio preview
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith('audioPreview_tracks_')) {
          keysToRemove.push(key);
        }
      }
      
      // Eliminar todas las claves
      keysToRemove.forEach(key => {
        sessionStorage.removeItem(key);
      });
      
    } catch (error) {
      console.warn('Error limpiando cache completo:', error);
    }
  }

  /**
   * Obtiene estadísticas del cache de sesión
   * @returns {Object} Estadísticas del cache
   */
  static getCacheStats() {
    try {
      let totalEntries = 0;
      let totalSize = 0;
      let oldestEntry = Date.now();
      let newestEntry = 0;
      
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith('audioPreview_tracks_')) {
          totalEntries++;
          const cached = sessionStorage.getItem(key);
          if (cached) {
            totalSize += cached.length;
            try {
              const parsedCache = JSON.parse(cached);
              if (parsedCache.timestamp < oldestEntry) {
                oldestEntry = parsedCache.timestamp;
              }
              if (parsedCache.timestamp > newestEntry) {
                newestEntry = parsedCache.timestamp;
              }
            } catch (parseError) {
              // Ignorar entradas corruptas
            }
          }
        }
      }
      
      return {
        totalEntries,
        totalSizeKB: Math.round(totalSize / 1024),
        oldestEntryAge: totalEntries > 0 ? Date.now() - oldestEntry : 0,
        newestEntryAge: totalEntries > 0 ? Date.now() - newestEntry : 0
      };
    } catch (error) {
      console.warn('Error obteniendo estadísticas de cache:', error);
      return {
        totalEntries: 0,
        totalSizeKB: 0,
        oldestEntryAge: 0,
        newestEntryAge: 0
      };
    }
  }
}

// Referencia estática para singleton pattern
AudioPreviewPlayer.activeInstance = null;

// Limpiar instancia activa cuando se navega fuera de la página
window.addEventListener('beforeunload', () => {
  if (AudioPreviewPlayer.activeInstance) {
    AudioPreviewPlayer.activeInstance.destroy();
  }
});

// Optimización: pausar actualizaciones cuando la página no es visible
document.addEventListener('visibilitychange', () => {
  if (AudioPreviewPlayer.activeInstance) {
    const player = AudioPreviewPlayer.activeInstance;
    
    if (document.visibilityState === 'hidden') {
      // Página oculta: pausar actualizaciones para ahorrar recursos
      if (player.ui) {
        player.ui.stopProgressUpdates();
      }
    } else if (document.visibilityState === 'visible') {
      // Página visible: reanudar actualizaciones si está reproduciendo
      if (player.isPlaying() && player.ui) {
        player.ui.startProgressUpdates();
      }
    }
  }
});

// Limpieza periódica del cache de sesión
setInterval(() => {
  AudioPreviewPlayer.cleanupSessionCache();
}, 10 * 60 * 1000); // Cada 10 minutos

// Exportar para uso global
window.AudioPreviewPlayer = AudioPreviewPlayer;