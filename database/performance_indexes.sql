-- Performance optimization indexes for MusicBoxd
-- These indexes are designed to optimize the most common queries in the social network features

USE musicboxd;

-- ============================================================================
-- PROFILE AND USER QUERIES OPTIMIZATION
-- ============================================================================

-- Optimize profile lookup queries (frequently accessed)
-- Covers: SELECT * FROM users WHERE id = ? AND is_blocked = FALSE
CREATE INDEX IF NOT EXISTS idx_users_active_lookup ON users(id, is_blocked);

-- Optimize user search and listing queries
-- Covers: SELECT * FROM users WHERE is_blocked = FALSE ORDER BY created_at
CREATE INDEX IF NOT EXISTS idx_users_active_created ON users(is_blocked, created_at);

-- Optimize social stats queries
-- Covers: SELECT followers_count, following_count FROM users WHERE id = ?
CREATE INDEX IF NOT EXISTS idx_users_social_stats ON users(id, followers_count, following_count);

-- ============================================================================
-- FOLLOW RELATIONSHIPS OPTIMIZATION
-- ============================================================================

-- Optimize follower list queries
-- Covers: SELECT * FROM user_follows WHERE following_id = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_follows_following_created ON user_follows(following_id, created_at DESC);

-- Optimize following list queries  
-- Covers: SELECT * FROM user_follows WHERE follower_id = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_follows_follower_created ON user_follows(follower_id, created_at DESC);

-- Optimize follow status checks
-- Covers: SELECT id FROM user_follows WHERE follower_id = ? AND following_id = ?
-- Note: This is already covered by the unique constraint unique_follow(follower_id, following_id)

-- Optimize bulk follow status checks for lists
-- Covers: SELECT following_id FROM user_follows WHERE follower_id = ? AND following_id IN (...)
CREATE INDEX IF NOT EXISTS idx_follows_bulk_check ON user_follows(follower_id, following_id);

-- ============================================================================
-- REVIEWS AND CONTENT OPTIMIZATION
-- ============================================================================

-- Optimize user review queries for profiles
-- Covers: SELECT * FROM reviews WHERE user_id = ? AND is_hidden = FALSE ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_reviews_user_visible_created ON reviews(user_id, is_hidden, created_at DESC);

-- Optimize album review queries
-- Covers: SELECT * FROM reviews WHERE spotify_id = ? AND is_hidden = FALSE
CREATE INDEX IF NOT EXISTS idx_reviews_album_visible ON reviews(spotify_id, is_hidden);

-- Optimize top reviews queries (4+ stars)
-- Covers: SELECT * FROM reviews WHERE user_id = ? AND stars >= 4 AND is_hidden = FALSE ORDER BY stars DESC
CREATE INDEX IF NOT EXISTS idx_reviews_user_top_rated ON reviews(user_id, is_hidden, stars DESC, created_at DESC);

-- Optimize review stats queries
-- Covers: SELECT COUNT(*), AVG(stars) FROM reviews WHERE user_id = ? AND is_hidden = FALSE
CREATE INDEX IF NOT EXISTS idx_reviews_user_stats ON reviews(user_id, is_hidden, stars);

-- Optimize album stats queries for landing page
-- Covers: SELECT spotify_id, AVG(stars), COUNT(*) FROM reviews WHERE is_hidden = FALSE GROUP BY spotify_id
CREATE INDEX IF NOT EXISTS idx_reviews_album_stats ON reviews(is_hidden, spotify_id, stars);

-- ============================================================================
-- NOTIFICATIONS OPTIMIZATION
-- ============================================================================

-- Optimize unread notification count queries
-- Covers: SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = FALSE
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread_count ON notifications(user_id, is_read);

-- Optimize notification list queries
-- Covers: SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);

-- Optimize notification cleanup queries
-- Covers: SELECT * FROM notifications WHERE created_at < ? AND is_read = TRUE
CREATE INDEX IF NOT EXISTS idx_notifications_cleanup ON notifications(is_read, created_at);

-- ============================================================================
-- REPORTS AND MODERATION OPTIMIZATION
-- ============================================================================

-- Optimize pending reports queries
-- Covers: SELECT * FROM reports WHERE status = 'pending' ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_reports_status_created ON reports(status, created_at DESC);

-- Optimize user report history
-- Covers: SELECT * FROM reports WHERE reporter_id = ? OR reported_user_id = ?
CREATE INDEX IF NOT EXISTS idx_reports_user_involvement ON reports(reporter_id, reported_user_id, status);

-- ============================================================================
-- COMPOSITE INDEXES FOR COMPLEX QUERIES
-- ============================================================================

-- Optimize social list queries with user info
-- Covers: Complex joins between user_follows and users tables
CREATE INDEX IF NOT EXISTS idx_users_social_profile ON users(id, is_blocked, username, profile_pic_url);

-- Optimize review queries with user info
-- Covers: Complex joins between reviews and users tables
CREATE INDEX IF NOT EXISTS idx_reviews_with_user ON reviews(spotify_id, is_hidden, user_id, created_at DESC);

-- Optimize notification queries with related data
-- Covers: Complex joins for notification display
CREATE INDEX IF NOT EXISTS idx_notifications_full ON notifications(user_id, is_read, created_at DESC, related_user_id, related_review_id);

-- ============================================================================
-- ANALYZE TABLES FOR QUERY OPTIMIZATION
-- ============================================================================

-- Update table statistics for better query planning
ANALYZE TABLE users;
ANALYZE TABLE reviews;
ANALYZE TABLE user_follows;
ANALYZE TABLE notifications;
ANALYZE TABLE reports;

-- ============================================================================
-- PERFORMANCE MONITORING QUERIES
-- ============================================================================

-- Query to check index usage (run periodically to monitor performance)
-- SELECT 
--   TABLE_NAME,
--   INDEX_NAME,
--   CARDINALITY,
--   SUB_PART,
--   PACKED,
--   NULLABLE,
--   INDEX_TYPE
-- FROM information_schema.STATISTICS 
-- WHERE TABLE_SCHEMA = 'musicboxd' 
-- ORDER BY TABLE_NAME, INDEX_NAME;

-- Query to check slow queries (enable slow query log in production)
-- SELECT 
--   query_time,
--   lock_time,
--   rows_sent,
--   rows_examined,
--   sql_text
-- FROM mysql.slow_log 
-- WHERE start_time > DATE_SUB(NOW(), INTERVAL 1 HOUR)
-- ORDER BY query_time DESC
-- LIMIT 10;

-- ============================================================================
-- NOTES FOR FUTURE OPTIMIZATION
-- ============================================================================

-- 1. Consider partitioning large tables (reviews, notifications) by date
-- 2. Implement read replicas for heavy read operations
-- 3. Consider materialized views for complex aggregation queries
-- 4. Monitor query performance and adjust indexes based on actual usage patterns
-- 5. Consider archiving old notifications and reports to keep tables lean