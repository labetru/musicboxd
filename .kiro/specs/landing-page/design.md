# Diseño de Landing Page - MusicBoxd

## Overview

La landing page de MusicBoxd será la primera impresión que tengan los visitantes de la plataforma. Debe ser visualmente atractiva, informativa y funcional, manteniendo la consistencia con el diseño existente de la aplicación. La página servirá como punto de entrada que muestre el valor de la plataforma antes de que los usuarios se registren.

## Architecture

### Arquitectura de Presentación
- **Frontend**: Integración con el sistema existente de HTML/CSS/JavaScript vanilla
- **Backend**: Extensión de las rutas Express.js existentes para servir datos de estadísticas
- **Base de Datos**: Consultas a la base de datos MySQL existente para obtener estadísticas en tiempo real

### Flujo de Navegación
1. Usuario accede a la URL principal
2. Sistema verifica si hay sesión activa
3. Si no hay sesión: Muestra landing page
4. Si hay sesión: Redirige a la aplicación principal
5. Desde landing page: Usuario puede acceder al login/registro

## Components and Interfaces

### Componente Landing Page Principal
```javascript
// Estructura del componente principal
const LandingPage = {
  header: {
    logo: '/icons/logotipo.jpg',
    title: 'MusicBoxd',
    subtitle: 'Tu plataforma de reseñas musicales',
    loginButton: 'Iniciar Sesión / Registrarse'
  },
  statistics: {
    totalUsers: Number,
    totalReviews: Number
  },
  featuredAlbums: Array<Album>,
  backgroundCarousel: Array<AlbumImage>
}
```

### API Endpoints Nuevos
```javascript
// GET /api/landing/stats - Obtener estadísticas para landing page
{
  totalUsers: number,
  totalReviews: number,
  totalAlbums: number
}

// GET /api/landing/featured-albums - Obtener álbumes destacados
[{
  id: string,
  name: string,
  artist: string,
  imageUrl: string,
  averageRating: number,
  reviewCount: number
}]

// GET /api/landing/carousel-images - Obtener imágenes para carrusel
[{
  albumId: string,
  imageUrl: string,
  albumName: string,
  artistName: string
}]
```

### Interfaz de Routing
```javascript
// Modificación del sistema de routing existente
const routingLogic = {
  '/': {
    authenticated: () => showApp(), // Comportamiento actual
    unauthenticated: () => showLandingPage() // Nuevo comportamiento
  }
}
```

## Data Models

### Modelo de Estadísticas
```javascript
const LandingStats = {
  totalUsers: {
    type: 'number',
    source: 'SELECT COUNT(*) FROM users WHERE is_blocked = FALSE',
    format: 'integer'
  },
  totalReviews: {
    type: 'number', 
    source: 'SELECT COUNT(*) FROM reviews WHERE is_hidden = FALSE',
    format: 'integer'
  }
}
```

### Modelo de Álbum Destacado
```javascript
const FeaturedAlbum = {
  spotifyId: 'string',
  name: 'string',
  artist: 'string',
  imageUrl: 'string',
  averageRating: 'number (1-5)',
  reviewCount: 'number',
  spotifyData: 'object' // Datos adicionales de Spotify API
}
```

