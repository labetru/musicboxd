/**
 * AudioPreviewUI - Componente de interfaz para el reproductor de audio
 * 
 * Maneja la interfaz de usuario del reproductor de muestras de audio,
 * incluyendo controles, indicadores de progreso y visualización de información.
 */

class AudioPreviewUI {
  constructor(player) {
    this.player = player;
    this.elements = {};
    this.progressInterval = null;
    this.debounceTimers = new Map(); // Para debouncing de interacciones
    
    // Bind methods to maintain context
    this.handlePlayButtonClick = this.handlePlayButtonClick.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  /**
   * Renderiza la interfaz del reproductor
   * Requisitos: 2.1, 3.5 - Mostrar controles y posicionar en vista de álbum
   */
  render() {
    const container = document.getElementById(this.player.containerId);
    if (!container) {
      console.error(`Container ${this.player.containerId} no encontrado`);
      return;
    }

    // HTML del reproductor usando el icono existente
    const playerHTML = `
      <div class="audio-preview-player" 
           id="audioPreviewPlayer" 
           role="region" 
           aria-label="Reproductor de muestra de audio"
           aria-describedby="audioPreviewDescription">
        
        <!-- Descripción oculta para lectores de pantalla -->
        <div id="audioPreviewDescription" class="sr-only">
          Reproductor de muestras de audio de 30 segundos. 
          Use Enter o Espacio para reproducir/pausar, P para play/pause, S para detener, Escape para detener y quitar foco.
        </div>
        
        <div class="audio-preview-main">
          <button class="btn-audio-preview" 
                  id="audioPreviewBtn" 
                  type="button"
                  aria-label="Reproducir muestra de audio del álbum"
                  aria-describedby="audioPreviewHelp"
                  title="Reproducir muestra de audio (Enter, Espacio o P)"
                  tabindex="0">
            <img src="/icons/icono_reproducirMuestra.svg" 
                 alt="" 
                 class="audio-preview-icon"
                 aria-hidden="true"
                 role="presentation">
            <span class="audio-preview-text" 
                  id="audioPreviewText" 
                  aria-live="polite">Escuchar muestra</span>
          </button>
          
          <!-- Ayuda contextual oculta -->
          <div id="audioPreviewHelp" class="sr-only">
            Controles de teclado: Enter o Espacio para reproducir/pausar, P para play/pause, S para detener, Escape para detener y quitar foco
          </div>
        </div>
        
        <!-- Información de reproducción (oculta inicialmente) -->
        <div class="audio-preview-info" 
             id="audioPreviewInfo" 
             style="display: none;"
             role="status"
             aria-live="polite"
             aria-atomic="true">
          <div class="track-info" role="group" aria-label="Información de la canción">
            <span class="track-name" 
                  id="currentTrackName" 
                  aria-label="Canción actual"
                  role="text"></span>
            <span class="track-duration" 
                  aria-label="Duración de la muestra"
                  role="text">0:30</span>
          </div>
          <div class="progress-container" role="group" aria-label="Progreso de reproducción">
            <div class="progress-bar" 
                 id="progressBar" 
                 role="progressbar" 
                 aria-valuemin="0" 
                 aria-valuemax="30" 
                 aria-valuenow="0"
                 aria-valuetext="0 segundos de 30 segundos"
                 aria-label="Progreso de reproducción de la muestra"
                 tabindex="0">
              <div class="progress-fill" 
                   id="progressFill" 
                   aria-hidden="true"></div>
            </div>
            <span class="time-display" 
                  id="timeDisplay" 
                  aria-label="Tiempo transcurrido"
                  aria-live="off"
                  role="timer">0:00</span>
          </div>
        </div>

        <!-- Mensaje de error (oculto inicialmente) -->
        <div class="audio-preview-error" 
             id="audioPreviewError" 
             style="display: none;"
             role="alert"
             aria-live="assertive"
             aria-atomic="true">
          <span class="error-icon" 
                aria-hidden="true" 
                role="presentation">⚠️</span>
          <span class="error-message" 
                id="errorMessage"
                role="text"></span>
        </div>
        
        <!-- Estado de carga anunciado para lectores de pantalla -->
        <div id="loadingAnnouncement" 
             class="sr-only" 
             aria-live="assertive" 
             aria-atomic="true"></div>
      </div>
    `;

    // Insertar HTML en el container
    container.insertAdjacentHTML('beforeend', playerHTML);

    // Obtener referencias a elementos
    this.elements = {
      player: document.getElementById('audioPreviewPlayer'),
      button: document.getElementById('audioPreviewBtn'),
      buttonText: document.getElementById('audioPreviewText'),
      icon: container.querySelector('.audio-preview-icon'),
      info: document.getElementById('audioPreviewInfo'),
      trackName: document.getElementById('currentTrackName'),
      progressBar: document.getElementById('progressBar'),
      progressFill: document.getElementById('progressFill'),
      timeDisplay: document.getElementById('timeDisplay'),
      error: document.getElementById('audioPreviewError'),
      errorMessage: document.getElementById('errorMessage'),
      loadingAnnouncement: document.getElementById('loadingAnnouncement')
    };

    // Agregar event listeners
    this.setupEventListeners();

    // Aplicar estilos CSS
    this.applyStyles();
  }

  /**
   * Configura los event listeners
   */
  setupEventListeners() {
    if (this.elements.button) {
      this.elements.button.addEventListener('click', this.handlePlayButtonClick);
      this.elements.button.addEventListener('keydown', this.handleKeyDown);
      
      // Mejorar accesibilidad con eventos de foco
      this.elements.button.addEventListener('focus', this.handleFocus.bind(this));
      this.elements.button.addEventListener('blur', this.handleBlur.bind(this));
    }

    // Agregar soporte de teclado a la barra de progreso
    if (this.elements.progressBar) {
      this.elements.progressBar.addEventListener('keydown', this.handleProgressBarKeyDown.bind(this));
      this.elements.progressBar.addEventListener('focus', this.handleProgressBarFocus.bind(this));
      this.elements.progressBar.addEventListener('blur', this.handleProgressBarBlur.bind(this));
    }

    // Agregar soporte global de teclado cuando el reproductor tiene foco
    document.addEventListener('keydown', this.handleGlobalKeyDown.bind(this));
  }

  /**
   * Maneja el foco en el botón principal
   */
  handleFocus(event) {
    // Anunciar el estado actual para lectores de pantalla
    this.announceCurrentState();
  }

  /**
   * Maneja la pérdida de foco del botón principal
   */
  handleBlur(event) {
    // Limpiar anuncios temporales
    if (this.elements.loadingAnnouncement) {
      this.elements.loadingAnnouncement.textContent = '';
    }
  }

  /**
   * Maneja la navegación por teclado en la barra de progreso
   */
  handleProgressBarKeyDown(event) {
    if (!this.player.audioElement) return;

    const currentTime = this.player.getCurrentTime();
    const duration = this.player.getDuration();
    let newTime = currentTime;

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        newTime = Math.max(0, currentTime - 5); // Retroceder 5 segundos
        break;
      
      case 'ArrowRight':
        event.preventDefault();
        newTime = Math.min(duration, currentTime + 5); // Avanzar 5 segundos
        break;
      
      case 'Home':
        event.preventDefault();
        newTime = 0; // Ir al inicio
        break;
      
      case 'End':
        event.preventDefault();
        newTime = duration; // Ir al final
        break;
      
      default:
        return;
    }

    // Actualizar tiempo de reproducción
    this.player.audioElement.currentTime = newTime;
    this.updateProgress();
    
    // Anunciar nueva posición
    const minutes = Math.floor(newTime / 60);
    const seconds = Math.floor(newTime % 60);
    const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    this.announceToScreenReader(`Posición: ${timeString} de 0:30`);
  }

