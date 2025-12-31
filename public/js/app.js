// --- CONFIGURACIÓN Y VARIABLES GLOBALES ---
const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000'
  : window.location.origin;

// --- VARIABLES Y ESTADO GLOBAL ---
const profileContainer = document.getElementById('profileContainer');
const profileLink = document.getElementById('profileLink');
const profileUsername = document.getElementById('profileUsername');
const totalReviewsEl = document.getElementById('totalReviews');
const avgStarsEl = document.getElementById('avgStars');
const topReviewsContainer = document.getElementById('topReviewsContainer');
const noTopReviewsMessage = document.getElementById('noTopReviewsMessage');
const userDisplayEl = document.getElementById('userDisplay');
const profilePictureEl = document.getElementById('profilePicture');
const photoFileInput = document.getElementById('photoFileInput');
const changePhotoBtn = document.getElementById('changePhotoBtn');
let currentUserId = null; 
let currentUsername = null; 

// ========================
// VERIFICAR SESIÓN AL CARGAR
// ========================
async function checkSession() {
  try {
    const res = await fetch(`${API_BASE_URL}/me`, { credentials: "include" });
    
    // Enhanced error handling for network issues
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        // Unauthorized - clear session and show landing page
        console.log('Session expired or unauthorized - showing landing page');
        clearSessionState();
        showLandingPage();
        return;
      } else {
        // Other server errors - retry logic could be added here
        throw new Error(`Server error: ${res.status} ${res.statusText}`);
      }
    }
    
    const data = await res.json();
    if (data.loggedIn) {
        // User is authenticated - show main application
        console.log('User authenticated - showing main application');
        currentUserId = data.userId;
        currentUsername = data.username;
        if (userDisplayEl) {
            userDisplayEl.textContent = data.username;
            userDisplayEl.dataset.userId = data.userId;
            userDisplayEl.dataset.username = data.username;
        }
        
        // Enhanced profile picture loading with better persistence handling
        const profilePictureUrl = data.profilePictureUrl || data.profile_pic_url;
        
        // Update navbar profile picture
        updateNavbarProfilePicture(profilePictureUrl);
        if (profilePictureUrl && profilePictureEl) {
            console.log('Loading profile picture from checkSession:', profilePictureUrl);
            console.log('Data sync info:', data.dataSync);
            
            // Use enhanced validation that handles server issues gracefully
            try {
              await loadProfilePictureWithEnhancedValidation(profilePictureUrl, data.userId);
            } catch (imageError) {
              console.warn('Profile picture loading failed, using placeholder:', imageError);
              profilePictureEl.src = getProfileImageUrl(null, '100');
            }
        } else if (profilePictureEl) {
            // Asegurar que se muestre placeholder si no hay foto
            console.log('No hay foto de perfil, mostrando placeholder');
            profilePictureEl.src = getProfileImageUrl(null, '100');
        }
        
        // Mostrar botón de admin si es administrador
        showAdminButton(data.role === 'admin');
        
        // Show main application for authenticated users
        showApp();
        
        // Initialize notifications for authenticated users
        setTimeout(() => {
            notificationSystem.updateUnreadCount();
        }, 1000);
    } else {
        // User is not authenticated - show landing page
        console.log('User not authenticated - showing landing page');
        clearSessionState();
        showLandingPage();
    }
  } catch (err) {
    console.error("Error al verificar sesión:", err);
    
    // Enhanced error handling - don't immediately clear session on network errors
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      console.warn('Network error during session check - server may be down');
      // Keep current session state if it exists, just show a warning
      if (!currentUserId) {
        clearSessionState();
        showLandingPage();
      }
      // Could show a network error indicator here
    } else {
      // Other errors - clear session and show landing page
      clearSessionState();
      showLandingPage();
    }
  }
}

// Helper function to clear session state consistently
function clearSessionState() {
  currentUserId = null;
  currentUsername = null;
  if (userDisplayEl) userDisplayEl.textContent = 'Usuario';
  if (profilePictureEl) {
    profilePictureEl.src = getProfileImageUrl(null, '100');
  }
  // Clear navbar profile picture
  updateNavbarProfilePicture(null);
}

// Function to update navbar profile picture
function updateNavbarProfilePicture(imageUrl) {
  const navbarProfilePicture = document.getElementById('navbarProfilePicture');
  if (!navbarProfilePicture) return;
  
  if (imageUrl) {
    // Use the same enhanced cache busting as the main profile picture
    const cacheBustUrl = generateEnhancedCacheBustUrl(imageUrl);
    navbarProfilePicture.src = cacheBustUrl;
  } else {
    // Use placeholder
    navbarProfilePicture.src = '/icons/icono_ftperfil_predeterminado.svg';
  }
  
  // Add user ID data attribute for clickable functionality
  if (currentUserId) {
    navbarProfilePicture.dataset.userId = currentUserId;
  }
}

// La inicialización se moverá al final del archivo

// ========================
// MOSTRAR / OCULTAR PANELES
// ========================
function showAuth() {
  console.log("Showing authentication page");
  
  // Agregar clase para prevenir scroll y ocultar contenido
  document.body.classList.add('login-mode');
  document.documentElement.classList.add('login-mode');
  document.body.classList.remove('landing-mode');
  document.documentElement.classList.remove('landing-mode');
  
  // Forzar estilos directamente
  document.body.style.overflow = 'hidden';
  document.body.style.height = '100vh';
  document.body.style.position = 'fixed';
  document.body.style.width = '100vw';
  document.body.style.top = '0';
  document.body.style.left = '0';
  
  // Ocultar landing page si está visible
  const landingContainer = document.getElementById("landingContainer");
  if (landingContainer) {
    landingContainer.style.display = "none";
    landingContainer.style.visibility = "hidden";
    landingContainer.style.opacity = "0";
    landingContainer.style.zIndex = "-1";
  }
  
  // Mostrar auth container con todos los estilos necesarios
  const authContainer = document.getElementById("authContainer");
  authContainer.style.display = "flex";
  authContainer.style.visibility = "visible";
  authContainer.style.opacity = "1";
  authContainer.style.zIndex = "9999";
  
  // Ocultar todos los elementos de la aplicación principal
  document.getElementById("navbar").style.display = "none";
  document.getElementById("searchContainer").style.display = "none";
  document.getElementById("albumFeed").style.display = "none";
  document.getElementById("albumDetailContainer").style.display = "none";
  if (profileContainer) profileContainer.style.display = "none";
  
  // Limpiar campos de login para una experiencia fresca
  const loginUsername = document.getElementById("loginUsername");
  const loginPassword = document.getElementById("loginPassword");
  const messageDiv = document.getElementById("message");
  
  if (loginUsername) loginUsername.value = '';
  if (loginPassword) loginPassword.value = '';
  if (messageDiv) messageDiv.innerHTML = '';
  
  console.log("Authentication page displayed successfully");
}

// Función más robusta para forzar el regreso al login
function forceShowAuth() {
  console.log("Forzando regreso a login...");
  
  // Intentar showAuth normal primero
  try {
    showAuth();
    
    // Verificar que se aplicó correctamente
    setTimeout(() => {
      const authContainer = document.getElementById("authContainer");
      const isVisible = authContainer && 
                       authContainer.style.display === "flex" && 
                       authContainer.style.visibility !== "hidden";
      
      if (!isVisible) {
        console.log("showAuth falló, forzando recarga...");
        // Si no funcionó, recargar la página como último recurso
        window.location.reload();
      } else {
        console.log("Login mostrado correctamente");
      }
    }, 200);
    
  } catch (error) {
    console.error("Error en showAuth, recargando página:", error);
    window.location.reload();
  }
}

// Funciones globales necesarias para el HTML
window.showAuth = showAuth;
window.forceShowAuth = forceShowAuth;

function showApp() {
  console.log("Showing main application");
  
  // Quitar clase login-mode para permitir scroll normal
  document.body.classList.remove('login-mode');
  document.documentElement.classList.remove('login-mode');
  document.body.classList.remove('landing-mode');
  document.documentElement.classList.remove('landing-mode');
  
  // Restaurar estilos normales del body
  document.body.style.overflow = '';
  document.body.style.height = '';
  document.body.style.position = '';
  document.body.style.width = '';
  document.body.style.top = '';
  document.body.style.left = '';
  
  // Ocultar auth container y landing page completamente
  const authContainer = document.getElementById("authContainer");
  const landingContainer = document.getElementById("landingContainer");
  
  authContainer.style.display = "none";
  authContainer.style.visibility = "hidden";
  authContainer.style.opacity = "0";
  authContainer.style.zIndex = "-1";
  
  if (landingContainer) {
    landingContainer.style.display = "none";
    landingContainer.style.visibility = "hidden";
    landingContainer.style.opacity = "0";
    landingContainer.style.zIndex = "-1";
  }
  
  // Mostrar elementos de la aplicación
  document.getElementById("navbar").style.display = "block";
  document.getElementById("searchContainer").style.display = "block";
  document.getElementById("albumDetailContainer").style.display = "none";
  if (profileContainer) profileContainer.style.display = "none";
  
  // Hide profile viewer if it exists
  const profileViewerContainer = document.getElementById("profileViewerContainer");
  if (profileViewerContainer) {
    profileViewerContainer.style.display = "none";
  }
  
  // Hide profile viewer using the global instance
  if (window.profileViewer) {
    window.profileViewer.hide();
  }
  
  const welcome = document.getElementById("welcomeMessage");
  if (welcome) welcome.style.display = "block";
  
  const albumFeed = document.getElementById("albumFeed");
  albumFeed.style.display = "block";
  
  // Crear secciones dinámicas si no existen
  if (!document.getElementById("mostReviewedAlbumsSection")) {
    albumFeed.insertAdjacentHTML('beforeend', `
      <div id="mostReviewedAlbumsSection" style="margin-top: 220px;">
          <h3>Álbumes con Más Reseñas</h3>
          <div class="row mt-3" id="mostReviewedAlbumsRow"></div>
      </div>
    `);
  }
  
  if (!document.getElementById("randomReviewsSection")) {
    albumFeed.insertAdjacentHTML('beforeend', `
      <div id="randomReviewsSection" class="mt-5">
          <h3>Reseñas Destacadas (4-5 Estrellas)</h3>
          <div class="row mt-3" id="randomReviewsRow"></div>
      </div>
    `);
  }
  
  // Cargar contenido
  const query = document.getElementById("searchInput").value.trim();
  if (query.length === 0) {
    renderTopAlbums();
    renderMostReviewedAlbums(); 
    renderRandomHighStarReviews();
    document.getElementById("topAlbumsContainer").style.display = "block";
    document.getElementById("mostReviewedAlbumsSection").style.display = "block";
    document.getElementById("randomReviewsSection").style.display = "block";
  } else {
    document.getElementById("topAlbumsContainer").style.display = "none";
    document.getElementById("mostReviewedAlbumsSection").style.display = "none"; 
    document.getElementById("randomReviewsSection").style.display = "none";
  }
}

// ========================
// LANDING PAGE FUNCTIONALITY
// ========================
async function showLandingPage() {
  console.log("Showing landing page");
  
  // Agregar clase para permitir scroll en landing page
  document.body.classList.add('landing-mode');
  document.documentElement.classList.add('landing-mode');
  document.body.classList.remove('login-mode');
  document.documentElement.classList.remove('login-mode');
  
  // Remover estilos forzados para permitir scroll en landing page
  document.body.style.overflow = '';
  document.body.style.height = '';
  document.body.style.position = '';
  document.body.style.width = '';
  document.body.style.top = '';
  document.body.style.left = '';
  
  // Ocultar auth container y elementos de la aplicación
  const authContainer = document.getElementById("authContainer");
  const landingContainer = document.getElementById("landingContainer");
  
  authContainer.style.display = "none";
  authContainer.style.visibility = "hidden";
  authContainer.style.opacity = "0";
  authContainer.style.zIndex = "-1";
  
  // Mostrar landing container con todos los estilos necesarios
  if (landingContainer) {
    landingContainer.style.display = "block";
    landingContainer.style.visibility = "visible";
    landingContainer.style.opacity = "1";
    landingContainer.style.zIndex = "9999";
  }
  
  // Ocultar todos los elementos de la aplicación principal
  document.getElementById("navbar").style.display = "none";
  document.getElementById("searchContainer").style.display = "none";
  document.getElementById("albumFeed").style.display = "none";
  document.getElementById("albumDetailContainer").style.display = "none";
  if (profileContainer) profileContainer.style.display = "none";
  
  // Cargar contenido de la landing page
  await loadLandingPageContent();
  
  console.log("Landing page displayed successfully");
}

async function loadLandingPageContent() {
  console.log("Cargando contenido de la landing page");
  
  // Track loading states
  const loadingStates = {
    stats: false,
    albums: false,
    carousel: false
  };
  
  try {
    // Load all content in parallel with individual error handling
    const loadingPromises = [
      loadLandingStats().then(() => { loadingStates.stats = true; }).catch(err => {
        console.error("Stats loading failed:", err);
        loadingStates.stats = false;
      }),
      
      loadFeaturedAlbums().then(() => { loadingStates.albums = true; }).catch(err => {
        console.error("Albums loading failed:", err);
        loadingStates.albums = false;
      }),
      
      loadBackgroundCarousel().then(() => { loadingStates.carousel = true; }).catch(err => {
        console.error("Carousel loading failed:", err);
        loadingStates.carousel = false;
      })
    ];
    
    // Wait for all promises to settle (not fail)
    await Promise.allSettled(loadingPromises);
    
    // Check if any critical components failed
    const criticalFailures = !loadingStates.stats || !loadingStates.albums;
    
    if (criticalFailures) {
      console.warn("Algunos componentes críticos fallaron al cargar");
      
      // Check if it's an empty database state
      if (!loadingStates.stats && !loadingStates.albums) {
        handleEmptyDatabaseState();
      } else {
        showLandingNotification("Algunos elementos no se pudieron cargar completamente", "warning", 5000);
      }
    } else {
      console.log("Contenido de landing page cargado exitosamente");
      showLandingNotification("¡Bienvenido a MusicBoxd!", "success", 3000);
    }
    
    // Carousel failure is not critical
    if (!loadingStates.carousel) {
      console.log("Carrusel no disponible, continuando sin él");
    }
    
  } catch (error) {
    console.error("Error crítico cargando contenido de landing page:", error);
    
    // Show fallback content
    showDefaultLandingContent();
    showLandingNotification("Error cargando la página. Mostrando contenido básico", "error", 6000);
  }
}

