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

## Estructura de las tablas

### Tabla `users`
- `id` - ID único del usuario
- `username` - Nombre de usuario único
- `email` - Email único
- `password` - Contraseña hasheada con bcrypt
- `profile_pic_url` - URL de la foto de perfil
- `created_at` - Fecha de creación

### Tabla `reviews`
- `id` - ID único de la reseña
- `type` - Tipo de contenido ('album')
- `spotify_id` - ID del álbum en Spotify
- `user_id` - ID del usuario que escribió la reseña
- `stars` - Calificación (1-5 estrellas)
- `comment` - Comentario de la reseña
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