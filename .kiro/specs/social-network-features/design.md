# Diseño de Funcionalidades de Red Social para MusicBoxd

## Visión General

Este diseño transforma MusicBoxd de una plataforma de reseñas musicales básica a una red social completa. Los usuarios podrán seguir a otros usuarios, ver perfiles públicos detallados, recibir notificaciones de actividad, y navegar fácilmente entre perfiles a través de enlaces clickeables en toda la aplicación.

La implementación se basa en la arquitectura existente de Node.js/Express con MySQL, extendiendo las funcionalidades actuales sin romper la compatibilidad con el sistema existente.

## Arquitectura

### Arquitectura de Alto Nivel

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Base de       │
│   (Browser)     │◄──►│   (Express)     │◄──►│   Datos (MySQL) │
│                 │    │                 │    │                 │
│ - Perfiles      │    │ - API REST      │    │ - Usuarios      │
│ - Seguimiento   │    │ - Autenticación │    │ - Seguimientos  │
│ - Notificaciones│    │ - Notificaciones│    │ - Notificaciones│
│ - UI Interactiva│    │ - Validaciones  │    │ - Índices       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Flujo de Datos Principal

1. **Navegación de Perfiles**: Usuario hace clic en nombre/foto → Frontend navega a perfil → Backend obtiene datos del usuario
2. **Seguimiento**: Usuario hace clic en "Seguir" → Frontend envía petición → Backend crea relación → Actualiza contadores
3. **Notificaciones**: Usuario publica reseña → Backend crea notificaciones para seguidores → Frontend muestra indicadores
4. **Listas Sociales**: Usuario ve seguidores/seguidos → Backend consulta relaciones → Frontend muestra listas paginadas

## Componentes e Interfaces

### Componentes del Frontend

#### 1. ProfileViewer
- **Propósito**: Mostrar perfiles públicos de usuarios
- **Funcionalidades**: 
  - Renderizar información del usuario
  - Mostrar álbumes mejor reseñados
  - Gestionar botones de seguimiento
  - Mostrar contadores sociales

#### 2. FollowButton
- **Propósito**: Manejar operaciones de seguimiento
- **Estados**: "Seguir", "Siguiendo", "Cargando"
- **Funcionalidades**:
  - Crear/eliminar relaciones de seguimiento
  - Actualizar UI en tiempo real
  - Manejar errores de red

#### 3. NotificationCenter
- **Propósito**: Gestionar notificaciones de usuario
- **Funcionalidades**:
  - Mostrar indicador de notificaciones pendientes
  - Listar notificaciones de reseñas nuevas
  - Marcar notificaciones como leídas
  - Navegar a reseñas desde notificaciones

#### 4. SocialLists
- **Propósito**: Mostrar listas de seguidores/seguidos
- **Funcionalidades**:
  - Renderizar listas paginadas
  - Permitir dejar de seguir desde la lista
  - Navegar a perfiles desde la lista

#### 5. ClickableUserElements
- **Propósito**: Convertir nombres y fotos en enlaces
- **Funcionalidades**:
  - Aplicar estilos clickeables
  - Manejar navegación a perfiles
  - Efectos hover

### APIs del Backend

#### 1. User Profile API
```javascript
GET /api/users/:userId/profile
POST /api/users/:userId/follow
DELETE /api/users/:userId/follow
GET /api/users/:userId/followers
GET /api/users/:userId/following
```

#### 2. Notifications API
```javascript
GET /api/notifications
POST /api/notifications/:id/read
GET /api/notifications/unread-count
```

#### 3. Social Stats API
```javascript
GET /api/users/:userId/social-stats
GET /api/users/:userId/top-reviews
```

## Modelos de Datos

### Tabla: user_follows
```sql
CREATE TABLE user_follows (
  id INT PRIMARY KEY AUTO_INCREMENT,
  follower_id INT NOT NULL,
  following_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_follow (follower_id, following_id),
  INDEX idx_follower (follower_id),
  INDEX idx_following (following_id)
);
```