async function loadLandingStats() {
  const statsElements = {
    totalUsers: document.getElementById('totalUsersCount'),
    totalReviews: document.getElementById('totalReviewsCount'),
    totalAlbums: document.getElementById('totalAlbumsCount')
  };
  
  // Show skeleton loading state
  showStatsSkeletonState(statsElements);
  
  try {
    console.log("Cargando estadísticas de la plataforma");
    
    const response = await fetch(`${API_BASE_URL}/api/landing/stats`, {
      credentials: 'include',
      timeout: 10000 // 10 second timeout
    });
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log("Estadísticas recibidas:", data);
    
    // Handle both success and fallback responses
    if (data.success || data.fallback) {
      // Remove loading overlay first
      Object.values(statsElements).forEach(element => {
        if (element && element.parentElement) {
          element.parentElement.classList.remove('loading-overlay');
        }
      });
      
      // Update elements with animation
      updateStatWithAnimation('totalUsersCount', data.totalUsers || 0);
      updateStatWithAnimation('totalReviewsCount', data.totalReviews || 0);
      updateStatWithAnimation('totalAlbumsCount', data.totalAlbums || 0);
      
      // Show warning if using fallback data
      if (data.fallback) {
        console.warn("Usando datos de respaldo para estadísticas:", data.error);
        showLandingNotification("Estadísticas cargadas con datos básicos", "warning", 3000);
      }
    } else {
      throw new Error(data.error || "Error desconocido");
    }
    
  } catch (error) {
    console.error("Error cargando estadísticas:", error);
    
    // Show error state with retry option
    showStatsErrorState(statsElements, error.message, () => loadLandingStats());
    
    // Show user-friendly notification
    showLandingNotification("Error cargando estadísticas de la plataforma", "error", 5000);
  }
}

function showStatsSkeletonState(elements) {
  Object.values(elements).forEach(element => {
    if (element) {
      element.parentElement.classList.add('loading-overlay');
      element.textContent = '';
    }
  });
}

function showStatsErrorState(elements, errorMessage, retryCallback) {
  Object.values(elements).forEach(element => {
    if (element) {
      element.parentElement.classList.remove('loading-overlay');
      element.textContent = '0';
    }
  });
  
  // Show error notification with retry option
  const errorHtml = `
    <div class="error-state mt-3">
      <div class="error-state-icon">⚠️</div>
      <div class="error-state-message">Error cargando estadísticas</div>
      <button class="error-state-retry" onclick="(${retryCallback.toString()})()">
        Reintentar
      </button>
    </div>
  `;
  
  // Find a suitable container to show the error
  const statsContainer = document.querySelector('.landing-stats-container') || 
                        document.querySelector('#landingStatsRow');
  if (statsContainer) {
    const existingError = statsContainer.querySelector('.error-state');
    if (existingError) existingError.remove();
    
    statsContainer.insertAdjacentHTML('afterend', errorHtml);
    
    // Auto-remove error after 10 seconds
    setTimeout(() => {
      const errorElement = document.querySelector('.error-state');
      if (errorElement) errorElement.remove();
    }, 10000);
  }
}

function updateStatWithAnimation(elementId, value) {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  // Animación de conteo desde 0 hasta el valor final
  const duration = 1500; // 1.5 segundos
  const startTime = Date.now();
  const startValue = 0;
  const endValue = parseInt(value) || 0;
  
  function animate() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Usar easing para una animación más suave
    const easeOutQuart = 1 - Math.pow(1 - progress, 4);
    const currentValue = Math.floor(startValue + (endValue - startValue) * easeOutQuart);
    
    element.textContent = currentValue.toLocaleString();
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      element.textContent = endValue.toLocaleString();
    }
  }
  
  // Iniciar animación después de un pequeño delay
  setTimeout(() => {
    requestAnimationFrame(animate);
  }, 200);
}

async function loadFeaturedAlbums() {
  const container = document.getElementById('landingFeaturedAlbums');
  if (!container) return;
  
  // Show skeleton loading state
  showAlbumsSkeletonState(container);
  
  try {
    console.log("Cargando álbumes destacados");
    
    const response = await fetch(`${API_BASE_URL}/api/landing/featured-albums`, {
      credentials: 'include',
      timeout: 15000 // 15 second timeout for albums
    });
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log("Respuesta de álbumes destacados:", data);
    
    // Handle both success and fallback responses
    if (data.success) {
      const albums = data.albums || [];
      
      if (albums.length === 0) {
        showAlbumsEmptyState(container, data.message || "¡Sé el primero en reseñar un álbum!");
        return;
      }
      
      renderFeaturedAlbums(container, albums);
      
    } else if (data.fallback) {
      // Show error state with fallback message
      showAlbumsErrorState(container, data.message || "Álbumes temporalmente no disponibles", () => loadFeaturedAlbums());
      showLandingNotification("Error cargando álbumes destacados", "warning", 4000);
      
    } else {
      throw new Error(data.error || "Error desconocido");
    }
    
  } catch (error) {
    console.error("Error cargando álbumes destacados:", error);
    
    // Show error state with retry option
    showAlbumsErrorState(container, "Error cargando álbumes destacados", () => loadFeaturedAlbums());
    showLandingNotification("Error de conexión cargando álbumes", "error", 5000);
  }
}

function showAlbumsSkeletonState(container) {
  let skeletonHTML = '';
  
  // Create 8 skeleton cards
  for (let i = 0; i < 8; i++) {
    skeletonHTML += `
      <div class="col-lg-3 col-md-4 col-sm-6 mb-4">
        <div class="skeleton-album-card">
          <div class="skeleton skeleton-album-image"></div>
          <div class="skeleton skeleton-album-title"></div>
          <div class="skeleton skeleton-album-artist"></div>
          <div class="skeleton skeleton-album-rating"></div>
        </div>
      </div>
    `;
  }
  
  container.innerHTML = skeletonHTML;
}

function showAlbumsEmptyState(container, message) {
  container.innerHTML = `
    <div class="col-12">
      <div class="empty-state">
        <div class="empty-state-icon">🎵</div>
        <div class="empty-state-message">${message}</div>
        <div class="empty-state-subtitle">Los álbumes aparecerán aquí cuando los usuarios empiecen a reseñar</div>
      </div>
    </div>
  `;
}

function showAlbumsErrorState(container, message, retryCallback) {
  container.innerHTML = `
    <div class="col-12">
      <div class="error-state">
        <div class="error-state-icon">❌</div>
        <div class="error-state-message">${message}</div>
        <button class="error-state-retry" onclick="(${retryCallback.toString()})()">
          Reintentar
        </button>
      </div>
    </div>
  `;
}

function renderFeaturedAlbums(container, albums) {
  // Mostrar hasta 8 álbumes en una cuadrícula responsive
  const albumsToShow = albums.slice(0, 8);
  let albumsHTML = '';
  
  albumsToShow.forEach((album, index) => {
    const stars = "★".repeat(Math.round(album.averageRating || 0)) + 
                 "☆".repeat(5 - Math.round(album.averageRating || 0));
    
    // Enhanced accessibility attributes
    const ariaLabel = `Álbum ${album.name} por ${album.artist}, calificación ${album.averageRating} de 5 estrellas con ${album.reviewCount} reseñas`;
    
    albumsHTML += `
      <div class="col-lg-3 col-md-4 col-sm-6 mb-4" style="animation-delay: ${index * 0.1}s">
        <div class="featured-album-card h-100 p-3 rounded shadow-lg" 
             style="cursor: pointer; transition: all 0.3s ease;"
             onclick="navigateToLogin()"
             role="button"
             tabindex="0"
             aria-label="${ariaLabel}"
             onkeydown="handleAlbumCardKeydown(event)">
          <img src="${album.imageUrl}" 
               alt="Portada del álbum ${album.name} por ${album.artist}" 
               class="rounded mb-3"
               style="width: 100%; height: 150px; object-fit: cover;"
               loading="lazy"
               onerror="handleAlbumImageError(this)">
          <h6 class="text-white mb-2 text-truncate" 
              title="${album.name}"
              aria-label="Nombre del álbum: ${album.name}">
            ${album.name}
          </h6>
          <small class="text-white-50 d-block mb-2 text-truncate" 
                 title="${album.artist}"
                 aria-label="Artista: ${album.artist}">
            ${album.artist}
          </small>
          <div class="featured-album-rating" 
               role="img" 
               aria-label="Calificación: ${album.averageRating} de 5 estrellas">
            <span class="text-warning" aria-hidden="true">${stars}</span>
            <small class="text-white-50 ms-2" aria-label="${album.reviewCount} reseñas">
              (${album.reviewCount || 0})
            </small>
          </div>
        </div>
      </div>
    `;
  });
  
  container.innerHTML = albumsHTML;
  
  // Agregar animación de entrada
  setTimeout(() => {
    const cards = container.querySelectorAll('.featured-album-card');
    cards.forEach((card, index) => {
      setTimeout(() => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.animation = 'fadeInUp 0.6s ease forwards';
      }, index * 100);
    });
  }, 500);
}

// Handle keyboard navigation for album cards
function handleAlbumCardKeydown(event) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    navigateToLogin();
  }
}

// Enhanced image error handling for album covers
function handleAlbumImageError(imgElement) {
  console.log('Album image failed to load, using placeholder');
  imgElement.src = 'https://placehold.co/300x300/525252/E0E0E0?text=♪';
  imgElement.style.opacity = '0.7';
  imgElement.style.filter = 'grayscale(20%)';
}

async function loadBackgroundCarousel() {
  const carousel = document.getElementById('backgroundCarousel');
  if (!carousel) return;
  
  try {
    console.log("Cargando carrusel de fondo");
    
    const response = await fetch(`${API_BASE_URL}/api/landing/carousel-images`, {
      credentials: 'include',
      timeout: 12000 // 12 second timeout for carousel
    });
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log("Respuesta de carrusel:", data);
    
    // Handle both success and fallback responses
    if (data.success) {
      const images = data.images || [];
      
      if (images.length === 0) {
        console.log("No hay imágenes para el carrusel, continuando sin carrusel");
        return;
      }
      
      renderBackgroundCarousel(carousel, images);
      
    } else if (data.fallback) {
      // Carousel is optional, just log the issue
      console.warn("Carrusel no disponible:", data.message);
      return;
      
    } else {
      throw new Error(data.error || "Error desconocido");
    }
    
  } catch (error) {
    console.error("Error cargando carrusel de fondo:", error);
    // Carousel is optional, don't show error to user
    // Just continue without carousel
    return;
  }
}

function renderBackgroundCarousel(carousel, images) {
  // Crear elementos de imagen para el carrusel con lazy loading
  let carouselHTML = '';
  const imagesToShow = images.slice(0, 20); // Máximo 20 imágenes
  
  imagesToShow.forEach((image, index) => {
    const delay = Math.random() * 10; // Delay aleatorio para efecto más natural
    const duration = 15 + Math.random() * 10; // Duración aleatoria entre 15-25s
    const opacity = 0.1 + Math.random() * 0.2; // Opacidad aleatoria entre 0.1-0.3
    
    // Use thumbnail for initial load, then lazy load full image
    const thumbnailUrl = image.thumbnailUrl || image.imageUrl;
    
    carouselHTML += `
      <div class="carousel-bg-image" 
           data-src="${image.imageUrl}"
           data-thumbnail="${thumbnailUrl}"
           data-album-name="${image.albumName}"
           data-artist-name="${image.artistName}"
           style="
             background-image: url('${thumbnailUrl}');
             animation-delay: ${delay}s;
             animation-duration: ${duration}s;
             opacity: ${opacity};
             left: ${Math.random() * 80}%;
             top: ${Math.random() * 80}%;
           "
           title="${image.albumName} - ${image.artistName}"
           aria-label="Imagen de álbum: ${image.albumName} por ${image.artistName}"
           role="img"
           loading="lazy"
           onerror="handleCarouselImageError(this)">
      </div>
    `;
  });
  
  carousel.innerHTML = carouselHTML;
  
  // Iniciar animación del carrusel
  startCarouselAnimation();
  
  // Implement lazy loading for carousel images
  implementCarouselLazyLoading();
}

// Enhanced error handling for carousel images
function handleCarouselImageError(element) {
  console.log('Carousel image failed to load, hiding element');
  element.style.display = 'none';
  element.setAttribute('aria-hidden', 'true');
}