  /**
   * Maneja el foco en la barra de progreso
   */
  handleProgressBarFocus(event) {
    const currentTime = this.player.getCurrentTime();
    const minutes = Math.floor(currentTime / 60);
    const seconds = Math.floor(currentTime % 60);
    const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    this.announceToScreenReader(
      `Barra de progreso enfocada. Posición actual: ${timeString} de 0:30. ` +
      `Use las flechas izquierda y derecha para navegar, Inicio para ir al principio, Fin para ir al final.`
    );
  }

  /**
   * Maneja la pérdida de foco de la barra de progreso
   */
  handleProgressBarBlur(event) {
    // Limpiar anuncios de navegación
    if (this.elements.loadingAnnouncement) {
      this.elements.loadingAnnouncement.textContent = '';
    }
  }

  /**
   * Maneja teclas globales cuando el reproductor está activo
   */
  handleGlobalKeyDown(event) {
    // Solo procesar si el reproductor está visible y activo
    if (!this.elements.player || this.elements.player.style.display === 'none') {
      return;
    }

    // Solo procesar si no hay otro elemento con foco que pueda manejar la tecla
    const activeElement = document.activeElement;
    const isPlayerFocused = this.elements.player.contains(activeElement);
    
    if (!isPlayerFocused) return;

    // Teclas de acceso rápido globales
    switch (event.key) {
      case 'm':
      case 'M':
        // M para mute/unmute (si se implementa control de volumen)
        event.preventDefault();
        this.announceToScreenReader('Control de volumen no disponible en previews de Spotify');
        break;
      
      case '?':
        // ? para mostrar ayuda
        event.preventDefault();
        this.showKeyboardHelp();
        break;
    }
  }

