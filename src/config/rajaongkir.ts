import "dotenv/config";

const baseUrl = process.env.RAJAONGKIR_BASE_URL ?? "https://rajaongkir.komerce.id/api/v1";
const apiKey = process.env.RAJAONGKIR_API_KEY;

export type RajaOngkirDestination = {
  id: number;
  label: string;
  province_name: string;
  city_name: string;
  district_name: string;
  subdistrict_name?: string;
  zip_code?: string;
};

export type RajaOngkirCost = {
  name: string;
  code: string;
  service: string;
  description: string;
  cost: number;
  etd: string;
};

type RajaOngkirResponse<T> = {
  meta?: {
    message?: string;
    code?: number;
    status?: string;
  };
  data: T;
};

function getRajaOngkirKey() {
  if (!apiKey) {
    throw new Error("RAJAONGKIR_API_KEY is required in environment variables");
  }

  return apiKey;
}

async function parseRajaOngkirResponse<T>(response: Response) {
  const json = (await response.json()) as RajaOngkirResponse<T>;

  if (!response.ok || json.meta?.status === "error") {
    throw new Error(json.meta?.message ?? "RajaOngkir request failed");
  }

  return json.data;
}

export async function searchDomesticDestination(search: string, limit = 10) {
  const key = getRajaOngkirKey();

  const url = new URL(`${baseUrl}/destination/domestic-destination`);
  url.searchParams.set("search", search);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", "0");

  const response = await fetch(url, {
    headers: {
      key,
    },
  });

  return parseRajaOngkirResponse<RajaOngkirDestination[]>(response);
}

export async function calculateDomesticCost(params: {
  origin: string;
  destination: string;
  weight: number;
  courier: string;
  price?: "lowest" | "highest";
}) {
  const key = getRajaOngkirKey();

  const body = new URLSearchParams();
  body.set("origin", params.origin);
  body.set("destination", params.destination);
  body.set("weight", String(params.weight));
  body.set("courier", params.courier);
  if (params.price) body.set("price", params.price);

  const response = await fetch(`${baseUrl}/calculate/domestic-cost`, {
    method: "POST",
    headers: {
      key,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  return parseRajaOngkirResponse<RajaOngkirCost[]>(response);
}