// Implement lazy loading for carousel images
function implementCarouselLazyLoading() {
  const carouselImages = document.querySelectorAll('.carousel-bg-image[data-src]');
  
  // Use Intersection Observer for efficient lazy loading
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        const fullImageUrl = img.dataset.src;
        
        // Preload the full resolution image
        const preloadImg = new Image();
        preloadImg.onload = () => {
          // Once loaded, update the background image
          img.style.backgroundImage = `url('${fullImageUrl}')`;
          img.removeAttribute('data-src');
          img.classList.add('lazy-loaded');
        };
        preloadImg.onerror = () => {
          console.warn('Failed to lazy load carousel image:', fullImageUrl);
          // Keep using thumbnail
          img.classList.add('lazy-error');
        };
        preloadImg.src = fullImageUrl;
        
        // Stop observing this image
        observer.unobserve(img);
      }
    });
  }, {
    // Load images when they're 50px away from viewport
    rootMargin: '50px',
    threshold: 0.01
  });
  
  // Start observing all carousel images
  carouselImages.forEach(img => {
    imageObserver.observe(img);
  });
}

function startCarouselAnimation() {
  const images = document.querySelectorAll('.carousel-bg-image');
  
  images.forEach((image, index) => {
    // Agregar animación CSS si no existe
    if (!document.getElementById('carousel-animations')) {
      const style = document.createElement('style');
      style.id = 'carousel-animations';
      style.textContent = `
        .carousel-bg-image {
          position: absolute;
          width: 200px;
          height: 200px;
          background-size: cover;
          background-position: center;
          border-radius: 15px;
          animation: floatAndFade 20s infinite linear;
          pointer-events: none;
        }
        
        @keyframes floatAndFade {
          0% {
            transform: translateY(100vh) rotate(0deg) scale(0.8);
            opacity: 0;
          }
          10% {
            opacity: var(--image-opacity, 0.2);
          }
          90% {
            opacity: var(--image-opacity, 0.2);
          }
          100% {
            transform: translateY(-200px) rotate(360deg) scale(1.2);
            opacity: 0;
          }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `;
      document.head.appendChild(style);
    }
    
    // Reiniciar animación periódicamente para mantener el movimiento
    setInterval(() => {
      const newLeft = Math.random() * 80;
      const newTop = Math.random() * 80;
      image.style.left = `${newLeft}%`;
      image.style.top = `${newTop}%`;
    }, 20000 + Math.random() * 10000); // Entre 20-30 segundos
  });
}

function showDefaultLandingContent() {
  console.log("Mostrando contenido por defecto de landing page");
  
  // Estadísticas por defecto
  updateStatWithAnimation('totalUsersCount', 0);
  updateStatWithAnimation('totalReviewsCount', 0);
  updateStatWithAnimation('totalAlbumsCount', 0);
  
  // Mensaje por defecto para álbumes
  const container = document.getElementById('landingFeaturedAlbums');
  if (container) {
    showAlbumsEmptyState(container, "¡Únete y sé el primero en reseñar!");
  }
}