  /**
   * Anuncia el estado actual del reproductor
   */
  announceCurrentState() {
    let announcement = '';
    
    switch (this.player.state) {
      case 'stopped':
        announcement = 'Reproductor detenido. Presione Enter, Espacio o P para reproducir una muestra aleatoria.';
        break;
      case 'loading':
        announcement = 'Cargando muestra de audio...';
        break;
      case 'playing':
        const trackName = this.player.currentTrack ? this.player.currentTrack.name : 'canción desconocida';
        announcement = `Reproduciendo: ${trackName}. Presione Enter, Espacio o P para pausar, S para detener.`;
        break;
      case 'paused':
        const pausedTrack = this.player.currentTrack ? this.player.currentTrack.name : 'canción desconocida';
        announcement = `Pausado: ${pausedTrack}. Presione Enter, Espacio o P para continuar, S para detener.`;
        break;
      case 'error':
        announcement = 'Error en el reproductor. No hay muestras disponibles para este álbum.';
        break;
    }
    
    this.announceToScreenReader(announcement);
  }

  /**
   * Anuncia un mensaje a los lectores de pantalla
   */
  announceToScreenReader(message) {
    if (this.elements.loadingAnnouncement) {
      this.elements.loadingAnnouncement.textContent = message;
      
      // Limpiar el mensaje después de un tiempo para evitar repeticiones
      setTimeout(() => {
        if (this.elements.loadingAnnouncement) {
          this.elements.loadingAnnouncement.textContent = '';
        }
      }, 3000);
    }
  }

  /**
   * Muestra ayuda de teclado
   */
  showKeyboardHelp() {
    const helpMessage = 
      'Controles de teclado del reproductor de audio: ' +
      'Enter o Espacio para reproducir/pausar, ' +
      'P para play/pause, ' +
      'S para detener, ' +
      'Escape para detener y quitar foco, ' +
      'En la barra de progreso: flechas para navegar, Inicio/Fin para ir al principio/final, ' +
      'Signo de interrogación para esta ayuda.';
    
    this.announceToScreenReader(helpMessage);
  }
  /**
   * Maneja el clic en el botón de reproducción con debouncing
   * Requisitos: 2.3, 2.4, 2.5 - Controles de reproducción inmediatos (optimizado)
   */
  async handlePlayButtonClick(event) {
    event.preventDefault();
    
    // Implementar debouncing para evitar clics múltiples rápidos
    const debouncedClick = this.debounce('playButton', async () => {
      try {
        if (this.player.isPlaying()) {
          this.player.pause();
        } else if (this.player.isPaused()) {
          this.player.resume();
        } else {
          await this.player.play();
        }
      } catch (error) {
        console.error('Error en control de reproducción:', error);
        this.showError('Error al controlar la reproducción');
      }
    }, 200); // 200ms debounce para clics
    
    return debouncedClick();
  }

