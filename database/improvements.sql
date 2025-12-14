-- Mejoras opcionales para la base de datos music_reviews
-- Ejecutar después de importar music_reviews.sql

-- 1. Agregar índices para mejorar rendimiento
ALTER TABLE reviews ADD INDEX idx_spotify_id (spotify_id);
ALTER TABLE reviews ADD INDEX idx_stars (stars);
ALTER TABLE reviews ADD INDEX idx_created_at (created_at);

-- 2. Agregar constraint para validar estrellas
ALTER TABLE reviews ADD CONSTRAINT chk_stars CHECK (stars >= 1 AND stars <= 5);

-- 3. Agregar campos adicionales para futuras funcionalidades (opcional)
-- ALTER TABLE users ADD COLUMN bio TEXT DEFAULT NULL;
-- ALTER TABLE users ADD COLUMN location VARCHAR(100) DEFAULT NULL;
-- ALTER TABLE users ADD COLUMN website VARCHAR(255) DEFAULT NULL;

-- 4. Tabla para likes/favoritos (funcionalidad futura)
/*
CREATE TABLE user_likes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  review_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE,
  UNIQUE KEY unique_like (user_id, review_id)
);
*/

-- 5. Tabla para seguir usuarios (funcionalidad futura)
/*
CREATE TABLE user_follows (
  id INT AUTO_INCREMENT PRIMARY KEY,
  follower_id INT NOT NULL,
  following_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_follow (follower_id, following_id)
);
*/