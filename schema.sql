-- SocialFlow database schema (PostgreSQL)
-- Secrets: store tokens ENCRYPTED (or in a secrets manager); never expose them to the frontend.

CREATE TYPE platform AS ENUM ('tiktok','instagram','facebook','youtube');
CREATE TYPE account_status AS ENUM ('connected','needs_reconnection','disconnected');
CREATE TYPE post_status AS ENUM ('draft','scheduled','publishing','published','partial','failed');
CREATE TYPE target_status AS ENUM ('pending','uploading','published','failed');
CREATE TYPE team_role AS ENUM ('owner','admin','editor','approver','viewer');

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_name      TEXT,
  name          TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          team_role NOT NULL DEFAULT 'owner',
  timezone      TEXT NOT NULL DEFAULT 'UTC',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE social_accounts (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform           platform NOT NULL,
  external_id        TEXT NOT NULL,              -- id on the platform
  username           TEXT NOT NULL,
  avatar_url         TEXT,
  status             account_status NOT NULL DEFAULT 'connected',
  access_token_enc   BYTEA,                      -- encrypted, server-side only
  refresh_token_enc  BYTEA,
  token_expires_at   TIMESTAMPTZ,
  followers          INT DEFAULT 0,
  posts_count        INT DEFAULT 0,
  last_synced_at     TIMESTAMPTZ,
  UNIQUE (platform, external_id)
);

CREATE TABLE media (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_name   TEXT NOT NULL,
  mime_type   TEXT NOT NULL,
  size_bytes  BIGINT NOT NULL,
  storage_url TEXT NOT NULL,
  thumb_url   TEXT,
  duration_s  INT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE posts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  caption       TEXT NOT NULL DEFAULT '',
  status        post_status NOT NULL DEFAULT 'draft',
  scheduled_at  TIMESTAMPTZ,                     -- null = publish now / draft
  timezone      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON posts (user_id, status, scheduled_at);

CREATE TABLE post_media (
  post_id  UUID REFERENCES posts(id) ON DELETE CASCADE,
  media_id UUID REFERENCES media(id) ON DELETE RESTRICT,
  position INT NOT NULL DEFAULT 0,
  PRIMARY KEY (post_id, media_id)
);

-- One row per selected account: one failure never affects the others.
CREATE TABLE post_targets (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id          UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  account_id       UUID NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
  status           target_status NOT NULL DEFAULT 'pending',
  settings         JSONB NOT NULL DEFAULT '{}',  -- platform-specific: privacy, duet, title, visibility, cta...
  external_post_id TEXT,
  published_at     TIMESTAMPTZ,
  error_message    TEXT,
  UNIQUE (post_id, account_id)
);

CREATE TABLE publish_attempts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id   UUID NOT NULL REFERENCES post_targets(id) ON DELETE CASCADE,
  attempt_no  INT NOT NULL,
  status      target_status NOT NULL,
  response    JSONB,
  error       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE analytics_daily (
  account_id  UUID NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
  day         DATE NOT NULL,
  reach       BIGINT DEFAULT 0,
  impressions BIGINT DEFAULT 0,
  likes       BIGINT DEFAULT 0,
  comments    BIGINT DEFAULT 0,
  shares      BIGINT DEFAULT 0,
  followers   INT DEFAULT 0,
  PRIMARY KEY (account_id, day)
);

CREATE TABLE post_metrics (
  target_id   UUID PRIMARY KEY REFERENCES post_targets(id) ON DELETE CASCADE,
  views BIGINT DEFAULT 0, likes BIGINT DEFAULT 0, comments BIGINT DEFAULT 0,
  shares BIGINT DEFAULT 0, engagement_rate NUMERIC(5,2), updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,                      -- publish_success, publish_failed, reauth_required
  message    TEXT NOT NULL,
  read       BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notification_prefs (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  event   TEXT NOT NULL,
  channel TEXT NOT NULL,                         -- email, push, tiktok, instagram...
  enabled BOOLEAN NOT NULL DEFAULT true,
  PRIMARY KEY (user_id, event, channel)
);

CREATE TABLE activity_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action     TEXT NOT NULL,                      -- post_published, media_uploaded, account_disconnected...
  status     TEXT NOT NULL DEFAULT 'info',       -- success, failed, warning, info
  message    TEXT NOT NULL,
  entity_id  UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON activity_log (user_id, created_at DESC);
