# Nexxora API

Express.js backend for Nexxora. This app handles authentication, catalog data, cart, checkout, coupons, addresses, shipping calculation, payment creation, webhook processing, order tracking, notifications, and admin operations.

## Stack

- Express.js
- TypeScript
- PostgreSQL
- Prisma ORM
- PrismaPg adapter
- JWT authentication
- Bcrypt password hashing
- Cloudinary upload
- Multer file handling
- Xendit invoice payment
- RajaOngkir shipping cost

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
npm run prisma:migrate
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
