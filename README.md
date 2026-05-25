# Atithiseva IVR

Week 1 implementation for the Atithiseva IVR pilot.

## Stack

- Next.js App Router
- Node.js API routes
- Turso/libSQL database
- Turso-backed admin login
- Exotel outbound call API and status webhook
- Vercel-ready environment configuration

## Local Setup

```powershell
cd C:\Users\advantix-user-002\Desktop\IVR\atithiseva-ivr
npm install
npm run db:init
npm run admin:create
npm run dev
```

Open:

```text
http://localhost:3000
```

The local admin email and password are read from `.env.local`.

## Required Environment Variables

```env
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
EXOTEL_API_KEY=
EXOTEL_API_TOKEN=
EXOTEL_ACCOUNT_SID=
EXOTEL_SUBDOMAIN=
EXOTEL_CALLER_ID=
EXOTEL_DEFAULT_FLOW_URL=
APP_BASE_URL=
SETUP_SECRET=
SESSION_SECRET=
SESSION_COOKIE_NAME=
DEFAULT_CAMPAIGN_NAME=
DEFAULT_CAMPAIGN_DESCRIPTION=
ADMIN_EMAIL=
ADMIN_PASSWORD=
```

`EXOTEL_CALLER_ID` must be set to the approved Exotel virtual number before real calls can be placed.

## Verification Commands

```powershell
npm run lint
npm run build
curl.exe http://localhost:3000/api/health
```

## Week 1 Routes

- `/login` - admin sign in
- `/` - protected pilot dashboard
- `/api/health` - Turso health check
- `/api/calls` - protected Exotel call queue endpoint
- `/api/otp-routes` - protected OTP route preparation endpoint
- `/api/ivr/otp-lookup` - public OTP lookup endpoint for IVR routing
- `/api/ivr/auto-route` - public press-1 auto-routing endpoint
- `/api/exotel/status` - public Exotel status callback endpoint
- `/api/setup` - setup endpoint protected by `SETUP_SECRET`

## Phase 1 Usage

1. Sign in to the dashboard.
2. Confirm Phase 1 readiness checks.
3. Generate booking routes in the Prepare OTP mapping form. OTPs are generated automatically.
4. Configure the Exotel app press-1 action to call `/api/ivr/auto-route?format=xml`.
5. Configure the Exotel app OTP action to call `/api/ivr/otp-lookup?format=xml`.
6. Configure Exotel status callbacks to `/api/exotel/status`.

For real Exotel inbound/callback testing, `APP_BASE_URL` must be the deployed HTTPS URL, not localhost.

Current configured production base URL:

```text
https://ivr-ten.vercel.app
```

Use these in Exotel:

```text
Press-1 auto route:
https://ivr-ten.vercel.app/api/ivr/auto-route?format=xml

OTP lookup:
https://ivr-ten.vercel.app/api/ivr/otp-lookup?format=xml

Status callback:
https://ivr-ten.vercel.app/api/exotel/status
```