### Tabla: notifications
```sql
CREATE TABLE notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  type ENUM('new_review') NOT NULL,
  related_user_id INT NOT NULL,
  related_review_id INT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (related_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (related_review_id) REFERENCES reviews(id) ON DELETE CASCADE,
  INDEX idx_user_unread (user_id, is_read),
  INDEX idx_created_at (created_at)
);
```

### Extensión de Tabla: users
```sql
ALTER TABLE users ADD COLUMN followers_count INT DEFAULT 0;
ALTER TABLE users ADD COLUMN following_count INT DEFAULT 0;
ALTER TABLE users ADD INDEX idx_followers_count (followers_count);
```

## Propiedades de Corrección

*Una propiedad es una característica o comportamiento que debe mantenerse verdadero a través de todas las ejecuciones válidas de un sistema - esencialmente, una declaración formal sobre lo que el sistema debe hacer. Las propiedades sirven como el puente entre especificaciones legibles por humanos y garantías de corrección verificables por máquina.*

### Propiedades de Navegación de Perfiles

**Propiedad 1: Enlaces de perfil universales**
*Para cualquier* nombre de usuario o foto de perfil mostrados en la aplicación, hacer clic debe navegar al perfil público correcto del usuario correspondiente
**Valida: Requisitos 1.1, 1.2, 5.1, 5.2, 5.3**

**Propiedad 2: Contenido completo de perfil público**
*Para cualquier* perfil público mostrado, debe incluir nombre de usuario, foto de perfil, número total de reseñas, promedio de estrellas, álbumes mejor reseñados (4+ estrellas), y contadores sociales
**Valida: Requisitos 1.3, 1.4, 1.5**

### Propiedades de Seguimiento

**Propiedad 3: Estado correcto del botón de seguimiento**
*Para cualquier* par de usuarios donde no existe relación de seguimiento, el perfil visitado debe mostrar un botón "Seguir"
**Valida: Requisitos 2.1**

**Propiedad 4: Creación de seguimiento**
*Para cualquier* operación de seguimiento válida, debe crear la relación en base de datos, cambiar el botón a "Siguiendo", y actualizar contadores inmediatamente
**Valida: Requisitos 2.2, 2.5**

**Propiedad 5: Eliminación de seguimiento**
*Para cualquier* relación de seguimiento existente, dejar de seguir debe eliminar la relación, cambiar el botón a "Seguir", y actualizar contadores inmediatamente
**Valida: Requisitos 2.4, 2.5**

### Propiedades de Notificaciones

**Propiedad 6: Generación de notificaciones**
*Para cualquier* usuario que publique una nueva reseña, debe generarse una notificación para cada uno de sus seguidores
**Valida: Requisitos 3.1**

**Propiedad 7: Indicador visual de notificaciones**
*Para cualquier* usuario con notificaciones no leídas, debe mostrarse un indicador visual en la interfaz
**Valida: Requisitos 3.2**

**Propiedad 8: Contenido completo de notificaciones**
*Para cualquier* notificación mostrada, debe incluir nombre del usuario, álbum reseñado, calificación y enlace a la reseña
**Valida: Requisitos 3.4**

**Propiedad 9: Marcado automático como leída**
*Para cualquier* notificación vista por un usuario, debe marcarse automáticamente como leída
**Valida: Requisitos 3.5**

### Propiedades de Listas Sociales

**Propiedad 10: Navegación a listas sociales**
*Para cualquier* usuario, hacer clic en contadores de seguidores/seguidos debe mostrar las listas correspondientes
**Valida: Requisitos 4.1, 4.2**

**Propiedad 11: Contenido completo de listas sociales**
*Para cualquier* lista de seguidores/seguidos, cada entrada debe mostrar nombre de usuario, foto de perfil y enlace al perfil
**Valida: Requisitos 4.3**