// Enhanced notification system for landing page
function showLandingNotification(message, type = 'info', duration = 4000) {
  // Create notification container if it doesn't exist
  let notificationContainer = document.getElementById('landingNotifications');
  if (!notificationContainer) {
    notificationContainer = document.createElement('div');
    notificationContainer.id = 'landingNotifications';
    notificationContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10001;
      max-width: 350px;
      pointer-events: none;
    `;
    document.body.appendChild(notificationContainer);
  }
  
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `landing-notification landing-notification-${type}`;
  notification.style.cssText = `
    padding: 12px 20px;
    margin-bottom: 10px;
    border-radius: 8px;
    color: white;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transform: translateX(100%);
    transition: transform 0.3s ease, opacity 0.3s ease;
    pointer-events: auto;
    font-size: 0.9rem;
    line-height: 1.4;
  `;
  
  // Set background color based on type
  const colors = {
    'success': 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
    'error': 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
    'warning': 'linear-gradient(135deg, #ffc107 0%, #e0a800 100%)',
    'info': 'linear-gradient(135deg, #17a2b8 0%, #138496 100%)'
  };
  
  notification.style.background = colors[type] || colors['info'];
  if (type === 'warning') {
    notification.style.color = '#212529';
  }
  
  // Add icon based on type
  const icons = {
    'success': '✅',
    'error': '❌',
    'warning': '⚠️',
    'info': 'ℹ️'
  };
  
  notification.innerHTML = `
    <span style="margin-right: 8px;">${icons[type] || icons['info']}</span>
    ${message}
  `;
  
  // Add to container
  notificationContainer.appendChild(notification);
  
  // Animate in
  setTimeout(() => {
    notification.style.transform = 'translateX(0)';
  }, 100);
  
  // Auto-remove after duration
  setTimeout(() => {
    notification.style.transform = 'translateX(100%)';
    notification.style.opacity = '0';
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, duration);
}

// Enhanced error handling for database empty state
function handleEmptyDatabaseState() {
  console.log("Detectado estado de base de datos vacía");
  
  // Show appropriate empty states for all sections
  const statsElements = {
    totalUsers: document.getElementById('totalUsersCount'),
    totalReviews: document.getElementById('totalReviewsCount'),
    totalAlbums: document.getElementById('totalAlbumsCount')
  };
  
  // Update stats to show zero with animation
  updateStatWithAnimation('totalUsersCount', 0);
  updateStatWithAnimation('totalReviewsCount', 0);
  updateStatWithAnimation('totalAlbumsCount', 0);
  
  // Show empty state for albums
  const albumsContainer = document.getElementById('landingFeaturedAlbums');
  if (albumsContainer) {
    showAlbumsEmptyState(albumsContainer, "¡Sé el primero en unirte y reseñar álbumes!");
  }
  
  // Show informative notification
  showLandingNotification("¡Bienvenido a MusicBoxd! Sé el primero en crear una cuenta y reseñar álbumes", "info", 6000);
}

function navigateToLogin() {
  console.log("Navigating from landing page to authentication system");
  showAuth();
}

// Función global para navegación desde landing page
window.navigateToLogin = navigateToLogin;
window.handleAlbumCardKeydown = handleAlbumCardKeydown;

// ========================
// REGISTRO - Movido a DOMContentLoaded
// ========================

// ========================
// LOGIN - Movido a DOMContentLoaded
// ========================

// ========================
// LOGOUT - Movido a DOMContentLoaded
// ========================

// ========================
// PROFILE VIEWER INTEGRATION
// ========================

// Function to make username clickable
function makeUsernameClickable(username, userId, element = null) {
    if (!username || !userId) return username;
    
    const clickableUsername = `<span class="profile-username-clickable text-primary" 
                                    style="cursor: pointer; text-decoration: underline;" 
                                    onclick="profileViewer.showUserProfile(${userId})"
                                    title="Ver perfil de ${username}">
                                ${username}
                              </span>`;
    
    if (element) {
        element.innerHTML = clickableUsername;
        return element;
    }
    
    return clickableUsername;
}

// Function to make profile picture clickable
function makeProfilePictureClickable(imgElement, userId) {
    if (!imgElement || !userId) return;
    
    imgElement.style.cursor = 'pointer';
    imgElement.classList.add('profile-picture-clickable');
    imgElement.title = 'Ver perfil de usuario';
    imgElement.onclick = () => profileViewer.showUserProfile(userId);
}

// Function to enhance existing review elements with clickable usernames and pictures
function enhanceReviewElementsWithClickableProfiles() {
    // Find all review username elements and make them clickable
    const reviewUsernames = document.querySelectorAll('.review-username');
    reviewUsernames.forEach(element => {
        const username = element.textContent;
        const userId = element.dataset.userId;
        if (username && userId) {
            makeUsernameClickable(username, userId, element);
        }
    });
    
    // Find all profile pictures in reviews and make them clickable
    const reviewProfilePics = document.querySelectorAll('.review-profile-pic');
    reviewProfilePics.forEach(element => {
        const userId = element.dataset.userId;
        if (userId) {
            makeProfilePictureClickable(element, userId);
        }
    });
}

// ========================
// FUNCIONES AUXILIARES
// ========================
function createStars(rating) {
  return "★".repeat(rating) + "☆".repeat(5 - rating);
}

function showAdminButton(isAdmin) {
  let adminBtn = document.getElementById('adminBtn');
  
  if (isAdmin) {
    if (!adminBtn) {
      const navbarNav = document.querySelector('#navbarNav .navbar-nav');
      const profileItem = document.querySelector('#profileLink').parentElement;
      
      const adminItem = document.createElement('li');
      adminItem.className = 'nav-item';
      adminItem.innerHTML = `
        <a id="adminBtn" class="nav-link" href="/admin.html" title="Panel de Administración" style="cursor: pointer;">
          <img src="/icons/icono_administrador.svg" alt="Admin" class="me-2" style="width: 40px; height: 40px;">
          Admin
        </a>
      `;
      
      navbarNav.insertBefore(adminItem, profileItem);
    }
  } else {
    if (adminBtn) {
      adminBtn.parentElement.remove();
    }
  }
}

// ========================
// RENDERIZADO DE CONTENIDO
// ========================
async function renderTopAlbums() {
  try {
    const res = await fetch(`${API_BASE_URL}/albums/top`, { credentials: "include" });
    const albums = await res.json();
    
    const container = document.getElementById("topAlbumsRow");
    if (!container) return;
    
    if (albums.length === 0) {
      container.innerHTML = '<div class="col-12 text-center text-muted"><em>No hay álbumes con reseñas aún</em></div>';
      return;
    }
    
    container.innerHTML = "";
    albums.slice(0, 20).forEach(album => {
      if (album && album.images && album.images.length > 0) {
        const div = document.createElement("div");
        div.className = "top-album-card";
        div.style.cssText = "min-width: 200px; max-width: 200px; flex-shrink: 0; cursor: pointer;";
        div.innerHTML = `
          <div class="card h-100" style="cursor:pointer;" onclick="window.renderAlbumDetailsLogic('${album.id}')">
            <img src="${album.images[0].url}" class="card-img-top" style="aspect-ratio:1/1; object-fit:cover;">
            <div class="card-body p-2">
              <h6 class="card-title text-truncate" style="font-size:1.1rem; font-weight: 600;">${album.name}</h6>
              <small class="text-muted text-truncate d-block">${album.artists[0].name}</small>
              <small class="text-warning">${createStars(Math.round(album.avgStars || 0))} (${album.reviewCount || 0})</small>
            </div>
          </div>
        `;
        container.appendChild(div);
      }
    });
    
    // Actualizar flechas del carousel después de cargar los álbumes
    setTimeout(() => {
        updateCarouselArrows();
        // Asegurar que las flechas estén visibles inicialmente si hay contenido
        const arrowLeft = document.getElementById("arrowLeft");
        const arrowRight = document.getElementById("arrowRight");
        if (arrowLeft && arrowRight && albums.length > 4) {
            arrowLeft.style.opacity = '0.5'; // Inicialmente deshabilitada
            arrowRight.style.opacity = '1';   // Inicialmente habilitada
        }
    }, 200);
  } catch (err) {
    console.error("Error cargando top albums:", err);
  }
}

async function renderMostReviewedAlbums() {
  try {
    const res = await fetch(`${API_BASE_URL}/albums/top`, { credentials: "include" });
    const albums = await res.json();
    
    const row = document.getElementById("mostReviewedAlbumsRow");
    if (!row) return;
    
    if (albums.length === 0) {
      row.innerHTML = '<div class="col-12 text-center text-muted"><em>No hay álbumes con reseñas aún</em></div>';
      return;
    }
    
    row.innerHTML = "";
    albums.slice(0, 8).forEach(album => {
      if (album && album.images && album.images.length > 0) {
        const col = document.createElement("div");
        col.className = "col-md-3 col-sm-6 mb-4";
        col.innerHTML = `
          <div class="card shadow-sm h-100" style="cursor:pointer;" onclick="window.renderAlbumDetailsLogic('${album.id}')">
            <img src="${album.images[0].url}" class="card-img-top" style="aspect-ratio:1/1; object-fit:cover;">
            <div class="card-body">
              <h5 class="card-title text-truncate" style="font-size:1.4rem; font-weight: 600;">${album.name}</h5>
              <p class="text-muted text-truncate">${album.artists[0].name}</p>
              <small class="text-warning">${createStars(Math.round(album.avgStars || 0))} (${album.reviewCount || 0})</small>
            </div>
          </div>
        `;
        row.appendChild(col);
      }
    });
  } catch (err) {
    console.error("Error cargando most reviewed albums:", err);
  }
}

async function renderRandomHighStarReviews() {
  try {
    const res = await fetch(`${API_BASE_URL}/reviews/random`, { credentials: "include" });
    const reviews = await res.json();
    
    const row = document.getElementById("randomReviewsRow");
    if (!row) return;
    
    if (reviews.length === 0) {
      row.innerHTML = '<div class="col-12 text-center text-muted"><em>No hay reseñas aún</em></div>';
      return;
    }
    
    row.innerHTML = "";
    const highStarReviews = reviews.filter(r => r.stars >= 4).slice(0, 8);
    
    if (highStarReviews.length === 0) {
      row.innerHTML = '<div class="col-12 text-center text-muted"><em>No hay reseñas de 4+ estrellas aún</em></div>';
      return;
    }
    
    highStarReviews.forEach(review => {
      const profileSrc = getProfileImageUrl(review.profile_pic_url, '30');
      
      const col = document.createElement("div");
      col.className = "col-md-3 col-sm-6 mb-4";
      col.style.cursor = "pointer";
      col.onclick = () => window.renderAlbumDetailsLogic(review.spotifyId);
      col.innerHTML = `
        <div class="card shadow-sm h-100">
          <div class="card-body">
            <div class="d-flex align-items-start mb-2">
              <img src="${review.albumCoverUrl}" class="rounded me-3" style="width: 50px; height: 50px; object-fit: cover;">
              <div>
                <h6 class="card-title m-0 text-truncate" style="font-size:0.9rem;">${review.albumName}</h6>
                <small class="text-muted d-block text-truncate">${review.artistName}</small>
              </div>
            </div>
            <div class="d-flex align-items-center mb-2">
              <img src="${profileSrc}" 
                   class="rounded-circle me-2" 
                   style="width: 30px; height: 30px; object-fit: cover;" 
                   data-user-id="${review.user_id}"
                   onerror="handleImageError(this, '30')"
                   alt="Foto de perfil de ${review.username}">
              <p class="card-text m-0 small">Por <strong class="review-username" 
                                                        data-user-id="${review.user_id}"
                                                        data-username="${review.username}">${review.username}</strong></p>
            </div>
            <p class="card-text text-warning">${createStars(review.stars)}</p>
            <p class="small" style="color: #E0E0E0; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">${review.comment}</p>
          </div>
        </div>
      `;
      row.appendChild(col);
      
      // Enhance the newly added content
      enhanceNewContent(col);
    });
  } catch (err) {
    console.error("Error cargando random reviews:", err);
  }
}

// ========================
// BÚSQUEDA - Movido a DOMContentLoaded
// ========================

async function renderAlbums(albums) {
  const row = document.getElementById("albumsRow");
  if (!row) return;
  row.innerHTML = "";
  
  for (const album of albums) {
    const img = album.images[0]?.url || "";
    const spotify_id = album.id;
    let starsAvg = 0, reviewCount = 0;
    
    try {
      const resReviews = await fetch(`${API_BASE_URL}/reviews/album/${spotify_id}`, { credentials: "include" });
      const reviews = await resReviews.json();
      reviewCount = reviews.length;
      if (reviewCount > 0) starsAvg = Math.round(reviews.reduce((a,b)=>a+b.stars,0)/reviewCount);
    } catch (e){}
    
    const col = document.createElement("div");
    col.className = "col-md-3 col-sm-6 mb-4";
    col.innerHTML = `
      <div class="card shadow-sm h-100" onclick="window.renderAlbumDetailsLogic('${spotify_id}')" style="cursor:pointer;">
        <img src="${img}" class="card-img-top" style="aspect-ratio:1/1; object-fit:cover;">
        <div class="card-body">
          <h5 class="card-title text-truncate" style="font-size:1.4rem; font-weight: 600;">${album.name}</h5>
          <p class="text-muted text-truncate">${album.artists[0].name}</p>
          <small>${createStars(starsAvg)} (${reviewCount})</small>
        </div>
      </div>`;
    row.appendChild(col);
  }
}

// ========================
// PERFIL DE USUARIO
// ========================
async function showProfile() {
    if (!currentUserId) { 
        await checkSession();
        if (!currentUserId) {
            showAuth(); 
            return;
        }
    }
    
    if (!profileContainer) {
         showApp(); 
         return;
    }
    
    document.getElementById("authContainer").style.display = "none";
    document.getElementById("navbar").style.display = "block";
    document.getElementById("searchContainer").style.display = "none";
    document.getElementById("albumFeed").style.display = "none";
    document.getElementById("albumDetailContainer").style.display = "none";
    profileContainer.style.display = "block";
    
    loadUserProfile(currentUserId);
}

async function loadUserProfile(userId) {
    if (profileUsername) profileUsername.textContent = "Cargando perfil...";
    if (totalReviewsEl) totalReviewsEl.textContent = "0";
    if (avgStarsEl) avgStarsEl.textContent = "0.0";
    
    // Reset social stats
    const followersCountEl = document.getElementById('followersCount');
    const followingCountEl = document.getElementById('followingCount');
    if (followersCountEl) followersCountEl.textContent = "0";
    if (followingCountEl) followingCountEl.textContent = "0";
    
    if (topReviewsContainer) topReviewsContainer.innerHTML = '';
    if (noTopReviewsMessage) noTopReviewsMessage.style.display = 'none';
    
    try {
        // Load both profile data and social stats
        const [profileResponse, socialStatsResponse] = await Promise.all([
            fetch(`${API_BASE_URL}/user/profile/${userId}`, { credentials: "include" }),
            fetch(`${API_BASE_URL}/api/users/${userId}/social-stats`, { credentials: "include" })
        ]);
        
        if (profileResponse.status === 401 || profileResponse.status === 403) {
            await checkSession();
            return;
        }
        
        if (!profileResponse.ok) {
            throw new Error(`Error al cargar el perfil: Estado ${profileResponse.status}`);
        }
        
        const data = await profileResponse.json();
        console.log('Datos del perfil recibidos:', data);
        
        if (profileUsername) profileUsername.textContent = data.username || 'Usuario Desconocido';
        if (totalReviewsEl) totalReviewsEl.textContent = data.totalReviews;
        if (avgStarsEl) avgStarsEl.textContent = parseFloat(data.avgStars).toFixed(1);
        
        // Load social stats if available
        if (socialStatsResponse.ok) {
            const socialData = await socialStatsResponse.json();
            if (socialData.success && followersCountEl && followingCountEl) {
                followersCountEl.textContent = socialData.socialStats.followersCount;
                followingCountEl.textContent = socialData.socialStats.followingCount;
            }
        }
        
        // Update notifications count in profile
        updateProfileNotificationCount();
        
        // Enhanced profile picture loading with improved error handling and validation
        if (profilePictureEl) {
            const profilePictureUrl = data.profilePictureUrl || data.profile_pic_url;
            await loadProfilePictureWithEnhancedValidation(profilePictureUrl, userId);
        }
        
        if (data.topReviews && data.topReviews.length > 0 && topReviewsContainer) {
            let reviewsHTML = '';
            data.topReviews.forEach(review => {
                const stars = createStars(review.stars);
                reviewsHTML += `
                    <li class="list-group-item d-flex align-items-center mb-2 p-3 border rounded shadow-sm">
                        <img src="${review.albumCoverUrl}" 
                            alt="${review.albumName}" 
                            class="rounded me-3" 
                            style="width: 60px; height: 60px; object-fit: cover;">
                        <div>
                            <h6 class="mb-0 text-primary">${review.albumName} - ${review.artistName}</h6>
                            <p class="mb-1 text-warning">${stars} <span class="text-muted small">(${review.stars}/5)</span></p>
                            <p class="mb-0 small fst-italic text-break">"${review.comment}"</p>
                        </div>
                    </li>
                `;
            });
            topReviewsContainer.innerHTML = `<ul class="list-unstyled">${reviewsHTML}</ul>`;
        } else if (noTopReviewsMessage) {
            noTopReviewsMessage.style.display = 'block';
        }
    } catch (error) {
        console.error("Error FATAL al cargar perfil o problema de red:", error);
        await checkSession();
        if (profileUsername) profileUsername.textContent = "Error al cargar los datos. Intente recargar.";
    }
}

// ========================
// EVENT LISTENERS
// ========================
document.addEventListener("DOMContentLoaded", () => {
    // Event listeners para perfil
    if (profileLink) {
        profileLink.addEventListener('click', async(e) => {
            e.preventDefault();
            await showProfile();
        });
    }
    
    if (changePhotoBtn && photoFileInput) {
        changePhotoBtn.addEventListener('click', () => {
            photoFileInput.click();
        });
        
        photoFileInput.addEventListener('change', uploadProfilePicture);
    }

    // Initialize notification system
    notificationSystem.init();

    // Event listener para botón de login en landing page
    const landingLoginBtn = document.getElementById("landingLoginBtn");
    if (landingLoginBtn) {
        landingLoginBtn.addEventListener("click", () => {
            console.log("Landing login button clicked");
            navigateToLogin();
        });
    }

    // Event listeners para login y registro
    const loginBtn = document.getElementById("loginBtn");
    const registerBtn = document.getElementById("registerBtn");
    const logoutBtn = document.getElementById("logoutBtn");

    if (loginBtn) {
        loginBtn.addEventListener("click", async () => {
            const username = document.getElementById("loginUsername").value.trim();
            const password = document.getElementById("loginPassword").value;
            if (!username || !password) {
                const messageDiv = document.getElementById("message");
                messageDiv.innerHTML = '<div class="alert alert-warning">⚠️ Por favor ingresa usuario y contraseña</div>';
                return;
            }

            try {
                const res = await fetch(`${API_BASE_URL}/login`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ username, password })
                });
                const data = await res.json();
                if (data.success) {
                    currentUserId = data.userId;
                    currentUsername = data.username;
                    if (userDisplayEl) userDisplayEl.textContent = data.username;
                    
                    // Update navbar profile picture and load profile picture with enhanced validation
                    const profilePictureUrl = data.profilePictureUrl || data.profile_pic_url;
                    updateNavbarProfilePicture(profilePictureUrl);
                    
                    if (profilePictureUrl && profilePictureEl) {
                        await loadProfilePictureWithEnhancedValidation(profilePictureUrl, data.userId);
                    }
                    
                    // Mostrar botón de admin si es administrador
                    showAdminButton(data.role === 'admin');
                    
                    // Redirect to main application after successful login
                    showApp();
                    
                    // Initialize notifications after successful login
                    setTimeout(() => {
                        notificationSystem.updateUnreadCount();
                    }, 1000);
                } else {
                    console.log(data.error);
                    
                    // Mostrar mensaje de error específico para cuentas bloqueadas
                    const messageDiv = document.getElementById("message");
                    if (res.status === 403 && data.message) {
                        messageDiv.innerHTML = `<div class="alert alert-danger">🚫 ${data.message}</div>`;
                    } else {
                        messageDiv.innerHTML = `<div class="alert alert-danger">❌ ${data.error}</div>`;
                    }
                }
            } catch (err) {
                console.error(err);
                const messageDiv = document.getElementById("message");
                messageDiv.innerHTML = '<div class="alert alert-danger">🚨 Error de conexión con el servidor</div>';
            }
        });
    }

    if (registerBtn) {
        registerBtn.addEventListener("click", async () => {
            const username = document.getElementById("regUsername").value.trim();
            const email = document.getElementById("regEmail").value.trim();
            const password = document.getElementById("regPassword").value;
                
            const messageElement = document.getElementById("registerMessage");
            messageElement.innerHTML = '';

            if (!username || !email || !password) {
                messageElement.innerHTML = '<div class="alert alert-warning py-2">⚠️ Todos los campos son obligatorios.</div>';
                return; 
            }
            try {
                const res = await fetch(`${API_BASE_URL}/register`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ username, email, password })
                });
                const data = await res.json();
                
                if (data.success) {
                    messageElement.innerHTML = '<div class="alert alert-success py-2">✅ ¡Registro exitoso! Puedes iniciar sesión.</div>';
                    document.getElementById("regUsername").value = '';
                    document.getElementById("regEmail").value = '';
                    document.getElementById("regPassword").value = '';
                } else {
                    const errorMsg = data.error || "Error desconocido al registrar.";
                    messageElement.innerHTML = `<div class="alert alert-danger py-2">❌ Error: ${errorMsg}</div>`;
                }
            } catch (err) {
                console.error(err);
                messageElement.innerHTML = '<div class="alert alert-danger py-2">🚨 Error de conexión con el servidor.</div>';
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
            console.log("Logout button clicked");
            
            try {
                await fetch(`${API_BASE_URL}/logout`, { method: "POST", credentials: "include" });
                console.log("Logout request completed");
            } catch (err) {
                console.error("Error during logout:", err);
            }
            
            // Limpiar variables globales
            currentUserId = null;
            currentUsername = null;
            if (userDisplayEl) userDisplayEl.textContent = 'Usuario';
            
            // Limpiar imagen de perfil de la UI
            if (profilePictureEl) {
                profilePictureEl.src = getProfileImageUrl(null, '100');
            }
            
            // Redirigir a landing page después del logout
            setTimeout(() => {
                console.log("Redirecting to landing page after logout");
                showLandingPage();
            }, 100);
        });
    }

    // Event listener para búsqueda
    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
        searchInput.addEventListener("keyup", async (e) => {
            const query = e.target.value.trim();
            document.getElementById("welcomeMessage").style.display = "none";
            document.getElementById("topAlbumsContainer").style.display = "none";
            document.getElementById("mostReviewedAlbumsSection").style.display = "none"; 
            document.getElementById("randomReviewsSection").style.display = "none";
            
            if (query.length < 2) {
                document.getElementById("albumsRow").innerHTML = "";
                renderTopAlbums();
                renderMostReviewedAlbums(); 
                renderRandomHighStarReviews();
                document.getElementById("topAlbumsContainer").style.display = "block";
                document.getElementById("mostReviewedAlbumsSection").style.display = "block"; 
                document.getElementById("randomReviewsSection").style.display = "block";
                document.getElementById("welcomeMessage").style.display = "block";
                return;
            }
            
            try {
                const res = await fetch(`${API_BASE_URL}/search?q=${query}`, { credentials: "include" });
                const data = await res.json();
                if (data.albums?.items?.length > 0) renderAlbums(data.albums.items);
                else document.getElementById("albumsRow").innerHTML = "<div class='col-12 text-center'>Sin resultados.</div>";
            } catch (err) {
                console.error(err);
            }
        });
    }

    // Event listeners para el carousel
    const arrowLeft = document.getElementById("arrowLeft");
    const arrowRight = document.getElementById("arrowRight");
    const topAlbumsRow = document.getElementById("topAlbumsRow");
    
    if (arrowLeft && arrowRight) {
        arrowLeft.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            scrollCarouselFixed('left');
        });
        
        arrowRight.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            scrollCarouselFixed('right');
        });
    }
    
    // Event listener para actualizar flechas cuando se hace scroll
    if (topAlbumsRow) {
        topAlbumsRow.addEventListener("scroll", () => {
            updateCarouselArrows();
        });
    }
});

// ========================
// UPLOAD DE FOTO DE PERFIL
// ========================
async function uploadProfilePicture() {
    if (!photoFileInput.files.length) {
        console.log('No hay archivos seleccionados');
        return;
    }
    
    const file = photoFileInput.files[0];
    console.log('Archivo seleccionado:', file.name, 'Tamaño:', file.size, 'Tipo:', file.type);
    
    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
        showUploadMessage('❌ Por favor, selecciona un archivo de imagen válido', 'error');
        return;
    }
    
    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showUploadMessage('❌ La imagen es demasiado grande. Máximo 5MB', 'error');
        return;
    }
    
    const formData = new FormData();
    formData.append('profilePicture', file);
    
    // Guardar estado anterior para rollback
    const previousButtonText = changePhotoBtn ? changePhotoBtn.innerHTML : '';
    const previousButtonDisabled = changePhotoBtn ? changePhotoBtn.disabled : false;
    const previousImageSrc = profilePictureEl ? profilePictureEl.src : '';
    const previousImageOpacity = profilePictureEl ? profilePictureEl.style.opacity : '1';
    
    // Mostrar indicador de carga
    if (changePhotoBtn) {
        changePhotoBtn.innerHTML = '<img src="/icons/icono_ftperfil_predeterminado.svg" alt="Subiendo" style="width: 30px; height: 30px; filter: brightness(0) invert(1); animation: spin 1s linear infinite;"> Subiendo...';
        changePhotoBtn.disabled = true;
    }
    
    // Mostrar imagen de carga temporal
    if (profilePictureEl) {
        profilePictureEl.style.opacity = '0.5';
    }
    
    // Mostrar feedback inmediato
    showUploadMessage('📤 Subiendo imagen...', 'info');
    
    try {
        console.log('Iniciando upload de foto para usuario:', currentUserId);
        
        const response = await fetch(`${API_BASE_URL}/user/upload-photo`, {
            method: 'POST',
            body: formData, 
            credentials: 'include'
        });
        
        console.log('Respuesta del servidor:', response.status);
        
        const data = await response.json();
        console.log('Datos de respuesta completos:', data);
        
        if (response.ok && data.success) {
            console.log('Foto subida exitosamente:', data.url);
            
            try {
                // Actualizar imagen inmediatamente con cache busting
                await updateProfilePicture(data.url);
                
                // Mostrar mensaje de éxito
                showUploadMessage('✅ Foto actualizada correctamente', 'success');
                
                // Limpiar el input file
                photoFileInput.value = '';
                
            } catch (updateError) {
                console.error('Error actualizando imagen después del upload:', updateError);
                
                // Rollback al estado anterior
                if (profilePictureEl) {
                    profilePictureEl.src = previousImageSrc;
                    profilePictureEl.style.opacity = previousImageOpacity;
                }
                
                showUploadMessage('⚠️ Imagen subida pero error al mostrar. Recarga la página', 'warning');
            }
            
        } else {
            console.error('Error en respuesta:', data);
            
            // Rollback al estado anterior
            if (profilePictureEl) {
                profilePictureEl.src = previousImageSrc;
                profilePictureEl.style.opacity = previousImageOpacity;
            }
            
            // Mostrar error específico del servidor
            const errorMessage = data.error || 'Error desconocido';
            showUploadMessage(`❌ ${errorMessage}`, 'error');
        }
        
    } catch (error) {
        console.error('Error de conexión:', error);
        
        // Rollback completo al estado anterior
        if (profilePictureEl) {
            profilePictureEl.src = previousImageSrc;
            profilePictureEl.style.opacity = previousImageOpacity;
        }
        
        showUploadMessage('🚨 Error de conexión. Imagen anterior mantenida', 'error');
        
    } finally {
        // Restaurar botón al estado anterior
        if (changePhotoBtn) {
            changePhotoBtn.innerHTML = previousButtonText || '<img src="/icons/icono_ftperfil_predeterminado.svg" alt="Cambiar foto" style="width: 30px; height: 30px; filter: brightness(0) invert(1);">';
            changePhotoBtn.disabled = previousButtonDisabled;
        }
        
        // Limpiar el input file solo si no hubo errores
        if (photoFileInput.value) {
            photoFileInput.value = '';
        }
    }
}

// Enhanced function for loading profile pictures with improved validation and error handling
async function loadProfilePictureWithEnhancedValidation(imageUrl, userId = null) {
    if (!profilePictureEl) {
        console.error('Elemento profilePicture no encontrado');
        return false;
    }
    
    const targetUserId = userId || currentUserId;
    const placeholderUrl = generatePlaceholderUrl('100');
    
    // Store previous state for potential rollback
    const previousState = {
        src: profilePictureEl.src,
        opacity: profilePictureEl.style.opacity || '1',
        classList: Array.from(profilePictureEl.classList)
    };
    
    // Handle empty or null image URL
    if (!imageUrl) {
        console.log('No profile picture URL provided, using placeholder');
        profilePictureEl.src = placeholderUrl;
        setImageState(profilePictureEl, 'normal');
        return true;
    }
    
    console.log(`Loading profile picture: ${imageUrl} for user ${targetUserId}`);
    
    // Show loading state with improved visual feedback
    setImageState(profilePictureEl, 'loading');
    showImageLoadingProgress('Cargando imagen de perfil...', 'info');
    
    try {
        // Step 1: Validate image existence with enhanced dual verification
        const validationResult = await validateImageExistsEnhanced(imageUrl, targetUserId);
        
        if (!validationResult.exists && !validationResult.fallbackMode) {
            console.log(`Image validation failed: ${validationResult.reason}`);
            profilePictureEl.src = placeholderUrl;
            setImageState(profilePictureEl, 'normal');
            showImageLoadingProgress(
                validationResult.autoRepaired ? 
                'Imagen sincronizada automáticamente' : 
                'Imagen no encontrada, usando imagen por defecto', 
                validationResult.autoRepaired ? 'info' : 'warning'
            );
            return true; // Not an error, just no image available
        }
        
        // If in fallback mode, log the situation but continue with loading
        if (validationResult.fallbackMode) {
            console.log('Using fallback validation mode, proceeding with direct image loading');
        }
        
        // Step 2: Generate cache-busted URL for consistent loading
        const cacheBustUrl = generateEnhancedCacheBustUrl(imageUrl);
        
        // Step 3: Preload image with timeout and retry logic
        const loadedUrl = await preloadImageWithRetry(cacheBustUrl, {
            timeout: 8000,
            retries: 2,
            retryDelay: 1000
        });
        
        // Step 4: Apply loaded image with smooth transition
        await applyImageWithTransition(profilePictureEl, loadedUrl);
        
        setImageState(profilePictureEl, 'success');
        console.log('Profile picture loaded successfully');
        showImageLoadingProgress('Imagen de perfil cargada correctamente', 'success');
        
        return true;
        
    } catch (error) {
        console.error('Error loading profile picture:', error);
        
        // Enhanced error handling with graceful degradation
        const fallbackSuccess = await handleImageLoadingError(
            error, 
            imageUrl, 
            profilePictureEl, 
            placeholderUrl, 
            previousState
        );
        
        return fallbackSuccess;
    }
}



// Función para actualizar la imagen de perfil inmediatamente con rollback en caso de error
async function updateProfilePicture(imageUrl) {
    if (!profilePictureEl) {
        console.error('Elemento profilePicture no encontrado');
        return;
    }
    
    console.log('Actualizando imagen de perfil a:', imageUrl);
    
    // Guardar estado anterior para rollback
    const previousSrc = profilePictureEl.src;
    const previousOpacity = profilePictureEl.style.opacity;
    
    try {
        // Mostrar feedback inmediato de actualización
        showImageLoadingFeedback('Actualizando imagen de perfil...', 'info');
        
        // Use enhanced validation logic for immediate updates
        await loadProfilePictureWithEnhancedValidation(imageUrl);
        console.log(`Imagen actualizada para usuario ${currentUserId}: ${imageUrl}`);
        
        // Update navbar profile picture as well
        updateNavbarProfilePicture(imageUrl);
        
        // Feedback de éxito
        showImageLoadingFeedback('✅ Imagen de perfil actualizada correctamente', 'success');
        return imageUrl;
        
    } catch (error) {
        console.error('Error actualizando imagen de perfil:', error);
        
        // Rollback al estado anterior en caso de error
        profilePictureEl.src = previousSrc;
        profilePictureEl.style.opacity = previousOpacity;
        
        showImageLoadingFeedback('❌ Error actualizando imagen, manteniendo imagen anterior', 'error');
        throw error;
    }
}

// Enhanced cache busting function with additional parameters
function generateEnhancedCacheBustUrl(url) {
    if (!url) return url;
    
    const separator = url.includes('?') ? '&' : '?';
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    
    // Add both timestamp and random ID for stronger cache busting
    return `${url}${separator}t=${timestamp}&r=${randomId}`;
}

// Legacy function maintained for backward compatibility
function generateCacheBustUrl(url) {
    if (!url) return url;
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}t=${Date.now()}`;
}

// Enhanced placeholder URL generator
function generatePlaceholderUrl(size = '50') {
    // Use the default profile icon instead of generating SVG
    return `/icons/icono_ftperfil_predeterminado.svg`;
}

// Enhanced preload function with retry logic
async function preloadImageWithRetry(url, options = {}) {
    const { timeout = 5000, retries = 1, retryDelay = 1000 } = options;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            return await preloadImageWithTimeout(url, timeout);
        } catch (error) {
            console.log(`Image preload attempt ${attempt + 1} failed:`, error.message);
            
            if (attempt < retries) {
                console.log(`Retrying in ${retryDelay}ms...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            } else {
                throw error;
            }
        }
    }
}

// Preload image with timeout
function preloadImageWithTimeout(url, timeout = 5000) {
    return new Promise((resolve, reject) => {
        if (!url) {
            reject(new Error('Empty image URL'));
            return;
        }
        
        const img = new Image();
        let timeoutId;
        
        const cleanup = () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }
            img.onload = null;
            img.onerror = null;
            img.onabort = null;
        };
        
        timeoutId = setTimeout(() => {
            cleanup();
            reject(new Error(`Image loading timeout after ${timeout}ms`));
        }, timeout);
        
        img.onload = () => {
            cleanup();
            console.log('Image preloaded successfully:', url);
            resolve(url);
        };
        
        img.onerror = (event) => {
            cleanup();
            console.error('Error preloading image:', url, event);
            reject(new Error(`Image loading failed: ${url}`));
        };
        
        img.onabort = () => {
            cleanup();
            reject(new Error('Image loading aborted'));
        };
        
        // Set crossOrigin if needed
        if (url.startsWith('http') && !url.startsWith(window.location.origin)) {
            img.crossOrigin = 'anonymous';
        }
        
        img.src = url;
    });
}

// Apply image with smooth transition
async function applyImageWithTransition(imgElement, url) {
    return new Promise((resolve) => {
        // Fade out current image
        imgElement.style.transition = 'opacity 0.2s ease-in-out';
        imgElement.style.opacity = '0.5';
        
        setTimeout(() => {
            imgElement.src = url;
            
            // Fade in new image
            setTimeout(() => {
                imgElement.style.opacity = '1';
                resolve();
            }, 50);
        }, 100);
    });
}

// Enhanced error handling for image loading
async function handleImageLoadingError(error, originalUrl, imgElement, placeholderUrl, previousState) {
    console.error('Handling image loading error:', error.message);
    
    // Determine error type and appropriate response
    if (error.message.includes('timeout') || error.message.includes('Timeout')) {
        // For timeout errors, try direct loading without validation
        try {
            console.log('Attempting direct image load after timeout...');
            const directUrl = generateCacheBustUrl(originalUrl);
            await preloadImageWithTimeout(directUrl, 3000);
            
            await applyImageWithTransition(imgElement, directUrl);
            setImageState(imgElement, 'success');
            showImageLoadingProgress('Imagen cargada (validación lenta)', 'info');
            
            return true;
            
        } catch (directError) {
            console.error('Direct loading also failed:', directError);
        }
    }
    
    // For all other errors or if direct loading failed, use placeholder
    await applyImageWithTransition(imgElement, placeholderUrl);
    setImageState(imgElement, 'error');
    
    // Show appropriate error message
    const errorMessage = error.message.includes('timeout') ? 
        'Tiempo de carga agotado, usando imagen por defecto' :
        'Error cargando imagen, usando imagen por defecto';
    
    showImageLoadingProgress(errorMessage, 'error');
    
    return false; // Indicate fallback was used
}

// Enhanced function with comprehensive dual verification for image existence
async function validateImageExistsEnhanced(imageUrl, userId = null) {
    const targetUserId = userId || currentUserId;
    
    if (!imageUrl || !targetUserId) {
        console.log('Image validation: Missing URL or userId');
        return { 
            exists: false, 
            reason: 'Missing required parameters',
            autoRepaired: false 
        };
    }
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // Increased timeout
        
        const response = await fetch(`${API_BASE_URL}/check-image/${targetUserId}`, {
            credentials: 'include',
            signal: controller.signal,
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            console.error(`Image validation error: ${response.status} ${response.statusText}`);
            
            // Handle specific error cases
            if (response.status === 404) {
                console.warn('Image check endpoint not available, falling back to direct validation');
                // Fallback: assume image exists and let preloading handle validation
                return { 
                    exists: true, 
                    reason: 'Endpoint not available, using direct validation',
                    autoRepaired: false,
                    fallbackMode: true
                };
            }
            
            if (response.status === 401 || response.status === 403) {
                return { 
                    exists: false, 
                    reason: 'Authentication required for image validation',
                    autoRepaired: false 
                };
            }
            
            // For server errors, assume image might exist to avoid false negatives
            return { 
                exists: true, 
                reason: 'Server error, assuming image exists',
                autoRepaired: false 
            };
        }
        
        const data = await response.json();
        console.log('Enhanced dual verification result:', data);
        
        // Process dual verification results
        let autoRepaired = false;
        if (data.dualVerification) {
            const verification = data.dualVerification;
            
            if (verification.autoRepaired) {
                console.log('Auto-repair performed during validation');
                autoRepaired = true;
                showImageLoadingProgress('Datos de imagen sincronizados automáticamente', 'info');
            }
            
            if (!verification.consistent && !verification.autoRepaired) {
                console.warn('Inconsistency detected in dual verification:', verification);
                showImageLoadingProgress('Inconsistencia detectada en imagen de perfil', 'warning');
            }
        }
        
        const imageExists = data.exists && data.url === imageUrl;
        
        return {
            exists: imageExists,
            reason: imageExists ? 'Image validated successfully' : 'Image not found or URL mismatch',
            autoRepaired: autoRepaired,
            dualVerification: data.dualVerification
        };
        
    } catch (error) {
        if (error.name === 'AbortError') {
            console.error('Timeout validating image:', imageUrl);
            return { 
                exists: false, 
                reason: 'Validation timeout',
                autoRepaired: false 
            };
        } else {
            console.error('Error in image validation:', error);
            // In case of network error, use direct validation as fallback
            return await performDirectImageValidation(imageUrl);
        }
    }
}

// Fallback validation function that directly tests image loading
async function performDirectImageValidation(imageUrl) {
    console.log('Performing direct image validation for:', imageUrl);
    
    try {
        // Try to preload the image directly to see if it exists
        await preloadImageWithTimeout(imageUrl, 3000);
        
        return {
            exists: true,
            reason: 'Direct validation successful',
            autoRepaired: false,
            directValidation: true
        };
        
    } catch (error) {
        console.log('Direct validation failed:', error.message);
        
        return {
            exists: false,
            reason: 'Direct validation failed - image not accessible',
            autoRepaired: false,
            directValidation: true
        };
    }
}





// Enhanced function for getting profile image URLs with consistent cache busting
function getProfileImageUrl(profilePicUrl, size = '50') {
    const placeholderUrl = generatePlaceholderUrl(size);
    
    if (!profilePicUrl) {
        return placeholderUrl;
    }
    
    // Use enhanced cache busting for consistent loading
    return generateEnhancedCacheBustUrl(profilePicUrl);
}

// Enhanced function specifically for profile pictures with validation
function getValidatedProfileImageUrl(profilePicUrl, size = '50', userId = null) {
    const placeholderUrl = generatePlaceholderUrl(size);
    
    if (!profilePicUrl) {
        return placeholderUrl;
    }
    
    // For profile pictures, we want to ensure they're properly validated
    // This function returns the URL but the actual validation happens during loading
    return generateEnhancedCacheBustUrl(profilePicUrl);
}

// Enhanced function for handling image loading errors with improved fallback and retry logic
function handleImageError(imgElement, size = '50') {
    const placeholderUrl = generatePlaceholderUrl(size);
    
    // Prevent infinite error loops
    if (imgElement.src === placeholderUrl || imgElement.classList.contains('placeholder-applied')) {
        console.log('Already using placeholder, preventing error loop');
        return;
    }
    
    const originalSrc = imgElement.src;
    console.log(`Image loading failed (${originalSrc}), applying enhanced error handling`);
    
    // Store original URL for potential retry
    if (!imgElement.dataset.originalSrc) {
        imgElement.dataset.originalSrc = originalSrc;
    }
    
    // Initialize retry count
    if (imgElement.dataset.retryCount === undefined) {
        imgElement.dataset.retryCount = '0';
    }
    
    const retryCount = parseInt(imgElement.dataset.retryCount);
    const maxRetries = 3; // Increased retry attempts
    
    // Apply visual error state
    imgElement.classList.add('image-error');
    imgElement.title = 'Imagen no disponible';
    
    // Enhanced retry logic with exponential backoff
    if (retryCount < maxRetries) {
        const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 8000); // Exponential backoff, max 8s
        
        console.log(`Scheduling retry ${retryCount + 1}/${maxRetries} in ${retryDelay}ms`);
        
        setTimeout(async () => {
            console.log(`Attempting image retry ${retryCount + 1}/${maxRetries}`);
            imgElement.dataset.retryCount = (retryCount + 1).toString();
            
            try {
                // Try different cache busting strategies
                let retryUrl;
                if (retryCount === 0) {
                    // First retry: simple cache bust
                    retryUrl = generateCacheBustUrl(imgElement.dataset.originalSrc);
                } else if (retryCount === 1) {
                    // Second retry: enhanced cache bust
                    retryUrl = generateEnhancedCacheBustUrl(imgElement.dataset.originalSrc);
                } else {
                    // Final retry: try without any parameters
                    retryUrl = imgElement.dataset.originalSrc;
                }
                
                // Preload to verify the image can be loaded
                await preloadImageWithTimeout(retryUrl, 3000);
                
                // If preload succeeds, apply the image
                imgElement.classList.remove('image-error');
                imgElement.src = retryUrl;
                console.log(`Image retry ${retryCount + 1} successful`);
                
            } catch (retryError) {
                console.log(`Image retry ${retryCount + 1} failed:`, retryError.message);
                
                // If this was the last retry, apply placeholder
                if (retryCount + 1 >= maxRetries) {
                    applyFinalPlaceholder(imgElement, placeholderUrl, size);
                }
            }
        }, retryDelay);
        
    } else {
        // Max retries reached, apply final placeholder
        applyFinalPlaceholder(imgElement, placeholderUrl, size);
    }
}

// Apply final placeholder with proper styling
function applyFinalPlaceholder(imgElement, placeholderUrl, size) {
    imgElement.src = placeholderUrl;
    imgElement.classList.add('placeholder-applied');
    imgElement.classList.remove('image-error');
    
    // Add subtle styling to indicate placeholder
    imgElement.style.filter = 'grayscale(20%) opacity(0.8)';
    imgElement.style.border = '1px solid #dee2e6';
    
    console.log(`Applied final placeholder for image (${size}px)`);
}

// Enhanced progress feedback function
function showImageLoadingProgress(message, type, duration = 3000) {
    // Only show error and warning messages to avoid spam
    if (type === 'error' || type === 'warning') {
        showNotification(message, type, 'imageLoadingMessage');
    } else if (type === 'info') {
        // Show info messages briefly
        showNotification(message, type, 'imageLoadingMessage');
    }
    // Success messages are shown very briefly or not at all to avoid noise
}

// Enhanced function to verify session persistence with data synchronization
async function verifySessionPersistence() {
    console.log('Verificando persistencia de sesión...');
    
    try {
        const res = await fetch(`${API_BASE_URL}/me`, { credentials: "include" });
        const data = await res.json();
        
        if (data.loggedIn) {
            console.log('Sesión válida encontrada:', {
                userId: data.userId,
                username: data.username,
                profilePictureUrl: data.profilePictureUrl,
                dataSync: data.dataSync
            });
            
            // Check if data synchronization occurred
            if (data.dataSync && data.dataSync.synchronized && data.dataSync.action !== 'no_action_needed') {
                console.log('Sincronización automática realizada:', data.dataSync.action);
                if (data.dataSync.action === 'cleaned_database_reference') {
                    showImageLoadingFeedback('Referencia de imagen limpiada automáticamente', 'info');
                }
            }
            
            // Verificar que las variables globales estén sincronizadas
            if (currentUserId !== data.userId) {
                console.log('Sincronizando userId:', data.userId);
                currentUserId = data.userId;
            }
            
            if (currentUsername !== data.username) {
                console.log('Sincronizando username:', data.username);
                currentUsername = data.username;
            }
            
            // Cargar foto de perfil si existe y no está ya cargada
            if (data.profilePictureUrl && profilePictureEl) {
                const currentSrc = profilePictureEl.src;
                const expectedUrl = generateCacheBustUrl(data.profilePictureUrl);
                
                // Solo recargar si la imagen actual no coincide
                if (!currentSrc.includes(data.profilePictureUrl.split('/').pop())) {
                    console.log('Loading profile picture from persistent session');
                    await loadProfilePictureWithEnhancedValidation(data.profilePictureUrl, data.userId);
                }
            } else if (!data.profilePictureUrl && profilePictureEl) {
                // Si no hay URL de perfil, asegurar que se muestre placeholder
                const placeholderUrl = getProfileImageUrl(null, '100');
                if (profilePictureEl.src !== placeholderUrl) {
                    profilePictureEl.src = placeholderUrl;
                }
            }
            
            return true;
        } else {
            console.log('No hay sesión válida');
            return false;
        }
    } catch (error) {
        console.error('Error verificando persistencia de sesión:', error);
        return false;
    }
}

// Function to trigger manual data synchronization
async function triggerDataSynchronization() {
    console.log('Iniciando sincronización manual de datos...');
    
    try {
        const response = await fetch(`${API_BASE_URL}/sync-profile-data`, {
            method: 'POST',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`Error en sincronización: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Resultado de sincronización:', data);
        
        if (data.success) {
            showNotification(data.message, 'success');
            
            // Refresh session data after synchronization
            await verifySessionPersistence();
            
            return data.results;
        } else {
            showNotification('Error en sincronización de datos', 'error');
            return null;
        }
    } catch (error) {
        console.error('Error en sincronización manual:', error);
        showNotification('Error de conexión durante sincronización', 'error');
        return null;
    }
}

// Function to perform system-wide data synchronization (admin only)
async function triggerSystemSynchronization() {
    console.log('Iniciando sincronización del sistema...');
    
    try {
        const response = await fetch(`${API_BASE_URL}/system/sync-data`, {
            method: 'POST',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`Error en sincronización del sistema: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Resultado de sincronización del sistema:', data);
        
        if (data.success) {
            showNotification(data.message, 'success');
            return data.stats;
        } else {
            showNotification('Error en sincronización del sistema', 'error');
            return null;
        }
    } catch (error) {
        console.error('Error en sincronización del sistema:', error);
        showNotification('Error de conexión durante sincronización del sistema', 'error');
        return null;
    }
}

// Función para mostrar mensajes de upload
function showUploadMessage(message, type) {
    showNotification(message, type, 'uploadMessage');
}

// Función para mostrar feedback de carga de imágenes
function showImageLoadingFeedback(message, type) {
    // Solo mostrar mensajes de error y warning para evitar spam
    if (type === 'error' || type === 'warning') {
        showNotification(message, type, 'imageLoadingMessage');
    }
}

// Función unificada para mostrar notificaciones
function showNotification(message, type, containerId = 'notification') {
    // Crear o encontrar contenedor de mensajes
    let messageContainer = document.getElementById(containerId);
    if (!messageContainer) {
        messageContainer = document.createElement('div');
        messageContainer.id = containerId;
        messageContainer.className = 'notification';
        messageContainer.style.cssText = `
            position: fixed;
            top: ${containerId === 'uploadMessage' ? '20px' : '70px'};
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: bold;
            z-index: 10000;
            transition: opacity 0.3s ease, transform 0.3s ease;
            max-width: 300px;
            word-wrap: break-word;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        `;
        document.body.appendChild(messageContainer);
    }
    
    // Configurar estilo según tipo
    const colors = {
        'success': 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
        'error': 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
        'warning': 'linear-gradient(135deg, #ffc107 0%, #e0a800 100%)',
        'info': 'linear-gradient(135deg, #17a2b8 0%, #138496 100%)'
    };
    
    messageContainer.style.background = colors[type] || colors['info'];
    messageContainer.style.color = type === 'warning' ? '#212529' : 'white';
    messageContainer.textContent = message;
    messageContainer.style.opacity = '1';
    messageContainer.style.transform = 'translateX(0)';
    messageContainer.className = `notification ${type}`;
    
    // Limpiar timeout anterior si existe
    if (messageContainer.hideTimeout) {
        clearTimeout(messageContainer.hideTimeout);
    }
    
    // Ocultar después de un tiempo variable según el tipo
    const hideDelay = type === 'error' ? 5000 : type === 'warning' ? 4000 : 3000;
    
    messageContainer.hideTimeout = setTimeout(() => {
        messageContainer.className += ' hiding';
        messageContainer.style.opacity = '0';
        messageContainer.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (messageContainer.parentNode) {
                messageContainer.parentNode.removeChild(messageContainer);
            }
        }, 300);
    }, hideDelay);
}

// Función para manejar estados visuales de imágenes
function setImageState(imgElement, state) {
    if (!imgElement) return;
    
    // Limpiar clases anteriores
    imgElement.classList.remove('loading', 'error', 'success', 'image-loading', 'image-error', 'image-success');
    
    switch (state) {
        case 'loading':
            imgElement.classList.add('loading', 'image-loading');
            imgElement.style.opacity = '0.6';
            imgElement.style.filter = 'blur(1px)';
            break;
            
        case 'error':
            imgElement.classList.add('error', 'image-error');
            imgElement.style.opacity = '0.8';
            imgElement.style.filter = 'grayscale(20%)';
            imgElement.style.border = '2px dashed #dc3545';
            break;
            
        case 'success':
            imgElement.classList.add('success', 'image-success');
            imgElement.style.opacity = '1';
            imgElement.style.filter = 'none';
            imgElement.style.border = '';
            break;
            
        default:
            imgElement.style.opacity = '1';
            imgElement.style.filter = 'none';
            imgElement.style.border = '';
    }
}

// ========================
// DETALLES DE ÁLBUM Y RESEÑAS
// ========================
window.renderAlbumDetailsLogic = async function(spotify_id) {
    document.getElementById("albumFeed").style.display = "none";
    document.getElementById("searchContainer").style.display = "none";
    document.getElementById("topAlbumsContainer").style.display = "none";
    document.getElementById("mostReviewedAlbumsSection").style.display = "none"; 
    document.getElementById("randomReviewsSection").style.display = "none";
    if (profileContainer) profileContainer.style.display = "none";
    
    // Hide profile viewer if it exists
    const profileViewerContainer = document.getElementById("profileViewerContainer");
    if (profileViewerContainer) {
        profileViewerContainer.style.display = "none";
    }
    
    // Hide profile viewer using the global instance
    if (window.profileViewer) {
        window.profileViewer.hide();
    }
    
    const container = document.getElementById("albumDetailContainer");
    container.style.display = "block";
    container.innerHTML = `<div class="text-center py-5"><div class="spinner-border"></div></div>`;
    
    try {
        const [album, reviews] = await Promise.all([
            fetch(`${API_BASE_URL}/album/${spotify_id}`, {credentials:"include"}).then(r=>r.json()),
            fetch(`${API_BASE_URL}/reviews/album/${spotify_id}`, {credentials:"include"}).then(r=>r.json())
        ]);
        
        container.innerHTML = `
        <div class="col-md-8 mx-auto">
            <button onclick="showApp()" class="btn btn-sm btn-outline-secondary mb-3">← Volver</button>
            <div class="bg-white p-4 rounded shadow">
                <div class="row align-items-center mb-4">
                    <div class="col-md-4"><img src="${album.images[0].url}" class="img-fluid rounded shadow"></div>
                    <div class="col-md-8">
                        <h2 id="albumTitle" style="color: #000000 !important; font-size: 2.8rem; font-weight: 700;">${album.name}</h2>
                        <h5 class="text-muted">${album.artists[0].name}</h5>
                        <p class="text-muted">Fecha de lanzamiento: ${album.release_date}</p>
                        <p class="text-muted">Canciones: ${album.total_tracks}</p>
                    </div>
                </div>
                
                <!-- Reproductor de muestras de audio -->
                <div id="audioPreviewContainer"></div>
                
                <hr>
                <h5 style="color: #424242 !important;">Canciones:</h5>
                <ul class="list-group mb-4" id="albumTracksList">
                    ${album.tracks.items.map((track, i) => 
                        `<li class="list-group-item py-1">${i+1}. ${track.name}</li>`
                    ).join('')}
                </ul>
                <hr>
                <h5 class="reviews-title" style="color: #000000 !important;">Reseñas</h5>
                <div id="reviewsContainer" class="mb-4"></div>
                <div class="card bg-light p-3">
                    <h6>Deja tu reseña</h6>
                    <div id="starSelector" class="fs-3 mb-2" style="cursor:pointer;"></div>
                    <textarea id="reviewComment" class="form-control mb-2" placeholder="Escribe tu reseña..."></textarea>
                    <button id="submitReview" class="btn btn-primary w-100">Enviar</button>
                </div>
            </div>
        </div>
        `;
        
        // Mostrar reseñas existentes
        const revCont = document.getElementById("reviewsContainer");
        if (reviews && reviews.length > 0) {
            const reviewsHtml = reviews.map(r => {
                const profileSrc = getProfileImageUrl(r.profile_pic_url, '60');
                const isOwnReview = r.user_id === currentUserId;
                const reportButton = !isOwnReview ? 
                    `<button class="btn btn-sm btn-outline-danger ms-2" onclick="reportReview(${r.id}, '${r.username}')" title="Reportar reseña">
                        <img src="/icons/icono_reporte.svg" alt="Reportar" style="width: 50px; height: 50px;">
                    </button>` : '';

                return `
                    <div class="border-bottom py-2">
                        <div class="d-flex justify-content-between align-items-start">
                            <div class="d-flex align-items-center">
                                <img src="${profileSrc}" 
                                     class="rounded-circle me-2" 
                                     style="width: 60px; height: 60px; object-fit: cover;"
                                     data-user-id="${r.user_id}"
                                     onerror="handleImageError(this, '60')"
                                     alt="Foto de perfil de ${r.username}">
                                <strong class="review-username" 
                                        style="color: #000000 !important;"
                                        data-user-id="${r.user_id}"
                                        data-username="${r.username}">${r.username}</strong>
                            </div>
                            <div class="d-flex align-items-center">
                                <span class="text-warning">${createStars(r.stars)}</span>
                                ${reportButton}
                            </div>
                        </div>
                        <p class="m-0 text-muted">${r.comment}</p>
                    </div>
                `;
            }).join('');
            revCont.innerHTML = reviewsHtml;
            
            // Enhance the newly added review content
            enhanceNewContent(revCont);
        } else {
            revCont.innerHTML = "<small class='text-muted'>Sin reseñas.</small>";
        }
        
        // Sistema de estrellas para nueva reseña
        let rating = 0;
        const starSel = document.getElementById("starSelector");
        const renderStars = (v) => {
            starSel.innerHTML = "";
            for(let i=1; i<=5; i++){
                const s = document.createElement("span");
                s.innerText = i<=v ? "★" : "☆";
                s.style.color = i<=v ? "gold" : "#ccc";
                s.onclick = () => { rating = i; renderStars(i); };
                starSel.appendChild(s);
            }
        };
        renderStars(0);
        
        // Inicializar reproductor de audio de forma inteligente
        try {
            // Primero verificar si el álbum tiene previews disponibles
            const previewCheck = await fetch(`${API_BASE_URL}/album/${spotify_id}/tracks`, {
                credentials: 'include'
            });
            
            if (previewCheck.ok) {
                const previewData = await previewCheck.json();
                
                if (previewData.hasPreview && previewData.tracksWithPreviewCount > 0) {
                    // Solo inicializar el reproductor si hay previews disponibles
                    const audioPlayer = new AudioPreviewPlayer('audioPreviewContainer', spotify_id);
                    await audioPlayer.initialize();
                } else {
                    // Mostrar mensaje informativo en lugar del reproductor
                    const container = document.getElementById('audioPreviewContainer');
                    if (container) {
                        container.innerHTML = `
                            <div class="audio-preview-unavailable text-center p-3 mb-3" style="background: #f8f9fa; border-radius: 8px; border: 1px solid #dee2e6;">
                                <div class="mb-2">
                                    <img src="/icons/icono_reproducirMuestra.svg" alt="Audio no disponible" style="width: 24px; height: 24px; opacity: 0.5;">
                                </div>
                                <small class="text-muted">
                                    <strong>Muestra de audio no disponible</strong><br>
                                    Este álbum no tiene previews debido a restricciones de licenciamiento.
                                </small>
                            </div>
                        `;
                    }
                }
            }
        } catch (error) {
            console.error('Error verificando previews de audio:', error);
            // En caso de error, no mostrar nada (comportamiento silencioso)
        }
        
        // Enviar reseña
        document.getElementById("submitReview").onclick = async () => {
            const comment = document.getElementById("reviewComment").value.trim();
            if(!rating || !comment) {
                alert("Por favor, selecciona una calificación y escribe un comentario.");
                return;
            }
            
            try {
                const res = await fetch(`${API_BASE_URL}/reviews/album/${spotify_id}`, {
                    method:"POST",
                    headers:{"Content-Type":"application/json"},
                    credentials:"include",
                    body: JSON.stringify({stars:rating, comment})
                });
                
                const data = await res.json();
                if (data.success) {
                    // Recargar la página de detalles para mostrar la nueva reseña
                    window.renderAlbumDetailsLogic(spotify_id);
                } else {
                    alert("Error al enviar reseña: " + (data.error || "Error desconocido"));
                }
            } catch (err) {
                console.error("Error enviando reseña:", err);
                alert("Error de conexión al enviar reseña");
            }
        };
        
    } catch(e) { 
        console.error("Error al renderizar detalles del álbum:", e);
        container.innerHTML = `<div class="text-center py-5 text-danger">Error al cargar el álbum.</div>`; 
    }
};
// ========================
// FUNCIONES GLOBALES
// Funciones globales necesarias para el HTML
window.showApp = showApp;
window.showLandingPage = showLandingPage;
window.handleImageError = handleImageError;
window.handleAlbumImageError = handleAlbumImageError;
window.handleCarouselImageError = handleCarouselImageError;
window.renderAlbumDetailsLogic = renderAlbumDetailsLogic;

// ========================
// SISTEMA DE NOTIFICACIONES
// ========================

const notificationSystem = {
    panel: null,
    overlay: null,
    badge: null,
    isOpen: false,
    notifications: [],
    unreadCount: 0,
    
    init() {
        this.panel = document.getElementById('notificationPanel');
        this.overlay = document.getElementById('notificationOverlay');
        this.badge = document.getElementById('notificationBadge');
        this.setupEventListeners();
        this.startPeriodicCheck();
    },
    
    setupEventListeners() {
        // Notification link click
        const notificationsLink = document.getElementById('notificationsLink');
        if (notificationsLink) {
            notificationsLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.togglePanel();
            });
        }
        
        // Close panel button
        const closeBtn = document.getElementById('closeNotificationPanel');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.closePanel();
            });
        }
        
        // Overlay click to close
        if (this.overlay) {
            this.overlay.addEventListener('click', () => {
                this.closePanel();
            });
        }
        
        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.closePanel();
            }
        });
    },
    
    async togglePanel() {
        if (this.isOpen) {
            this.closePanel();
        } else {
            await this.openPanel();
        }
    },
    
    async openPanel() {
        this.isOpen = true;
        
        if (this.panel && this.overlay) {
            this.overlay.style.display = 'block';
            this.panel.style.display = 'flex';
            
            // Trigger reflow for animation
            this.overlay.offsetHeight;
            this.panel.offsetHeight;
            
            this.overlay.classList.add('show');
            this.panel.classList.add('show');
        }
        
        // Load notifications when opening
        await this.loadNotifications();
    },
    
    closePanel() {
        this.isOpen = false;
        
        if (this.panel && this.overlay) {
            this.overlay.classList.remove('show');
            this.panel.classList.remove('show');
            
            setTimeout(() => {
                this.overlay.style.display = 'none';
                this.panel.style.display = 'none';
            }, 300);
        }
    },
    
    async loadNotifications() {
        this.showLoading();
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/notifications`, {
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.notifications = data.notifications || [];
                this.renderNotifications();
            } else {
                throw new Error(data.error || 'Error loading notifications');
            }
            
        } catch (error) {
            console.error('Error loading notifications:', error);
            this.showError();
        }
    },
    
    renderNotifications() {
        const container = document.getElementById('notificationsList');
        const loading = document.getElementById('notificationsLoading');
        const empty = document.getElementById('notificationsEmpty');
        const error = document.getElementById('notificationsError');
        
        // Hide all states
        loading.style.display = 'none';
        empty.style.display = 'none';
        error.style.display = 'none';
        
        if (this.notifications.length === 0) {
            empty.style.display = 'block';
            container.innerHTML = '';
            return;
        }
        
        let notificationsHTML = '';
        
        this.notifications.forEach(notification => {
            const isUnread = !notification.is_read;
            const timeAgo = this.formatTimeAgo(notification.created_at);
            const stars = "★".repeat(notification.stars || 0);
            
            notificationsHTML += `
                <div class="notification-item ${isUnread ? 'unread' : ''}" 
                     data-notification-id="${notification.id}"
                     onclick="notificationSystem.handleNotificationClick(${notification.id}, '${notification.spotify_id}')">
                    <div class="notification-content">
                        <img src="${this.getProfileImageUrl(notification.related_user_profile_pic)}" 
                             alt="${notification.related_user_username}" 
                             class="notification-avatar"
                             onerror="handleImageError(this, '40')">
                        <div class="notification-details">
                            <div class="notification-text">
                                <strong>${notification.related_user_username}</strong> 
                                reseñó un álbum
                            </div>
                            <div class="notification-album">
                                <img src="${notification.album_image_url || '/icons/logotipo.jpg'}" 
                                     alt="${notification.album_name}"
                                     onerror="this.src='/icons/logotipo.jpg'">
                                <span>${notification.album_name} - ${notification.artist_name}</span>
                                <span class="notification-rating">${stars}</span>
                            </div>
                            <div class="notification-time">${timeAgo}</div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = notificationsHTML;
    },
    
    showLoading() {
        const loading = document.getElementById('notificationsLoading');
        const empty = document.getElementById('notificationsEmpty');
        const error = document.getElementById('notificationsError');
        
        loading.style.display = 'block';
        empty.style.display = 'none';
        error.style.display = 'none';
    },
    
    showError() {
        const loading = document.getElementById('notificationsLoading');
        const empty = document.getElementById('notificationsEmpty');
        const error = document.getElementById('notificationsError');
        
        loading.style.display = 'none';
        empty.style.display = 'none';
        error.style.display = 'block';
    },
    
    async handleNotificationClick(notificationId, spotifyId) {
        // Mark as read
        await this.markAsRead(notificationId);
        
        // Close panel
        this.closePanel();
        
        // Navigate to album details
        if (spotifyId && window.renderAlbumDetailsLogic) {
            window.renderAlbumDetailsLogic(spotifyId);
        }
    },
    
    async markAsRead(notificationId) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/notifications/${notificationId}/read`, {
                method: 'POST',
                credentials: 'include'
            });
            
            if (response.ok) {
                // Update local notification state
                const notification = this.notifications.find(n => n.id === notificationId);
                if (notification) {
                    notification.is_read = true;
                }
                
                // Update UI
                const notificationElement = document.querySelector(`[data-notification-id="${notificationId}"]`);
                if (notificationElement) {
                    notificationElement.classList.remove('unread');
                }
                
                // Update badge
                await this.updateUnreadCount();
            }
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    },
    
    async markAllAsRead() {
        const unreadNotifications = this.notifications.filter(n => !n.is_read);
        
        if (unreadNotifications.length === 0) {
            return;
        }
        
        try {
            // Mark all unread notifications as read
            const promises = unreadNotifications.map(notification => 
                this.markAsRead(notification.id)
            );
            
            await Promise.all(promises);
            
            // Refresh the panel
            await this.loadNotifications();
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
        }
    },
    
    async updateUnreadCount() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/notifications/unread-count`, {
                credentials: 'include'
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    return;
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            this.unreadCount = data.unreadCount || 0;
            this.updateBadge();
        } catch (error) {
            console.error('Error updating unread count:', error);
            // Don't show error to user for background updates
        }
    },
    
    updateBadge() {
        if (!this.badge) return;
        
        if (this.unreadCount > 0) {
            this.badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
            this.badge.style.display = 'inline-block';
        } else {
            this.badge.style.display = 'none';
        }
        
        // Also update profile notification count if profile is visible
        if (typeof updateProfileNotificationCount === 'function') {
            updateProfileNotificationCount();
        }
    },
    
    startPeriodicCheck() {
        // Check for new notifications every 30 seconds
        setInterval(async () => {
            if (currentUserId) {
                const previousCount = this.unreadCount;
                await this.updateUnreadCount();
                
                // Show toast if new notifications arrived
                if (this.unreadCount > previousCount) {
                    this.showNewNotificationToast(this.unreadCount - previousCount);
                }
            }
        }, 30000);
        
        // Initial check
        if (currentUserId) {
            setTimeout(() => this.updateUnreadCount(), 1000);
        }
    },
    
    showNewNotificationToast(count) {
        const message = count === 1 ? 
            'Tienes una nueva notificación' : 
            `Tienes ${count} nuevas notificaciones`;
            
        this.showToast(message, 'info');
    },
    
    showToast(message, type = 'info') {
        // Create toast container if it doesn't exist
        let toastContainer = document.getElementById('notificationToasts');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'notificationToasts';
            toastContainer.style.cssText = `
                position: fixed;
                top: 80px;
                right: 20px;
                z-index: 10002;
                max-width: 350px;
            `;
            document.body.appendChild(toastContainer);
        }
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `notification-toast notification-toast-${type}`;
        toast.style.cssText = `
            padding: 12px 16px;
            margin-bottom: 10px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            transform: translateX(100%);
            transition: transform 0.3s ease, opacity 0.3s ease;
            cursor: pointer;
            font-size: 0.9rem;
            line-height: 1.4;
            background: linear-gradient(135deg, #17a2b8 0%, #138496 100%);
        `;
        
        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <img src="/icons/icono_reporte.svg" alt="Notification" style="width: 20px; height: 20px; filter: brightness(0) invert(1);">
                <span>${message}</span>
            </div>
        `;
        
        // Add click handler to open notifications
        toast.addEventListener('click', () => {
            this.openPanel();
            toast.remove();
        });
        
        // Add to container
        toastContainer.appendChild(toast);
        
        // Animate in
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 100);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            toast.style.opacity = '0';
            
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 5000);
    },
    
    getProfileImageUrl(profilePicUrl) {
        if (!profilePicUrl) {
            return '/icons/icono_ftperfil_predeterminado.svg';
        }
        return generateEnhancedCacheBustUrl(profilePicUrl);
    },
    
    formatTimeAgo(dateString) {
        const now = new Date();
        const date = new Date(dateString);
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) {
            return 'Hace un momento';
        } else if (diffInSeconds < 3600) {
            const minutes = Math.floor(diffInSeconds / 60);
            return `Hace ${minutes} minuto${minutes > 1 ? 's' : ''}`;
        } else if (diffInSeconds < 86400) {
            const hours = Math.floor(diffInSeconds / 3600);
            return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
        } else if (diffInSeconds < 604800) {
            const days = Math.floor(diffInSeconds / 86400);
            return `Hace ${days} día${days > 1 ? 's' : ''}`;
        } else {
            return date.toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'short'
            });
        }
    }
};

