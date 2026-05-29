const controllerGroups = [
  {
    name: "Auth",
    badge: "JWT",
    description: "Register, login, and session profile validation.",
  },
  {
    name: "Product",
    badge: "Catalog",
    description: "Product listing, detail, admin create, update, delete, and image upload.",
  },
  {
    name: "Category",
    badge: "Admin",
    description: "Catalog category management for filtering and product grouping.",
  },
  {
    name: "Cart",
    badge: "Customer",
    description: "Cart retrieval, item quantity updates, remove item, and clear cart.",
  },
  {
    name: "Order",
    badge: "Checkout",
    description: "Checkout flow, order history, order detail, and admin status updates.",
  },
  {
    name: "Payment",
    badge: "Xendit",
    description: "Invoice creation, payment status, and verified webhook processing.",
  },
  {
    name: "Coupon",
    badge: "Discount",
    description: "Coupon validation, usage tracking, and admin coupon management.",
  },
  {
    name: "Address",
    badge: "Shipping",
    description: "Saved customer shipping addresses connected with RajaOngkir destinations.",
  },
  {
    name: "Shipping",
    badge: "RajaOngkir",
    description: "Destination search and domestic shipping cost calculation.",
  },
  {
    name: "User",
    badge: "Profile",
    description: "Profile update and avatar upload through Cloudinary.",
  },
  {
    name: "Notification",
    badge: "Realtime-ready",
    description: "Order and payment notifications with unread state management.",
  },
];

export function renderApiHome() {
  const controllerCards = controllerGroups
    .map(
      (group) => `
        <article class="card">
          <div class="card-top">
            <h3>${group.name}</h3>
            <span>${group.badge}</span>
          </div>
          <p>${group.description}</p>
        </article>
      `,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Nexxora API</title>
    <style>
      :root {
        --navy: #1b263b;
        --slate: #415a77;
        --gold: #e5a93b;
        --rose: #e0a96d;
        --text: #f8f9fa;
        --muted: #d6dde6;
        --line: rgba(248, 249, 250, 0.14);
        --success: #22c55e;
      }

      * {
        box-sizing: border-box;
      }

      body {
        min-height: 100vh;
        margin: 0;
        background:
          radial-gradient(circle at top left, rgba(229, 169, 59, 0.18), transparent 32rem),
          radial-gradient(circle at bottom right, rgba(65, 90, 119, 0.7), transparent 34rem),
          linear-gradient(135deg, #111827 0%, var(--navy) 48%, #0f172a 100%);
        color: var(--text);
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      main {
        width: min(1180px, calc(100% - 32px));
        margin: 0 auto;
        padding: 56px 0;
      }

      .hero {
        position: relative;
        overflow: hidden;
        border: 1px solid var(--line);
        border-radius: 28px;
        background: rgba(65, 90, 119, 0.34);
        padding: clamp(28px, 5vw, 58px);
        box-shadow: 0 28px 90px rgba(0, 0, 0, 0.28);
        backdrop-filter: blur(18px);
      }

      .hero::after {
        content: "";
        position: absolute;
        width: 320px;
        height: 320px;
        right: -120px;
        top: -120px;
        border: 1px solid rgba(229, 169, 59, 0.22);
        border-radius: 50%;
      }

      .eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        margin: 0 0 18px;
        border: 1px solid rgba(229, 169, 59, 0.28);
        border-radius: 999px;
        background: rgba(229, 169, 59, 0.12);
        padding: 10px 16px;
        color: var(--gold);
        font-size: 13px;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .pulse {
        width: 10px;
        height: 10px;
        border-radius: 999px;
        background: var(--success);
        box-shadow: 0 0 0 8px rgba(34, 197, 94, 0.12);
      }

      h1 {
        position: relative;
        z-index: 1;
        max-width: 820px;
        margin: 0;
        font-size: clamp(42px, 7vw, 84px);
        line-height: 0.95;
        letter-spacing: -0.03em;
      }

      h1 span {
        color: var(--gold);
      }

      .hero-text {
        position: relative;
        z-index: 1;
        max-width: 760px;
        margin: 24px 0 0;
        color: var(--muted);
        font-size: clamp(16px, 2vw, 20px);
        line-height: 1.8;
      }

      .meta {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 14px;
        margin-top: 26px;
      }

      .meta div,
      .card {
        border: 1px solid var(--line);
        border-radius: 20px;
        background: rgba(255, 255, 255, 0.06);
      }

      .meta div {
        padding: 18px;
      }

      .meta strong {
        display: block;
        color: var(--gold);
        font-size: 22px;
      }

      .meta span {
        display: block;
        margin-top: 6px;
        color: var(--muted);
        font-size: 13px;
      }

      .section-title {
        display: flex;
        align-items: end;
        justify-content: space-between;
        gap: 20px;
        margin: 40px 0 18px;
      }

      .section-title h2 {
        margin: 0;
        font-size: clamp(28px, 4vw, 44px);
      }

      .section-title p {
        max-width: 520px;
        margin: 0;
        color: var(--muted);
        line-height: 1.7;
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
      }

      .card {
        min-height: 164px;
        padding: 22px;
        transition: transform 180ms ease, border-color 180ms ease, background 180ms ease;
      }

      .card:hover {
        transform: translateY(-5px);
        border-color: rgba(229, 169, 59, 0.45);
        background: rgba(255, 255, 255, 0.09);
      }

      .card-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
      }

      .card h3 {
        margin: 0;
        font-size: 21px;
      }

      .card span {
        border-radius: 999px;
        background: rgba(229, 169, 59, 0.14);
        padding: 7px 10px;
        color: var(--gold);
        font-size: 12px;
        font-weight: 800;
      }

      .card p {
        margin: 18px 0 0;
        color: var(--muted);
        line-height: 1.7;
      }

      .footer {
        margin-top: 34px;
        border: 1px solid var(--line);
        border-radius: 22px;
        background: rgba(17, 24, 39, 0.48);
        padding: 20px;
        color: var(--muted);
        line-height: 1.7;
      }

      code {
        color: var(--gold);
      }

      @media (max-width: 900px) {
        .meta,
        .grid {
          grid-template-columns: repeat(2, 1fr);
        }

        .section-title {
          align-items: start;
          flex-direction: column;
        }
      }

      @media (max-width: 620px) {
        main {
          width: min(100% - 24px, 1180px);
          padding: 28px 0;
        }

        .hero {
          border-radius: 22px;
        }

        .meta,
        .grid {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <section class="hero">
        <p class="eyebrow"><span class="pulse"></span> API Online</p>
        <h1>Nexxora <span>API</span> Control Layer</h1>
        <p class="hero-text">
          Backend service for shopping operations, authentication, product data, orders, payments, shipping,
          coupons, customer profiles, and admin management workflows.
        </p>
        <div class="meta">
          <div><strong>Express</strong><span>TypeScript API</span></div>
          <div><strong>Prisma</strong><span>PostgreSQL ORM</span></div>
          <div><strong>Xendit</strong><span>Invoice payment</span></div>
          <div><strong>RajaOngkir</strong><span>Shipping rates</span></div>
        </div>
      </section>

      <section>
        <div class="section-title">
          <h2>Controller Modules</h2>
          <p>Every domain is split into scalable controllers and routers, with protected access for customer and admin flows.</p>
        </div>
        <div class="grid">
          ${controllerCards}
        </div>
      </section>

      <section class="footer">
        <strong>Nexxora API</strong> is ready for production deployment. Use the frontend app with
        <code>NEXT_PUBLIC_API_URL</code> pointing to this service domain.
      </section>
    </main>
  </body>
</html>`;
}
