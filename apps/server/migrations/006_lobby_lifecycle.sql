-- Lobbies record their last change, so abandoned ones can be removed (doc 100, S4).
ALTER TABLE online_lobbies
  ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  ADD INDEX online_lobbies_updated (updated_at);
