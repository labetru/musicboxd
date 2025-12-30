# Configuración de Base de Datos - MusicBoxd

## Pasos para configurar la base de datos

### 1. Usando phpMyAdmin (XAMPP)
1. Abrir http://localhost/phpmyadmin
2. Hacer clic en "Importar"
3. Seleccionar el archivo `schema.sql`
4. Hacer clic en "Continuar"

### 2. Usando MySQL CLI
```bash
mysql -u root -p < database/schema.sql
```

### 3. Verificar la instalación
```sql
USE musicboxd;
SHOW TABLES;
```

Deberías ver las tablas:
- `users`
- `reviews`
- `reports`
- `user_follows`
- `notifications`

### 4. Migrar base de datos existente (si ya tienes MusicBoxd instalado)

Si ya tienes una instalación existente de MusicBoxd y quieres agregar las funcionalidades sociales:

#### Usando phpMyAdmin:
1. Abrir http://localhost/phpmyadmin
2. Seleccionar la base de datos `musicboxd`
3. Hacer clic en "Importar"
4. Seleccionar el archivo `social_network_migration.sql`
5. Hacer clic en "Continuar"

#### Usando MySQL CLI:
```bash
mysql -u root -p musicboxd < database/social_network_migration.sql
```

#### Usando el script automatizado (recomendado):
```bash
npm run setup-social
```

Este script verificará automáticamente si las funcionalidades sociales ya están instaladas y las configurará si es necesario.

## Estructura de las tablas

### Tabla `users`
- `id` - ID único del usuario
- `username` - Nombre de usuario único
- `email` - Email único
- `password` - Contraseña hasheada con bcrypt
- `profile_pic_url` - URL de la foto de perfil
- `followers_count` - Número de seguidores del usuario
- `following_count` - Número de usuarios que sigue
- `created_at` - Fecha de creación

### Tabla `reviews`
- `id` - ID único de la reseña
- `type` - Tipo de contenido ('album')
- `spotify_id` - ID del álbum en Spotify
- `user_id` - ID del usuario que escribió la reseña
- `stars` - Calificación (1-5 estrellas)
- `comment` - Comentario de la reseña
- `created_at` - Fecha de creación

### Tabla `user_follows`
- `id` - ID único de la relación de seguimiento
- `follower_id` - ID del usuario que sigue
- `following_id` - ID del usuario seguido
- `created_at` - Fecha cuando se creó la relación

### Tabla `notifications`
- `id` - ID único de la notificación
- `user_id` - ID del usuario que recibe la notificación
- `type` - Tipo de notificación ('new_review')
- `related_user_id` - ID del usuario que generó la notificación
- `related_review_id` - ID de la reseña relacionada
- `is_read` - Si la notificación ha sido leída
- `created_at` - Fecha de creación

## Datos de prueba (opcional)

Si quieres agregar datos de prueba, puedes ejecutar:

```sql
-- Usuario de prueba (contraseña: "test123")
INSERT INTO users (username, email, password) VALUES 
('demo_user', 'demo@musicboxd.com', '$2b$10$rOvHPGkwMkMZOjNJjqhuWOQQQQQQQQQQQQQQQQQQQQQQQQQQQQ');

-- Reseña de prueba
INSERT INTO reviews (type, spotify_id, user_id, stars, comment) VALUES 
('album', '4aawyAB9vmqN3uQ7FjRGTy', 1, 5, '¡Álbum increíble! Una obra maestra del rock.');
```