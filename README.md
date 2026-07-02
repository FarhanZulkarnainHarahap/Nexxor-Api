# Nexxora API

Express.js backend for Nexxora. This app handles authentication, catalog data, cart, checkout, coupons, addresses, shipping calculation, payment creation, webhook processing, order tracking, notifications, and admin operations.

## Stack

- Express.js
- TypeScript
- PostgreSQL
- Prisma ORM
- PrismaPg adapter
- JWT authentication
- Auth.js Google and TikTok OAuth bridge
- Bcrypt password hashing
- Cloudinary upload
- Multer file handling
- Xendit invoice payment
- RajaOngkir shipping cost
- Mock-first Tokopedia and TikTok Shop ERP adapters

## Folder Overview

```txt
api/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── src/
│   ├── config/
│   ├── controllers/
│   ├── middlewares/
│   ├── routers/
│   ├── types/
│   ├── utils/
│   ├── app.ts
│   └── server.ts
├── .env.example
├── package.json
├── prisma.config.ts
└── tsconfig.json
```

## Environment

Create a local env file:

```bash
cp .env.example .env
```

Required groups:

- Database connection: `DATABASE_URL`, `DIRECT_URL`
- Authentication: `JWT_SECRET`
- Cloudinary: cloud name, API key, API secret
- Frontend origin: `FRONTEND_URL`
- Xendit: secret key and callback token
- RajaOngkir: API key, origin ID, courier config

Never commit the real `.env` file.

## Database

Generate Prisma Client:

```bash
npm run prisma:generate
```

Run migration:

```bash
npm run prisma:migrate -- --name add_oauth_marketplace
```

Seed initial data:

```bash
npm run seed
```

Seed includes:

- Admin account
- Categories
- Products
- Coupons

Default admin:

```txt
email: admin@nexxora.com
password: admin123
```

## Development

Install dependencies:

```bash
npm install
```

Run development server:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Start compiled output:

```bash
npm run start
```

## Vercel Deployment

This API includes a Vercel serverless entry at:

```txt
api/api/index.ts
```

and a Vercel config at:

```txt
api/vercel.json
```

If deploying only the backend, set the Vercel project root directory to:

```txt
api
```

Required production environment variables must be added in the Vercel dashboard. Do not upload the local `.env` file.

Important env values:

- `DATABASE_URL`
- `DIRECT_URL`
- `JWT_SECRET`
- `FRONTEND_URL`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `XENDIT_SECRET_KEY`
- `XENDIT_CALLBACK_TOKEN`
- `RAJAONGKIR_API_KEY`
- `RAJAONGKIR_ORIGIN_ID`

After deploy, test the root URL. It should return the Nexxora API health response.

## API Areas

Routes are grouped by domain inside `src/routers`:

- Auth
- Product
- Category
- Cart
- Order
- Payment
- Coupon
- Address
- Shipping
- User
- Notification
- ERP Marketplace

The detailed route definitions live in the router files. This README intentionally avoids listing every public route to keep the repository documentation cleaner.

## Payment Webhook

Nexxora uses Xendit Invoice. Configure the Xendit dashboard to call the backend invoice webhook URL for paid and expired invoice events.

For local development, expose the backend with a secure tunnel such as ngrok before testing webhook callbacks.

## RajaOngkir

RajaOngkir is used for:

- Destination search
- Domestic shipping cost calculation

`RAJAONGKIR_ORIGIN_ID` should be filled with the selected origin destination ID returned by RajaOngkir destination search.

## Security

- Keep secret keys only in the backend environment.
- Never expose `XENDIT_SECRET_KEY`, `RAJAONGKIR_API_KEY`, `JWT_SECRET`, or database URLs to the frontend.
- All protected controllers require JWT middleware.
- Admin-only controllers require role guard middleware.
- Xendit webhook requests are checked against the callback token.

## Auth.js social login

