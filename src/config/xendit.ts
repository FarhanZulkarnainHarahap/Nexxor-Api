import "dotenv/config";

const XENDIT_API_URL = "https://api.xendit.co";

export type XenditInvoiceItem = {
  name: string;
  quantity: number;
  price: number;
  category?: string;
  url?: string;
};

export type XenditInvoiceRequest = {
  external_id: string;
  amount: number;
  description: string;
  invoice_duration: number;
  customer: {
    given_names: string;
    email: string;
    mobile_number?: string;
  };
  success_redirect_url: string;
  failure_redirect_url: string;
  currency: "IDR";
  items: XenditInvoiceItem[];
  metadata: {
    orderId: string;
    userId: string;
    paymentId: string;
  };
};

export type XenditInvoiceResponse = {
  id: string;
  external_id: string;
  status: string;
  amount: number;
  invoice_url: string;
  currency: string;
  expiry_date?: string;
};

function getXenditSecretKey() {
  if (!process.env.XENDIT_SECRET_KEY) {
    throw new Error("XENDIT_SECRET_KEY is required in environment variables");
  }

  return process.env.XENDIT_SECRET_KEY;
}

export async function createXenditInvoice(payload: XenditInvoiceRequest) {
  const response = await fetch(`${XENDIT_API_URL}/v2/invoices`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${getXenditSecretKey()}:`).toString("base64")}`,
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as XenditInvoiceResponse & {
    message?: string;
    error_code?: string;
  };

  if (!response.ok) {
    throw new Error(data.message ?? data.error_code ?? "Failed to create Xendit invoice");
  }

  return data;
}