**Propiedad 12: Funcionalidad de dejar de seguir desde lista**
*Para cualquier* lista de seguidos, debe incluir botón para dejar de seguir y actualizar la lista inmediatamente sin recargar
**Valida: Requisitos 4.4, 4.5**

### Propiedades de Perfil Propio

**Propiedad 13: Contenido extendido del perfil propio**
*Para cualquier* usuario accediendo a su propio perfil, debe mostrar toda la información pública más opciones de edición y enlaces a notificaciones
**Valida: Requisitos 6.1, 6.2, 6.3, 6.4, 6.5**

### Propiedades de Estilos e Interacción

**Propiedad 14: Estilos clickeables universales**
*Para cualquier* enlace de perfil en la aplicación, debe tener estilos visuales que indiquen que es clickeable y efectos hover
**Valida: Requisitos 5.4, 5.5**

### Propiedades de Rendimiento y Escalabilidad

**Propiedad 15: Paginación de listas grandes**
*Para cualquier* lista de seguidores/seguidos con más de 50 elementos, debe implementarse paginación
**Valida: Requisitos 7.3**

**Propiedad 16: Integridad de datos de seguimiento**
*Para cualquier* operación de seguimiento, debe validarse la integridad de datos y prevenir relaciones duplicadas
**Valida: Requisitos 7.5**

## Manejo de Errores

### Errores de Red
- **Timeout de conexión**: Mostrar mensaje de error y botón de reintentar
- **Error de servidor**: Mostrar mensaje genérico y mantener estado anterior
- **Error de autenticación**: Redirigir a login

### Errores de Validación
- **Usuario no encontrado**: Mostrar página 404 personalizada
- **Intento de seguirse a sí mismo**: Prevenir en frontend y backend
- **Relación de seguimiento duplicada**: Manejar silenciosamente

### Errores de Estado
- **Notificaciones no disponibles**: Mostrar mensaje informativo
- **Listas vacías**: Mostrar mensaje apropiado con sugerencias

## Estrategia de Pruebas

### Pruebas Unitarias
- Validación de modelos de datos
- Lógica de negocio de seguimiento
- Generación de notificaciones
- Funciones de utilidad de UI

### Pruebas Basadas en Propiedades
- **Framework**: fast-check para JavaScript
- **Configuración**: Mínimo 100 iteraciones por propiedad
- **Generadores**: Usuarios aleatorios, relaciones de seguimiento, notificaciones
- **Validación**: Cada propiedad implementada como test individual

#### Ejemplo de Test de Propiedad
```javascript
// **Funcionalidad: social-network-features, Propiedad 4: Creación de seguimiento**
test('follow operation creates relationship and updates UI', async () => {
  await fc.assert(fc.asyncProperty(
    fc.record({
      follower: userGenerator(),
      following: userGenerator()
    }),
    async ({ follower, following }) => {
      // Precondición: usuarios diferentes
      fc.pre(follower.id !== following.id);
      
      // Ejecutar seguimiento
      const result = await followUser(follower.id, following.id);
      
      // Verificar relación creada
      const relationship = await getFollowRelationship(follower.id, following.id);
      expect(relationship).toBeTruthy();
      
      // Verificar contadores actualizados
      const followerData = await getUserSocialStats(follower.id);
      const followingData = await getUserSocialStats(following.id);
      
      expect(followerData.following_count).toBeGreaterThan(0);
      expect(followingData.followers_count).toBeGreaterThan(0);
    }
  ), { numRuns: 100 });
});
```

### Pruebas de Integración
- Flujo completo de seguimiento
- Generación y visualización de notificaciones
- Navegación entre perfiles
- Actualización de contadores en tiempo real

### Pruebas de Rendimiento
- Carga de perfiles con muchos seguidores
- Generación masiva de notificaciones
- Consultas optimizadas con índices
- Paginación de listas grandes