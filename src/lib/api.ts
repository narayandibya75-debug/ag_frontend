const RAW_URL = import.meta.env.VITE_API_URL as string | undefined;

/** In production the backend address must be provided at build time via VITE_API_URL. */
export const API_CONFIGURED = Boolean(RAW_URL) || import.meta.env.DEV;

export const API_URL = (RAW_URL || "http://localhost:8000").replace(/\/$/, "");

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit, params?: Record<string, number | string>): Promise<T> {
  if (!API_CONFIGURED) {
    throw new ApiError("The backend address is not configured (VITE_API_URL is not set).", 0);
  }
  const url = new URL(API_URL + path);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));

  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new ApiError("Cannot reach the server. Check your internet connection and the API address.", 0);
  }

  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = typeof body.detail === "string" ? body.detail : "";
    } catch {
      /* ignore */
    }
    if (res.status === 503) throw new ApiError("The AI models are still starting. Wait a minute and try again.", 503);
    if (res.status === 422) throw new ApiError("Some values are missing or are not valid numbers.", 422);
    throw new ApiError(detail || `The server returned an error (${res.status}).`, res.status);
  }
  return res.json() as Promise<T>;
}

const json = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export interface Health {
  ready: boolean;
  status: string;
  error: string | null;
}

export interface SensorData {
  moisture: number | null;
  temperature: number | null;
  ec: number | null;
  ph: number | null;
  N: number | null;
  P: number | null;
  K: number | null;
  rainfall: number | null;
  updated_at: string | null;
  source: string;
}

export interface CropInput {
  N: number; P: number; K: number; temperature: number; humidity: number; ph: number; rainfall: number;
}

export interface YieldInput {
  temperature: number; rainfall: number; ph: number; N: number; P: number; K: number;
}

export interface FertilizerAdvice {
  nitrogen: string;
  phosphorus: string;
  potassium: string;
  ph?: string;
  overall: string;
}

export interface Cure {
  name: string;
  pesticide: string;
  chemical: string;
  dosage: string;
  schedule: string;
  organic: string;
  cure: string;
}

export interface DiseaseResult {
  disease: string;
  confidence: number; // 0-100
  cure: Cure;
}

export interface IrrigationResult {
  irrigation: "ON" | "OFF";
  reason: string;
  moisture: number;
  temperature: number;
  humidity: number;
  rainfall: number;
  ph: number;
  city: string;
}

export const api = {
  health: () => request<Health>("/health"),
  sensor: () => request<SensorData>("/sensor_data"),
  predictCrop: (p: CropInput) =>
    request<{ recommended_crop: string }>("/predict_crop", undefined, { ...p }),
  predictYield: (p: YieldInput) =>
    request<{ predicted_yield: number }>("/predict_yield", undefined, { ...p }),
  fertilizer: (p: { N: number; P: number; K: number; ph: number; crop: string }) =>
    request<{ recommendation: FertilizerAdvice }>("/fertilizer", json(p)),
  irrigation: (p: { moisture: number; ph: number; city: string }) =>
    request<IrrigationResult>("/irrigation_ai", json(p)),
  disease: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<DiseaseResult>("/predict_disease", { method: "POST", body: form });
  },
};