  /**
   * Maneja la navegación por teclado con debouncing
   * Requisito: 4.2 - Navegación por teclado completa (optimizado)
   */
  handleKeyDown(event) {
    // Implementar debouncing para teclas de control
    const debouncedKeyHandler = this.debounce('keyDown', () => {
      // Prevenir comportamiento por defecto para teclas de control
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.handlePlayButtonClick(event);
        return;
      }

      // Teclas adicionales para control de reproducción
      switch (event.key) {
        case 'p':
        case 'P':
          // P para Play/Pause
          event.preventDefault();
          this.handlePlayButtonClick(event);
          break;
        
        case 's':
        case 'S':
          // S para Stop
          if (this.player.isPlaying() || this.player.isPaused()) {
            event.preventDefault();
            this.player.stop();
          }
          break;
        
        case 'Escape':
          // Escape para detener y quitar foco
          if (this.player.isPlaying() || this.player.isPaused()) {
            event.preventDefault();
            this.player.stop();
            this.elements.button.blur();
          }
          break;
      }
    }, 100); // 100ms debounce para teclas
    
    debouncedKeyHandler();
  }

  /**
   * Actualiza el estado visual del botón
   * Requisitos: 2.1, 2.2 - Consistencia de estado de botones
   */
  updatePlayButton() {
    if (!this.elements.button || !this.elements.buttonText || !this.elements.icon) {
      return;
    }

    const button = this.elements.button;
    const text = this.elements.buttonText;
    const icon = this.elements.icon;

    // Limpiar clases de estado anteriores
    button.classList.remove('loading', 'playing', 'paused', 'error');

    switch (this.player.state) {
      case 'loading':
        button.classList.add('loading');
        button.disabled = true;
        text.textContent = 'Cargando...';
        button.setAttribute('aria-label', 'Cargando muestra de audio');
        button.setAttribute('aria-describedby', 'audioPreviewHelp');
        button.setAttribute('title', 'Cargando muestra de audio...');
        icon.style.animation = 'spin 1s linear infinite';
        this.announceToScreenReader('Cargando muestra de audio...');
        break;

      case 'playing':
        button.classList.add('playing');
        button.disabled = false;
        text.textContent = 'Pausar';
        button.setAttribute('aria-label', 'Pausar reproducción de muestra de audio');
        button.setAttribute('aria-pressed', 'true');
        button.setAttribute('title', 'Pausar reproducción (Enter, Espacio o P)');
        icon.style.animation = '';
        break;

      case 'paused':
        button.classList.add('paused');
        button.disabled = false;
        text.textContent = 'Continuar';
        button.setAttribute('aria-label', 'Continuar reproducción de muestra de audio');
        button.setAttribute('aria-pressed', 'false');
        button.setAttribute('title', 'Continuar reproducción (Enter, Espacio o P)');
        icon.style.animation = '';
        break;

      case 'error':
        button.classList.add('error');
        button.disabled = true;
        text.textContent = 'No disponible';
        button.setAttribute('aria-label', 'Muestra de audio no disponible');
        button.removeAttribute('aria-pressed');
        button.setAttribute('title', 'Muestra de audio no disponible para este álbum');
        icon.style.animation = '';
        break;

      case 'stopped':
      default:
        button.disabled = false;
        text.textContent = 'Escuchar muestra';
        button.setAttribute('aria-label', 'Reproducir muestra de audio del álbum');
        button.removeAttribute('aria-pressed');
        button.setAttribute('title', 'Reproducir muestra de audio (Enter, Espacio o P)');
        icon.style.animation = '';
        break;
    }

    // Actualizar estado de aria-busy
    button.setAttribute('aria-busy', this.player.state === 'loading' ? 'true' : 'false');
  }

  /**
   * Actualiza el progreso de reproducción con optimizaciones de rendimiento
   * Requisito: 3.3 - Actualización de progreso en tiempo real (optimizado)
   */
  updateProgress() {
    if (!this.player.audioElement || !this.elements.progressFill || !this.elements.timeDisplay) {
      return;
    }

    const currentTime = this.player.getCurrentTime();
    const duration = this.player.getDuration();
    const progress = (currentTime / duration) * 100;

    // Optimización: solo actualizar si hay cambio significativo (>1%)
    const newProgressPercent = Math.min(progress, 100);
    const currentProgressPercent = parseFloat(this.elements.progressFill.style.width) || 0;
    
    if (Math.abs(newProgressPercent - currentProgressPercent) >= 1) {
      this.elements.progressFill.style.width = `${newProgressPercent}%`;
    }

    // Actualizar tiempo transcurrido (solo si cambió el segundo)
    const currentSeconds = Math.floor(currentTime);
    const minutes = Math.floor(currentTime / 60);
    const seconds = Math.floor(currentTime % 60);
    const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // Optimización: solo actualizar texto si cambió
    if (this.elements.timeDisplay.textContent !== timeString) {
      this.elements.timeDisplay.textContent = timeString;
    }

    // Actualizar atributos ARIA de la barra de progreso (menos frecuentemente)
    if (this.elements.progressBar && currentSeconds % 2 === 0) { // Cada 2 segundos
      const totalSeconds = Math.floor(duration);
      
      this.elements.progressBar.setAttribute('aria-valuenow', currentSeconds.toString());
      this.elements.progressBar.setAttribute('aria-valuetext', 
        `${timeString} de 0:30 (${Math.round(progress)}% completado)`);
      
      // Actualizar descripción más detallada
      const remainingTime = totalSeconds - currentSeconds;
      const remainingMinutes = Math.floor(remainingTime / 60);
      const remainingSeconds = remainingTime % 60;
      const remainingString = `${remainingMinutes}:${remainingSeconds.toString().padStart(2, '0')}`;
      
      this.elements.progressBar.setAttribute('title', 
        `Progreso: ${timeString} transcurridos, ${remainingString} restantes`);
    }

    // Actualizar aria-live del tiempo solo en intervalos específicos para evitar spam
    const shouldAnnounceTime = currentSeconds % 10 === 0 && currentSeconds > 0;
    if (shouldAnnounceTime && this.elements.timeDisplay) {
      this.elements.timeDisplay.setAttribute('aria-live', 'polite');
      setTimeout(() => {
        if (this.elements.timeDisplay) {
          this.elements.timeDisplay.setAttribute('aria-live', 'off');
        }
      }, 1000);
    }
  }

  /**
   * Actualiza la información del track actual
   * Requisitos: 3.1, 3.2 - Visualización de información de track
   */
  updateTrackInfo() {
    if (!this.player.currentTrack || !this.elements.trackName) {
      return;
    }

    const track = this.player.currentTrack;
    const trackInfo = `${track.name}`;
    
    this.elements.trackName.textContent = trackInfo;
    this.elements.trackName.setAttribute('title', trackInfo);
    this.elements.trackName.setAttribute('aria-label', `Reproduciendo: ${trackInfo}`);

    // Mostrar información de reproducción
    if (this.elements.info) {
      this.elements.info.style.display = 'block';
      this.elements.info.setAttribute('aria-label', 
        `Información de reproducción: ${trackInfo}, duración 30 segundos`);
    }

    // Anunciar el cambio de canción
    this.announceToScreenReader(`Ahora reproduciendo: ${trackInfo}`);
  }

  /**
   * Oculta la información del track
   */
  hideTrackInfo() {
    if (this.elements.info) {
      this.elements.info.style.display = 'none';
    }

    if (this.elements.trackName) {
      this.elements.trackName.textContent = '';
    }

    // Resetear progreso
    if (this.elements.progressFill) {
      this.elements.progressFill.style.width = '0%';
    }

    if (this.elements.timeDisplay) {
      this.elements.timeDisplay.textContent = '0:00';
    }

    if (this.elements.progressBar) {
      this.elements.progressBar.setAttribute('aria-valuenow', '0');
      this.elements.progressBar.setAttribute('aria-valuetext', '0:00 de 0:30');
    }
  }

  /**
   * Muestra un mensaje de error
   * Requisito: 3.5 - Estados de error con mensajes claros
   */
  showError(message) {
    if (!this.elements.error || !this.elements.errorMessage) {
      return;
    }

    // Personalizar mensaje para caso de no preview
    if (message.includes('no tiene muestras de audio disponibles')) {
      message = `
🎵 Muestra no disponible

Este álbum no tiene previews de audio disponibles. Esto es común en álbumes recientes debido a restricciones de licenciamiento de Spotify.

💡 Tip: Los álbumes más antiguos (2010-2015) suelen tener más previews disponibles.
      `.trim();
    }

    this.elements.errorMessage.textContent = message;
    this.elements.error.style.display = 'block';
    this.elements.info.style.display = 'none';

    // Mejorar accesibilidad del error
    this.elements.error.setAttribute('aria-label', `Error: ${message}`);
    this.elements.errorMessage.setAttribute('role', 'text');

    // Anunciar error inmediatamente
    this.announceToScreenReader(`Error en el reproductor: ${message}`);

    // Auto-ocultar error después de 12 segundos para mensajes informativos
    setTimeout(() => {
      this.hideError();
    }, 12000);
  }

  /**
   * Muestra mensaje de reintento durante recuperación automática
   */
  showRetryMessage(message, currentRetry, maxRetries) {
    if (!this.elements.error || !this.elements.errorMessage) {
      return;
    }

    const retryText = `${message} (${currentRetry}/${maxRetries})`;
    this.elements.errorMessage.textContent = retryText;
    this.elements.error.style.display = 'block';
    this.elements.info.style.display = 'none';

    // Cambiar estilo para indicar que es un reintento, no un error final
    this.elements.error.classList.add('retry-message');
    this.elements.error.classList.remove('final-error');

    // Mejorar accesibilidad
    this.elements.error.setAttribute('aria-label', `Reintentando: ${retryText}`);
    this.announceToScreenReader(`Reintentando conexión: ${message}`);
  }

  /**
   * Muestra mensaje de éxito tras recuperación
   */
  showSuccessMessage(message) {
    if (!this.elements.error || !this.elements.errorMessage) {
      return;
    }

    this.elements.errorMessage.textContent = message;
    this.elements.error.style.display = 'block';
    this.elements.error.classList.add('success-message');
    this.elements.error.classList.remove('retry-message', 'final-error');

    // Mejorar accesibilidad
    this.elements.error.setAttribute('aria-label', `Éxito: ${message}`);
    this.announceToScreenReader(message);

    // Auto-ocultar mensaje de éxito después de 3 segundos
    setTimeout(() => {
      this.hideError();
    }, 3000);
  }

  /**
   * Oculta mensajes de reintento
   */
  hideRetryMessage() {
    this.hideError();
  }

  /**
   * Oculta el mensaje de error
   */
  hideError() {
    if (this.elements.error) {
      this.elements.error.style.display = 'none';
      this.elements.error.classList.remove('retry-message', 'success-message', 'final-error');
    }
  }

  /**
   * Actualiza el estado general de la UI
   */
  updateState() {
    this.updatePlayButton();

    switch (this.player.state) {
      case 'playing':
        this.updateTrackInfo();
        this.hideError();
        this.startProgressUpdates();
        break;

      case 'paused':
        this.hideError();
        this.stopProgressUpdates();
        break;

      case 'stopped':
        this.hideTrackInfo();
        this.hideError();
        this.stopProgressUpdates();
        break;

      case 'loading':
        this.hideError();
        break;

      case 'error':
        this.hideTrackInfo();
        this.stopProgressUpdates();
        break;
    }
  }

  /**
   * Inicia las actualizaciones periódicas de progreso con optimización
   */
  startProgressUpdates() {
    this.stopProgressUpdates(); // Limpiar interval anterior
    
    // Usar requestAnimationFrame para mejor rendimiento cuando sea posible
    if (window.requestAnimationFrame && document.visibilityState === 'visible') {
      this.progressUpdateRAF();
    } else {
      // Fallback a setInterval con frecuencia optimizada
      this.progressInterval = setInterval(() => {
        this.updateProgress();
      }, 250); // 250ms para mejor rendimiento (4 FPS)
    }
  }

  /**
   * Actualización de progreso usando requestAnimationFrame
   */
  progressUpdateRAF() {
    if (this.player.isPlaying()) {
      this.updateProgress();
      this.progressInterval = requestAnimationFrame(() => this.progressUpdateRAF());
    }
  }

  /**
   * Detiene las actualizaciones de progreso
   */
  stopProgressUpdates() {
    if (this.progressInterval) {
      if (typeof this.progressInterval === 'number' && this.progressInterval > 1000) {
        // Es un setInterval
        clearInterval(this.progressInterval);
      } else {
        // Es un requestAnimationFrame
        cancelAnimationFrame(this.progressInterval);
      }
      this.progressInterval = null;
    }
  }

  /**
   * Aplica los estilos CSS al reproductor
   * Requisitos: 4.1, 7.1, 7.2 - Diseño responsive y consistencia visual
   */
  applyStyles() {
    // Los estilos CSS están ahora definidos en public/css/styles.css
    // No es necesario inyectar estilos inline
  }

  /**
   * Destruye la UI y limpia recursos de manera optimizada
   */
  destroy() {
    // Detener actualizaciones de progreso
    this.stopProgressUpdates();

    // Limpiar todos los timers de debouncing
    this.clearAllDebounceTimers();

    // Remover event listeners del botón principal
    if (this.elements.button) {
      this.elements.button.removeEventListener('click', this.handlePlayButtonClick);
      this.elements.button.removeEventListener('keydown', this.handleKeyDown);
      this.elements.button.removeEventListener('focus', this.handleFocus);
      this.elements.button.removeEventListener('blur', this.handleBlur);
    }

    // Remover event listeners de la barra de progreso
    if (this.elements.progressBar) {
      this.elements.progressBar.removeEventListener('keydown', this.handleProgressBarKeyDown);
      this.elements.progressBar.removeEventListener('focus', this.handleProgressBarFocus);
      this.elements.progressBar.removeEventListener('blur', this.handleProgressBarBlur);
    }

    // Remover event listener global
    document.removeEventListener('keydown', this.handleGlobalKeyDown);

    // Remover elementos del DOM
    if (this.elements.player && this.elements.player.parentNode) {
      this.elements.player.parentNode.removeChild(this.elements.player);
    }

    // Limpiar referencias para liberar memoria
    this.elements = {};
    this.player = null;
    this.debounceTimers = null;
  }

  /**
   * Implementa debouncing para evitar llamadas excesivas en la UI
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
    if (this.debounceTimers) {
      for (const [key, timerId] of this.debounceTimers) {
        clearTimeout(timerId);
      }
      this.debounceTimers.clear();
    }
  }
}

// Exportar para uso global
window.AudioPreviewUI = AudioPreviewUI;