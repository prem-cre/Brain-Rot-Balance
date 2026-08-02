const DEVICE_ID_KEY = "brain_rot_balance_device_id";

function hasChromeStorage() {
  return typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;
}

function createDeviceId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `device-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function getDeviceId() {
  if (hasChromeStorage()) {
    const result = await chrome.storage.local.get(DEVICE_ID_KEY);
    if (result[DEVICE_ID_KEY]) {
      return result[DEVICE_ID_KEY];
    }
    const deviceId = createDeviceId();
    await chrome.storage.local.set({ [DEVICE_ID_KEY]: deviceId });
    return deviceId;
  }

  const existing = localStorage.getItem(DEVICE_ID_KEY);
  if (existing) {
    return existing;
  }
  const deviceId = createDeviceId();
  localStorage.setItem(DEVICE_ID_KEY, deviceId);
  return deviceId;
}
