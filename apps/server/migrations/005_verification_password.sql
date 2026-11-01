-- The password chosen at registration travels with its verification link, so whoever
-- proves the mailbox sets the password (doc 100, S1: pre-registration takeover).
ALTER TABLE account_tokens ADD COLUMN password_hash VARCHAR(255) CHARACTER SET ascii NULL;
