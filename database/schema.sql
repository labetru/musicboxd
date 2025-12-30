-- MusicBoxd Database Schema
-- Crear base de datos
CREATE DATABASE IF NOT EXISTS musicboxd;
USE musicboxd;

-- Tabla de usuarios
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  profile_pic_url VARCHAR(255) DEFAULT NULL,
  role ENUM('user', 'admin') DEFAULT 'user',
  is_blocked BOOLEAN DEFAULT FALSE,
  blocked_reason TEXT NULL,
  blocked_at TIMESTAMP NULL,
  blocked_by INT NULL,
  followers_count INT DEFAULT 0,
  following_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (blocked_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_followers_count (followers_count)
);

-- Tabla de reseñas
CREATE TABLE reviews (
  id INT PRIMARY KEY AUTO_INCREMENT,
  type VARCHAR(20) NOT NULL DEFAULT 'album',
  spotify_id VARCHAR(50) NOT NULL,
  user_id INT NOT NULL,
  stars INT NOT NULL CHECK (stars >= 1 AND stars <= 5),
  comment TEXT NOT NULL,
  is_hidden BOOLEAN DEFAULT FALSE,
  hidden_reason TEXT NULL,
  hidden_at TIMESTAMP NULL,
  hidden_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (hidden_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_spotify_id (spotify_id),
  INDEX idx_user_id (user_id),
  INDEX idx_stars (stars),
  INDEX idx_is_hidden (is_hidden)
);

-- Tabla de reportes
CREATE TABLE reports (
  id INT PRIMARY KEY AUTO_INCREMENT,
  reporter_id INT NOT NULL,
  reported_user_id INT NULL,
  reported_review_id INT NULL,
  reason ENUM('spam', 'inappropriate', 'harassment', 'fake', 'other') NOT NULL,
  description TEXT,
  status ENUM('pending', 'reviewed', 'resolved', 'dismissed') DEFAULT 'pending',
  resolved_by INT NULL,
  resolved_at TIMESTAMP NULL,
  resolution_notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reported_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reported_review_id) REFERENCES reviews(id) ON DELETE CASCADE,
  FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_status (status),
  INDEX idx_reporter (reporter_id),
  INDEX idx_reported_user (reported_user_id),
  INDEX idx_reported_review (reported_review_id)
);

-- Crear usuario administrador por defecto
-- Contraseña: admin123 (CAMBIAR INMEDIATAMENTE EN PRODUCCIÓN)
-- Para generar un nuevo hash: node scripts/create-admin.js tu_nueva_contraseña
INSERT INTO users (username, email, password, role) VALUES 
('admin', 'admin@musicboxd.com', '$2b$10$rOvHPGkwMkMZOjNJjqhuWOQQQQQQQQQQQQQQQQQQQQQQQQQQQ', 'admin');

-- Tabla de seguimientos entre usuarios
CREATE TABLE user_follows (
  id INT PRIMARY KEY AUTO_INCREMENT,
  follower_id INT NOT NULL,
  following_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_follow (follower_id, following_id),
  INDEX idx_follower (follower_id),
  INDEX idx_following (following_id),
  CONSTRAINT chk_no_self_follow CHECK (follower_id != following_id)
);

-- Tabla de notificaciones
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

-- Datos de ejemplo (opcional)
-- INSERT INTO users (username, email, password) VALUES 
-- ('demo_user', 'demo@example.com', '$2b$10$example_hash_here');