### Modelo de Imagen de Carrusel
```javascript
const CarouselImage = {
  albumId: 'string',
  imageUrl: 'string',
  albumName: 'string',
  artistName: 'string',
  opacity: 'number (0-1)', // Para efecto de fondo
  position: 'object {x, y}' // Para posicionamiento dinámico
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

Después de revisar todas las propiedades identificadas en el análisis de prework, he identificado las siguientes redundancias y consolidaciones:

- **Propiedades 2.1, 2.2, 2.3**: Pueden consolidarse en una sola propiedad sobre obtención y renderizado de estadísticas
- **Propiedades 3.1, 3.2, 3.3**: Pueden combinarse en una propiedad comprehensiva sobre álbumes destacados
- **Propiedades 5.1, 5.2**: Pueden unificarse en una propiedad sobre responsive design
- **Propiedades 6.2, 7.1, 7.2, 7.3**: Pueden consolidarse en una propiedad sobre preservación de funcionalidad existente

### Propiedades de Corrección Consolidadas

**Property 1: Estadísticas en tiempo real**
*Para cualquier* estado de la base de datos, cuando se carga la landing page, el sistema debe obtener y mostrar estadísticas actualizadas de usuarios y reseñas que reflejen el estado actual de la plataforma
**Validates: Requirements 2.1, 2.2, 2.3**

**Property 2: Álbumes destacados completos**
*Para cualquier* conjunto de álbumes destacados mostrados, cada álbum debe incluir imagen, nombre, artista y calificación, y el total no debe exceder 8 álbumes
**Validates: Requirements 3.1, 3.2, 3.3**

**Property 3: Carrusel automático funcional**
*Para cualquier* carrusel de fondo inicializado, debe contener imágenes de álbumes y configurar movimiento automático continuo
**Validates: Requirements 4.1, 4.2, 4.5**

**Property 4: Responsive design consistente**
*Para cualquier* tamaño de pantalla (móvil, tablet, desktop), la landing page debe mantener funcionalidad completa y layout apropiado
**Validates: Requirements 5.1, 5.2**

**Property 5: Accesibilidad completa**
*Para cualquier* elemento interactivo en la landing page, debe ser accesible via teclado y incluir atributos de accesibilidad apropiados
**Validates: Requirements 5.3, 5.4**

**Property 6: Preservación de funcionalidad existente**
*Para cualquier* funcionalidad existente de la aplicación, después de implementar la landing page, debe continuar funcionando sin modificaciones
**Validates: Requirements 6.2, 7.1, 7.2, 7.3**

**Property 7: Routing condicional correcto**
*Para cualquier* estado de autenticación del usuario, el sistema debe mostrar la landing page solo para usuarios no autenticados y redirigir usuarios autenticados a la aplicación principal
**Validates: Requirements 6.3, 6.4**

## Error Handling

### Manejo de Errores de API
- **Spotify API**: Fallback a datos cacheados o mensajes informativos
- **Base de Datos**: Valores por defecto para estadísticas (0 usuarios, 0 reseñas)
- **Imágenes**: Placeholders cuando las imágenes de álbumes no cargan

### Manejo de Estados de Carga
- **Skeleton screens** durante la carga de estadísticas
- **Progressive loading** para imágenes del carrusel
- **Graceful degradation** cuando JavaScript está deshabilitado

### Manejo de Errores de Red
```javascript
const errorHandling = {
  networkError: () => showOfflineMessage(),
  apiTimeout: () => showCachedData(),
  imageLoadError: () => showPlaceholder(),
  authError: () => redirectToLogin()
}
```

## Testing Strategy

### Dual Testing Approach

La estrategia de testing combinará unit tests y property-based tests para asegurar cobertura completa:

**Unit Tests:**
- Verificarán ejemplos específicos y casos edge
- Probarán integración entre componentes
- Validarán manejo de errores específicos

**Property-Based Tests:**
- Verificarán propiedades universales que deben cumplirse
- Probarán comportamiento con datos aleatorios
- Asegurarán corrección general del sistema

### Property-Based Testing Requirements

- **Librería**: Se utilizará **fast-check** para JavaScript/Node.js
- **Configuración**: Cada test ejecutará mínimo 100 iteraciones
- **Etiquetado**: Cada test incluirá comentario con formato: **Feature: landing-page, Property {number}: {property_text}**
- **Implementación**: Cada propiedad de corrección será implementada por UN SOLO test de property-based testing

### Unit Testing Requirements

Los unit tests cubrirán:
- Casos específicos de renderizado de componentes
- Integración con APIs existentes
- Manejo de errores específicos
- Funcionalidad de navegación

### Testing Configuration

```javascript
// Configuración mínima para property-based tests
const testConfig = {
  numRuns: 100, // Mínimo 100 iteraciones
  timeout: 5000,
  seed: Math.random(),
  verbose: true
}
```

Los tests de property-based testing se ejecutarán con configuración mínima de 100 iteraciones para asegurar cobertura adecuada del espacio de entrada, y cada test será etiquetado explícitamente con la propiedad de corrección que implementa.