// ========================
// SISTEMA DE REPORTES
// ========================

// Función para reportar una reseña
window.reportReview = async function(reviewId, username) {
    const reasons = [
        { value: 'spam', text: 'Spam o contenido repetitivo' },
        { value: 'inappropriate', text: 'Contenido inapropiado' },
        { value: 'harassment', text: 'Acoso o intimidación' },
        { value: 'fake', text: 'Reseña falsa o engañosa' },
        { value: 'other', text: 'Otro motivo' }
    ];

    const reasonOptions = reasons.map(r => 
        `<option value="${r.value}">${r.text}</option>`
    ).join('');

    const modalHtml = `
        <div class="modal fade" id="reportModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                          <img src="/icons/icono_reporte.svg" alt="Reportar" class="me-2" style="width: 50px; height: 50px;">
                          Reportar Reseña
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p>Estás reportando la reseña de <strong>${username}</strong></p>
                        <div class="mb-3">
                            <label class="form-label">Motivo del reporte:</label>
                            <select class="form-select" id="reportReason">
                                <option value="">Selecciona un motivo...</option>
                                ${reasonOptions}
                            </select>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Descripción adicional (opcional):</label>
                            <textarea class="form-control" id="reportDescription" rows="3" 
                                placeholder="Proporciona más detalles sobre el problema..."></textarea>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button type="button" class="btn btn-danger" onclick="submitReport(${reviewId})">Enviar Reporte</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Remover modal anterior si existe
    const existingModal = document.getElementById('reportModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Agregar modal al DOM
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById('reportModal'));
    modal.show();
};

// Función para enviar el reporte
window.submitReport = async function(reviewId) {
    const reason = document.getElementById('reportReason').value;
    const description = document.getElementById('reportDescription').value.trim();

    if (!reason) {
        alert('Por favor selecciona un motivo para el reporte.');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/reports`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                reportedReviewId: reviewId,
                reason: reason,
                description: description || null
            })
        });

        const data = await response.json();

        if (data.success) {
            // Cerrar modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('reportModal'));
            modal.hide();

            // Mostrar mensaje de éxito
            showReportMessage('✅ Reporte enviado correctamente. Será revisado por un administrador.', 'success');
        } else {
            showReportMessage('❌ ' + (data.error || 'Error al enviar el reporte'), 'error');
        }

    } catch (error) {
        console.error('Error enviando reporte:', error);
        showReportMessage('🚨 Error de conexión. Inténtalo de nuevo.', 'error');
    }
};

