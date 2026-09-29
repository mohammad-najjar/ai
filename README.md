# SocialFlow — Phase 1 (backend foundation)
## Run
1. `cp .env.example .env` and fill it (generate secrets with `openssl rand -base64 32`)
2. Create a Postgres DB, set DATABASE_URL
3. `npm install && npx prisma db push && npm run dev`
4. UI is served from `public/index.html` (still using mock data — see Next steps)

## API
- POST /api/auth/register, /api/auth/login (httpOnly cookie session)
- GET  /api/accounts        (never returns tokens)
- GET/POST /api/posts       (mode: now | schedule | draft; one target per account)
- GET  /api/oauth/youtube/start -> Google consent -> /callback saves ENCRYPTED tokens

## YouTube OAuth setup
Google Cloud Console -> enable YouTube Data API v3 -> OAuth client (Web) -> redirect URI
`http://localhost:3000/api/oauth/youtube/callback` -> put id/secret in .env.

## Honest status
- Adapters in lib/adapters/index.ts throw "not implemented" errors: publishing FAILS visibly until real adapters exist. Nothing fakes success.
- Scheduled posts are stored but not sent until the phase-2 worker (BullMQ) exists.
- Media: posts take `mediaUrls` (storage upload = phase 2).

## Next steps
1. Switch public/index.html services (contentService, socialAccountsService, publishingService) from mock to fetch('/api/...') + login screen
2. YouTube adapter: resumable videos.insert + refresh-token rotation
3. Redis/BullMQ worker for scheduling + retries
4. S3/R2 media upload, analytics sync cron
5. Meta and TikTok approvals -> their adapters