Auth.js owns only the Google/TikTok OAuth handshake under `/api/auth/*`.
Email/password registration and login, Nexxora JWT issuance, `/api/auth/me`,
and the existing role middleware remain unchanged.

Set `AUTH_SECRET` to a random value of at least 32 characters and configure:

```env
AUTH_TRUST_HOST=true
BACKEND_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
TIKTOK_CLIENT_ID=
TIKTOK_CLIENT_SECRET=
```

Provider callback URLs:

- Google: `http://localhost:8000/api/auth/callback/google`
- TikTok: `https://YOUR_PUBLIC_DOMAIN/api/auth/callback/tiktok`

After a successful provider callback, Nexxora creates or links `User` and
`OAuthAccount`, creates the existing Nexxora JWT, and redirects to the frontend
callback. Provider access/refresh tokens are not returned to the frontend and
are intentionally not persisted until a server-side provider use case exists.

Google links by provider account ID first, then verified email. TikTok Login Kit
does not provide email; Nexxora uses
`tiktok_<providerAccountId>@oauth.local` and marks the profile incomplete.
TikTok production applications do not accept localhost callback domains. Use
TikTok sandbox plus a secure ngrok URL, or an approved real HTTPS domain.

## ERP Marketplace mock mode

The ERP module is separate from TikTok user login. It uses provider adapters for
`TOKOPEDIA` and `TIKTOK_SHOP`, with `MOCK` and `LIVE` modes.

```env
MARKETPLACE_MODE=mock
MARKETPLACE_ENCRYPTION_KEY=
```

Mock mode is the default and does not read or require any Partner Center
credentials. In the admin dashboard:

1. Connect Tokopedia and TikTok Shop.
2. Run product sync and order sync.
3. Link marketplace products to existing Nexxora products.
4. Push Nexxora stock/price for linked products.
5. Import an order after every order item is linked.

Order import is idempotent, deducts local stock once, and never creates a Xendit
payment. Marketplace payloads remain in `rawData`; operational actions create
sync logs.

Test a mock webhook without JWT:

```bash
curl -X POST http://localhost:8000/api/marketplace/webhook/tokopedia \
  -H "Content-Type: application/json" \
  -d '{"eventType":"order.paid","eventId":"mock-event-001","orderId":"TKP-ORD-20260701-001"}'
```

All other `/api/marketplace` routes require an admin Nexxora JWT.

## Marketplace routes

- `GET /api/marketplace/status`
- `GET /api/marketplace/accounts`
- `POST /api/marketplace/:provider/connect`
- `POST /api/marketplace/:provider/disconnect`
- `GET /api/marketplace/:provider/test-connection`
- `GET /api/marketplace/:provider/shop`
- `GET|POST /api/marketplace/:provider/products[/:id]`
- `POST /api/marketplace/:provider/products/sync`
- `POST /api/marketplace/:provider/products/:id/link-local-product`
- `PATCH /api/marketplace/:provider/products/:id/sync-stock`
- `PATCH /api/marketplace/:provider/products/:id/sync-price`
- `GET|POST /api/marketplace/:provider/orders[/:id]`
- `POST /api/marketplace/:provider/orders/sync`
- `POST /api/marketplace/:provider/orders/:id/import`
- `GET /api/marketplace/sync-logs`
- `GET /api/marketplace/webhook-events`
- `POST /api/marketplace/webhook/:provider`

Use `tokopedia` or `tiktok-shop` as the URL provider.

## Switching to live mode later

Do not switch until the applicable Partner Center has approved the application.
Then fill the optional `TOKOPEDIA_*` and/or `TIKTOK_SHOP_*` variables from
`.env.example`, implement the documented token lifecycle and endpoints in the
two live adapter services, encrypt credentials/tokens at rest, and implement
each provider's exact webhook canonicalization/signature rules. Finally set:

```env
MARKETPLACE_MODE=live
```

Live mode validates required variables when a provider is used. Its current
adapter deliberately returns a clear not-implemented error; no undocumented
endpoint or signing behavior has been guessed.
