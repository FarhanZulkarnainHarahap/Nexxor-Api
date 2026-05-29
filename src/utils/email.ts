import { resend, resendFromEmail } from "../config/resend";

type EmailOrderItem = {
  quantity: number;
  price: number;
  product: {
    name: string;
  };
};

type EmailOrder = {
  orderNumber: string;
  totalPrice: number;
  shippingAddress: string;
  orderItems: EmailOrderItem[];
};

type EmailUser = {
  name: string;
  email: string;
};

function getFrontendUrl() {
  return (process.env.FRONTEND_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

function formatRupiah(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function shell(content: string) {
  return `
    <div style="margin:0;background:#f6f8fb;padding:32px;font-family:Inter,Arial,sans-serif;color:#1b263b">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:24px;overflow:hidden">
        <tr>
          <td style="background:#1b263b;padding:28px 32px">
            <div style="font-size:28px;font-weight:900;color:#f8f9fa;letter-spacing:-0.02em">
              Nex<span style="color:#e5a93b">x</span>ora
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:32px">
            ${content}
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;padding:20px 32px;color:#64748b;font-size:13px;line-height:1.7">
            Email ini dikirim otomatis oleh Nexxora. Jika kamu tidak melakukan aktivitas ini, abaikan email ini.
          </td>
        </tr>
      </table>
    </div>
  `;
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!resend) {
    console.warn("RESEND_API_KEY is not configured. Email was skipped.");
    return;
  }

  await resend.emails.send({
    from: resendFromEmail,
    to,
    subject,
    html,
  });
}

export async function sendAccountVerificationEmail(user: EmailUser, token: string) {
  const verificationUrl = `${getFrontendUrl()}/verify-email?token=${encodeURIComponent(token)}`;

  await sendEmail(
    user.email,
    "Verify your Nexxora account",
    shell(`
      <h1 style="margin:0 0 12px;font-size:28px;line-height:1.2;color:#1b263b">Verify your account</h1>
      <p style="margin:0 0 20px;color:#475569;font-size:16px;line-height:1.8">
        Hi ${user.name}, selesaikan verifikasi email agar akun Nexxora kamu aktif dan siap digunakan.
      </p>
      <a href="${verificationUrl}" style="display:inline-block;background:#e5a93b;color:#1b263b;text-decoration:none;font-weight:800;padding:14px 22px;border-radius:14px">
        Verify Email
      </a>
      <p style="margin:24px 0 0;color:#64748b;font-size:14px;line-height:1.7">
        Link verifikasi berlaku selama 24 jam.
      </p>
    `),
  );
}

export async function sendOrderCreatedEmail(user: EmailUser, order: EmailOrder) {
  const orderUrl = `${getFrontendUrl()}/order`;

  await sendEmail(
    user.email,
    `Nexxora order ${order.orderNumber} received`,
    shell(`
      <h1 style="margin:0 0 12px;font-size:28px;line-height:1.2;color:#1b263b">Order received</h1>
      <p style="margin:0 0 20px;color:#475569;font-size:16px;line-height:1.8">
        Hi ${user.name}, pesanan kamu berhasil dibuat. Silakan lanjutkan pembayaran agar pesanan segera diproses.
      </p>
      ${renderOrderSummary(order)}
      <a href="${orderUrl}" style="display:inline-block;margin-top:22px;background:#e5a93b;color:#1b263b;text-decoration:none;font-weight:800;padding:14px 22px;border-radius:14px">
        View Order
      </a>
    `),
  );
}

export async function sendPurchaseSuccessEmail(user: EmailUser, order: EmailOrder) {
  const orderUrl = `${getFrontendUrl()}/order`;

  await sendEmail(
    user.email,
    `Payment received for ${order.orderNumber}`,
    shell(`
      <h1 style="margin:0 0 12px;font-size:28px;line-height:1.2;color:#1b263b">Thank you for your purchase</h1>
      <p style="margin:0 0 20px;color:#475569;font-size:16px;line-height:1.8">
        Hi ${user.name}, pembayaran untuk pesanan ${order.orderNumber} sudah berhasil diterima.
        Pesanan kamu akan segera diproses oleh Nexxora.
      </p>
      ${renderOrderSummary(order)}
      <a href="${orderUrl}" style="display:inline-block;margin-top:22px;background:#e5a93b;color:#1b263b;text-decoration:none;font-weight:800;padding:14px 22px;border-radius:14px">
        Track Order
      </a>
    `),
  );
}

function renderOrderSummary(order: EmailOrder) {
  const rows = order.orderItems
    .map(
      (item) => `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;color:#1f2937">${item.product.name}</td>
          <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;color:#64748b;text-align:center">${item.quantity}x</td>
          <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;color:#1f2937;text-align:right">${formatRupiah(item.price * item.quantity)}</td>
        </tr>
      `,
    )
    .join("");

  return `
    <div style="border:1px solid #e5e7eb;border-radius:18px;padding:18px;background:#f9fafb">
      <p style="margin:0 0 12px;color:#1b263b;font-weight:800">Order ${order.orderNumber}</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        ${rows}
      </table>
      <p style="margin:16px 0 6px;color:#475569;font-size:14px;line-height:1.7">
        Shipping address: ${order.shippingAddress}
      </p>
      <p style="margin:14px 0 0;color:#1b263b;font-size:20px;font-weight:900;text-align:right">
        ${formatRupiah(order.totalPrice)}
      </p>
    </div>
  `;
}
