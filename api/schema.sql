-- THE INTAKE backend schema (MySQL / MariaDB).
-- Run once in phpMyAdmin or the mysql client. Safe to re-run: it only creates what is missing.

CREATE TABLE IF NOT EXISTS intake_players (
  token       CHAR(32)     NOT NULL PRIMARY KEY,  -- random id kept in the player's browser
  ip_hash     CHAR(64)     NOT NULL,              -- salted SHA-256 of the IP, never the IP itself
  bonus_runs  INT          NOT NULL DEFAULT 0,    -- extra runs from unlock codes
  created_at  INT UNSIGNED NOT NULL,
  INDEX (ip_hash)
);

CREATE TABLE IF NOT EXISTS intake_runs (
  id          CHAR(32)     NOT NULL PRIMARY KEY,
  token       CHAR(32)     NOT NULL,
  ip_hash     CHAR(64)     NOT NULL,
  calls       INT          NOT NULL DEFAULT 0,    -- Gemini calls made in this run
  counted     TINYINT      NOT NULL DEFAULT 0,    -- 1 once its first scorecard was shown
  started_at  INT UNSIGNED NOT NULL,
  INDEX (token),
  INDEX (ip_hash)
);

CREATE TABLE IF NOT EXISTS intake_codes (
  code        VARCHAR(40)  NOT NULL PRIMARY KEY,  -- what the player types, e.g. COFFEE-2026
  runs        INT          NOT NULL,              -- extra runs each redemption grants
  uses_left   INT          NOT NULL,              -- how many players can still redeem it
  note        VARCHAR(200) NULL,                  -- for you: who it was for
  created_at  INT UNSIGNED NOT NULL
);

CREATE TABLE IF NOT EXISTS intake_redemptions (
  code        VARCHAR(40)  NOT NULL,
  token       CHAR(32)     NOT NULL,
  redeemed_at INT UNSIGNED NOT NULL,
  PRIMARY KEY (code, token)
);

CREATE TABLE IF NOT EXISTS intake_daily (
  day         CHAR(10)     NOT NULL PRIMARY KEY,  -- YYYY-MM-DD, server time
  calls       INT          NOT NULL DEFAULT 0
);
