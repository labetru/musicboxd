# Design Document - Profile Picture Persistence

## Overview

Este documento describe el diseño para solucionar el problema de persistencia de fotos de perfil en el sistema MusicBoxd. El problema actual es que las fotos de perfil desaparecen después de cerrar sesión, aunque están correctamente almacenadas en la base de datos. La solución involucra corregir el manejo de cache, eliminar referencias a funciones no definidas, y mejorar la carga y validación de imágenes.

## Architecture

El sistema de fotos de perfil sigue una arquitectura de tres capas:

1. **Capa de Presentación (Frontend)**: Maneja la visualización y carga de imágenes
2. **Capa de Aplicación (Backend API)**: Procesa las solicitudes de upload y validación
3. **Capa de Persistencia**: Base de datos MySQL + sistema de archivos

```
[Frontend] <-> [API Endpoints] <-> [Database + File System]
     |              |                       |
   app.js      server.js              users table + uploads/
```

## Components and Interfaces

### Frontend Components

#### ProfilePictureManager
- **Responsabilidad**: Gestionar la carga, visualización y actualización de fotos de perfil
- **Métodos principales**:
  - `loadUserProfile(userId)`: Carga el perfil completo del usuario
  - `updateProfilePicture(imageUrl)`: Actualiza la imagen en la interfaz
  - `uploadProfilePicture()`: Maneja el proceso de subida
  - `validateImageExists(url)`: Verifica que una imagen existe antes de mostrarla

#### CacheManager
- **Responsabilidad**: Manejar el cache busting y evitar imágenes cacheadas
- **Métodos principales**:
  - `generateCacheBustUrl(url)`: Añade timestamp para evitar cache
  - `preloadImage(url)`: Precarga una imagen para verificar su existencia

### Backend Components

#### ProfilePictureController
- **Endpoints**:
  - `POST /user/upload-photo`: Subida de nueva foto
  - `GET /check-image/:userId`: Verificación de existencia de imagen
  - `GET /me`: Información del usuario incluyendo foto de perfil

#### FileManager
- **Responsabilidad**: Gestión de archivos físicos
- **Métodos**:
  - `saveProfilePicture(file, userId)`: Guarda nueva foto
  - `deleteOldPicture(oldPath)`: Elimina foto anterior
  - `validateFileExists(path)`: Verifica existencia de archivo

## Data Models

### User Model (Existing)
```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  profile_pic_url VARCHAR(255) DEFAULT NULL,
  -- otros campos...
);
```

### File Storage Structure
```
public/uploads/profile_pics/
├── {userId}_profile_{timestamp}.{ext}
├── {userId}_profile_{timestamp}.{ext}
└── ...
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

Después de revisar todas las propiedades identificadas en el prework, se identificaron las siguientes redundancias:
- Propiedades 1.5 y 2.1 son idénticas (eliminación de foto anterior)
- Varias propiedades pueden combinarse en propiedades más comprehensivas

### Consolidated Properties

**Property 1: Session persistence**
*For any* user with a profile picture, logging out and logging back in should preserve and display their profile picture from the database
**Validates: Requirements 1.1, 1.2**

**Property 2: File existence validation**
*For any* profile picture URL in the database, the system should verify the physical file exists before displaying it, showing a placeholder if not
**Validates: Requirements 1.3, 1.4**

**Property 3: Old file cleanup**
*For any* profile picture update, the system should delete the previous image file from the filesystem when saving a new one
**Validates: Requirements 1.5, 2.1**

**Property 4: Database consistency**
*For any* successful profile picture upload, the database should immediately reflect the new image URL
**Validates: Requirements 2.2**

**Property 5: Cache busting**
*For any* profile picture display, the system should use cache busting parameters to prevent showing stale cached images
**Validates: Requirements 2.3**

**Property 6: UI immediate update**
*For any* successful profile picture upload, the user interface should immediately show the new image
**Validates: Requirements 2.4**

**Property 7: Error state preservation**
*For any* failed profile picture upload, the system should maintain the previous image and state unchanged
**Validates: Requirements 2.5**

**Property 8: Function definition completeness**
*For any* function referenced in the code, that function should be properly defined to avoid runtime errors
**Validates: Requirements 3.1**

**Property 9: Graceful error handling**
*For any* image loading failure, the system should handle errors without displaying console errors or breaking functionality
**Validates: Requirements 3.2**

**Property 10: State persistence**
*For any* application state cleanup operation, profile picture persistence should remain unaffected
**Validates: Requirements 3.3**

**Property 11: Dual verification**
*For any* image existence check, the system should verify both database record and physical file presence
**Validates: Requirements 3.4**

**Property 12: Auto-synchronization**
*For any* detected inconsistency between database and filesystem, the system should automatically resolve the discrepancy
**Validates: Requirements 3.5**

## Error Handling

### Image Loading Errors
- **Problema**: Imagen no existe físicamente pero está en BD
- **Solución**: Mostrar placeholder y opcionalmente limpiar BD
- **Implementación**: Try-catch en carga de imágenes con fallback

### Upload Errors
- **Problema**: Falla durante subida de nueva imagen
- **Solución**: Rollback completo, mantener estado anterior
- **Implementación**: Transacciones para operaciones de archivo + BD

### Cache Issues
- **Problema**: Navegador muestra imagen cacheada antigua
- **Solución**: Cache busting consistente con timestamps
- **Implementación**: Añadir `?t=${Date.now()}` a todas las URLs

### Function Reference Errors
- **Problema**: Referencias a funciones no definidas
- **Solución**: Definir funciones o remover referencias
- **Implementación**: Linting y validación de código

## Testing Strategy

### Unit Testing
- Validación de funciones individuales de manejo de archivos
- Pruebas de endpoints de API con mocks de filesystem
- Validación de funciones de cache busting
- Pruebas de manejo de errores específicos

### Property-Based Testing
- **Framework**: Se utilizará `fast-check` para JavaScript/Node.js para las pruebas de propiedades
- **Configuración**: Cada prueba de propiedad ejecutará un mínimo de 100 iteraciones
- **Etiquetado**: Cada prueba de propiedad será etiquetada con el formato '**Feature: profile-picture-persistence, Property {number}: {property_text}**'
- **Implementación**: Una prueba de propiedad por cada propiedad de corrección definida

Las pruebas de propiedades verificarán:
- Persistencia de datos a través de sesiones con usuarios aleatorios
- Manejo correcto de archivos con nombres y rutas aleatorias
- Comportamiento consistente de cache busting con URLs variadas
- Manejo de errores con inputs inválidos aleatorios
- Sincronización automática con estados inconsistentes generados aleatoriamente

### Integration Testing
- Flujo completo de subida de imagen
- Proceso de login/logout con verificación de persistencia
- Sincronización entre base de datos y filesystem
- Comportamiento del sistema con múltiples usuarios concurrentes