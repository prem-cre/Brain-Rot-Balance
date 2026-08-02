import { getDeviceId } from "./device-identity.js";

export const API_BASE_URL = "http://127.0.0.1:8000/api/v1";

export async function apiRequest(path, options = {}) {
  const deviceId = await getDeviceId();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Device-ID": deviceId,
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Brain-Rot Balance API error: ${response.status}`);
  }
  return response.json();
}

export function getDashboard() {
  return apiRequest("/dashboard");
}

export function getWallet() {
  return apiRequest("/wallet");
}

export function classifyVideo(video) {
  return apiRequest("/videos/classify", {
    method: "POST",
    body: JSON.stringify(video),
  });
}