// Función para mostrar mensajes de reporte
function showReportMessage(message, type) {
    const alertClass = type === 'success' ? 'alert-success' : 'alert-danger';
    const alertHtml = `
        <div class="alert ${alertClass} alert-dismissible fade show position-fixed" 
             style="top: 20px; right: 20px; z-index: 9999; min-width: 300px;">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', alertHtml);

    // Auto-remover después de 5 segundos
    setTimeout(() => {
        const alert = document.querySelector('.alert');
        if (alert) {
            alert.remove();
        }
    }, 5000);
}

// ========================
// FUNCIONALIDAD DEL CAROUSEL
// ========================

// Nueva función de scroll simplificada
function scrollCarousel(direction) {
    const container = document.getElementById("topAlbumsRow");
    if (!container) {
        return;
    }
    
    // Calcular scroll amount basado en el ancho de las cards
    const cardWidth = 220; // 200px + 20px gap
    const scrollAmount = cardWidth * 2; // Scroll 2 cards a la vez
    
    const currentScroll = container.scrollLeft;
    let targetScroll;
    
    if (direction === 'left') {
        targetScroll = Math.max(0, currentScroll - scrollAmount);
    } else if (direction === 'right') {
        const maxScroll = container.scrollWidth - container.clientWidth;
        targetScroll = Math.min(maxScroll, currentScroll + scrollAmount);
    }
    
    container.scrollLeft = targetScroll;
    
    // Verificar después de un momento para animaciones
    setTimeout(() => {
        if (container.scrollLeft !== targetScroll) {
            container.scrollTo({
                left: targetScroll,
                behavior: 'smooth'
            });
        }
    }, 100);
    
    // Actualizar visibilidad de flechas después del scroll
    setTimeout(() => updateCarouselArrows(), 500);
}

// Función de scroll simplificada que debería funcionar
function scrollCarouselFixed(direction) {
    const container = document.getElementById("topAlbumsRow");
    if (!container) return;
    
    const scrollAmount = 300;
    
    if (direction === 'left') {
        container.scrollLeft = Math.max(0, container.scrollLeft - scrollAmount);
    } else if (direction === 'right') {
        container.scrollLeft = Math.min(
            container.scrollWidth - container.clientWidth,
            container.scrollLeft + scrollAmount
        );
    }
    
    setTimeout(() => updateCarouselArrows(), 100);
}

function updateCarouselArrows() {
    const container = document.getElementById("topAlbumsRow");
    const arrowLeft = document.getElementById("arrowLeft");
    const arrowRight = document.getElementById("arrowRight");
    
    if (!container || !arrowLeft || !arrowRight) {
        return;
    }
    
    // Verificar si hay contenido suficiente para hacer scroll
    const hasOverflow = container.scrollWidth > container.clientWidth;
    
    if (!hasOverflow) {
        // Si no hay overflow, ocultar ambas flechas
        arrowLeft.style.opacity = '0.3';
        arrowRight.style.opacity = '0.3';
        arrowLeft.style.pointerEvents = 'none';
        arrowRight.style.pointerEvents = 'none';
        return;
    }
    
    const canScrollLeft = container.scrollLeft > 5; // Pequeño margen para evitar problemas de precisión
    const canScrollRight = container.scrollLeft < (container.scrollWidth - container.clientWidth - 5);
    
    // Mostrar flechas según disponibilidad de scroll
    arrowLeft.style.opacity = canScrollLeft ? '1' : '0.5';
    arrowRight.style.opacity = canScrollRight ? '1' : '0.5';
    
    // Siempre permitir clicks si hay overflow
    arrowLeft.style.pointerEvents = 'auto';
    arrowRight.style.pointerEvents = 'auto';
}

// ========================
// INICIALIZACIÓN
// ========================
// Inicializar con modo landing por defecto y verificar sesión para routing condicional
document.body.classList.add('landing-mode');
document.documentElement.classList.add('landing-mode');

// Perform initial session check to determine routing
checkSession();

// Initialize clickable user elements system after DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Wait for ProfileViewer to be available
    const initializeClickableElements = () => {
        if (window.profileViewer && window.clickableUserElements) {
            window.clickableUserElements.initialize(window.profileViewer);
        } else {
            // Retry after a short delay if components aren't ready yet
            setTimeout(initializeClickableElements, 100);
        }
    };
    
    // Start initialization
    initializeClickableElements();
});

// Helper function to enhance newly added content
function enhanceNewContent(element) {
    if (window.clickableUserElements && window.clickableUserElements.initialized) {
        window.clickableUserElements.enhanceSpecificElement(element);
    }
}

// Verificar sesión periódicamente para mantener sincronización
setInterval(async () => {
    if (currentUserId) {
        await verifySessionPersistence();
        
        // Trigger data synchronization every 15 minutes
        const now = Date.now();
        if (!window.lastSyncTime || (now - window.lastSyncTime) > 15 * 60 * 1000) {
            console.log('Ejecutando sincronización periódica de datos...');
            await triggerDataSynchronization();
            window.lastSyncTime = now;
        }
    }
}, 5 * 60 * 1000); // Cada 5 minutos


// ========================
// SOCIAL LISTS FUNCTIONS FOR USER'S OWN PROFILE
// ========================

// Show the current user's followers list
function showOwnFollowersList() {
    if (!currentUserId) {
        console.error('No current user ID available');
        showNotification('Error: Usuario no identificado', 'error');
        return;
    }
    
    if (!window.socialLists) {
        console.error('SocialLists component not available');
        showNotification('Error: Componente de listas sociales no disponible', 'error');
        return;
    }
    
    const username = currentUsername || 'Tu';
    socialLists.showFollowers(currentUserId, username);
}

// Show the current user's following list
function showOwnFollowingList() {
    if (!currentUserId) {
        console.error('No current user ID available');
        showNotification('Error: Usuario no identificado', 'error');
        return;
    }
    
    if (!window.socialLists) {
        console.error('SocialLists component not available');
        showNotification('Error: Componente de listas sociales no disponible', 'error');
        return;
    }
    
    const username = currentUsername || 'Tú';
    socialLists.showFollowing(currentUserId, username);
}

// Make functions available globally for onclick handlers
window.showOwnFollowersList = showOwnFollowersList;
window.showOwnFollowingList = showOwnFollowingList;

// Update notification count in profile page
function updateProfileNotificationCount() {
    const profileUnreadCountEl = document.getElementById('profileUnreadCount');
    if (profileUnreadCountEl && notificationSystem) {
        if (notificationSystem.unreadCount > 0) {
            profileUnreadCountEl.textContent = notificationSystem.unreadCount;
            profileUnreadCountEl.style.display = 'inline';
        } else {
            profileUnreadCountEl.style.display = 'none';
        }
    }
}

// Make function available globally
window.updateProfileNotificationCount = updateProfileNotificationCount;