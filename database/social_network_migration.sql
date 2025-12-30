-- MusicBoxd Social Network Features Migration
-- This script adds social networking functionality to the existing database

USE musicboxd;

-- Add social counters to existing users table
ALTER TABLE users 
ADD COLUMN followers_count INT DEFAULT 0,
ADD COLUMN following_count INT DEFAULT 0,
ADD INDEX idx_followers_count (followers_count);

-- Create user_follows table for follow relationships
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

-- Create notifications table for user notifications
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

-- Add constraint to prevent users from following themselves
ALTER TABLE user_follows 
ADD CONSTRAINT chk_no_self_follow CHECK (follower_id != following_id);