CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  email VARCHAR(254) COLLATE utf8mb4_bin NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) CHARACTER SET ascii NULL,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  locale VARCHAR(2) NOT NULL DEFAULT 'es',
  created_at BIGINT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS auth_sessions (
  token_hash CHAR(64) CHARACTER SET ascii PRIMARY KEY,
  user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  expires_at BIGINT NOT NULL,
  last_used_at BIGINT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX (user_id), INDEX (expires_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS account_tokens (
  token_hash CHAR(64) CHARACTER SET ascii PRIMARY KEY,
  user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  purpose VARCHAR(16) NOT NULL,
  expires_at BIGINT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX (user_id, purpose), INDEX (expires_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS auth_identities (
  subject VARCHAR(255) CHARACTER SET ascii PRIMARY KEY,
  user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS documents (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  owner_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  kind VARCHAR(16) NOT NULL,
  name VARCHAR(160) NOT NULL,
  payload JSON NOT NULL,
  revision INT NOT NULL,
  operation_id CHAR(36) CHARACTER SET ascii NOT NULL,
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  deleted BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at BIGINT NOT NULL,
  PRIMARY KEY (owner_id, id),
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX (owner_id, kind, updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS document_operations (
  owner_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  document_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  operation_id CHAR(36) CHARACTER SET ascii NOT NULL,
  revision INT NOT NULL,
  request_hash CHAR(64) CHARACTER SET ascii NOT NULL,
  PRIMARY KEY (owner_id, document_id, operation_id),
  FOREIGN KEY (owner_id, document_id) REFERENCES documents(owner_id, id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS document_revisions (
  owner_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  document_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  revision INT NOT NULL,
  payload JSON NOT NULL,
  created_at BIGINT NOT NULL,
  PRIMARY KEY (owner_id, document_id, revision),
  FOREIGN KEY (owner_id, document_id) REFERENCES documents(owner_id, id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS oauth_requests (
  state_hash CHAR(64) CHARACTER SET ascii PRIMARY KEY,
  nonce VARCHAR(128) CHARACTER SET ascii NOT NULL,
  verifier VARCHAR(128) CHARACTER SET ascii NOT NULL,
  user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  expires_at BIGINT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX (expires_at)
) ENGINE=InnoDB;
