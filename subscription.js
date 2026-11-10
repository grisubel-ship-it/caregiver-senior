// src/lib/subscription.js
// Wrapper per RevenueCat Purchases con fallback sicuro su web (dove il plugin non funziona).
// Persiste un appUserID stabile via localStorage.

import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const APP_USER_ID_KEY = "cgsync.app_user_id";
const RC_KEYS = {
  android: process.env.REACT_APP_RC_ANDROID_KEY || "",
  ios: process.env.REACT_APP_RC_IOS_KEY || "",
};
const rcKey = () => RC_KEYS[window.Capacitor?.getPlatform?.()] || "";

// Rileva se siamo nell'app nativa Capacitor
export function isNative() {
  return typeof window !== "undefined"
    && window.Capacitor
    && typeof window.Capacitor.isNativePlatform === "function"
    && window.Capacitor.isNativePlatform();
}

// Ottiene o crea un ID stabile per l'utente/dispositivo
export function getAppUserId() {
  if (typeof localStorage === "undefined") return "anon";
  let id = localStorage.getItem(APP_USER_ID_KEY);
  if (!id) {
    id = `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(APP_USER_ID_KEY, id);
  }
  return id;
}

// Configura RevenueCat SDK (solo su native)
let _rcConfigured = false;
export async function configureRevenueCat() {
  if (!isNative() || _rcConfigured) return;
  if (!rcKey()) {
    console.warn("[subscription] chiave RevenueCat non configurata per questa piattaforma — paywall in modalità demo");
    return;
  }
  try {
    const { Purchases, LOG_LEVEL } = await import("@revenuecat/purchases-capacitor");
    await Purchases.setLogLevel({ level: LOG_LEVEL.INFO });
    await Purchases.configure({
      apiKey: rcKey(),
      appUserID: getAppUserId(),
    });
    _rcConfigured = true;
  } catch (e) {
    console.error("[subscription] Errore init RevenueCat", e);
  }
}

// Recupera le offerte da RevenueCat
export async function getOfferings() {
  if (!isNative() || !_rcConfigured) return null;
  try {
    const { Purchases } = await import("@revenuecat/purchases-capacitor");
    const result = await Purchases.getOfferings();
    return result.current || null;
  } catch (e) {
    console.error("[subscription] getOfferings", e);
    return null;
  }
}

// Acquisto pacchetto
export async function purchasePackage(pkg) {
  if (!isNative() || !_rcConfigured) {
    throw new Error("L'acquisto è disponibile solo nell'app Android");
  }
  const { Purchases } = await import("@revenuecat/purchases-capacitor");
  const result = await Purchases.purchasePackage({ aPackage: pkg });
  return result.customerInfo;
}

// Ripristina acquisti
export async function restorePurchases() {
  if (!isNative() || !_rcConfigured) return null;
  const { Purchases } = await import("@revenuecat/purchases-capacitor");
  const result = await Purchases.restorePurchases();
  return result.customerInfo;
}

// Entitlement server-side (fonte di verità)
export async function fetchEntitlement() {
  const uid = getAppUserId();
  const { data } = await axios.get(`${API}/subscription/entitlement`, { params: { app_user_id: uid } });
  return data;
}

// Uso corrente handover (per mostrare "N/3 rimasti")
export async function fetchUsage() {
  const uid = getAppUserId();
  const { data } = await axios.get(`${API}/subscription/usage`, { params: { app_user_id: uid } });
  return data;
}

// Stato di accesso (prova 30gg / convenzione / abbonamento)
export async function fetchAccess() {
  const { data } = await axios.get(`${API}/access/status`, { params: { app_user_id: getAppUserId() } });
  return data;
}

export async function redeemConvention(code) {
  const { data } = await axios.post(`${API}/conventions/redeem`, { code, app_user_id: getAppUserId() });
  return data;
}

// Abbonamento attivo lato store (subito dopo l'acquisto, prima del webhook)
const RC_PRO_UNTIL_KEY = "cgsync.rc_pro_until";
export function rememberStorePro(customerInfo) {
  const ent = customerInfo?.entitlements?.active?.pro_access;
  if (!ent) return false;
  const until = ent.expirationDate ? new Date(ent.expirationDate).getTime() : Date.now() + 864e5;
  localStorage.setItem(RC_PRO_UNTIL_KEY, String(until));
  return true;
}
export function hasLocalStorePro() {
  return Number(localStorage.getItem(RC_PRO_UNTIL_KEY) || 0) > Date.now();
}

// Trova i pacchetti mensile/annuale dalle offerte RevenueCat
export function pickPackages(offering) {
  const pkgs = offering?.availablePackages || [];
  const find = (type, id) =>
    pkgs.find((p) => p.packageType === type) ||
    pkgs.find((p) => (p.product?.identifier || "").startsWith(id));
  return { monthly: find("MONTHLY", "premium_monthly"), yearly: find("ANNUAL", "premium_yearly") };
}

// ID legato al telefono (sopravvive alla reinstallazione dell'app)
let _idReady = null;
export function initAppUserId() {
  if (!_idReady) {
    _idReady = (async () => {
      if (!isNative()) return getAppUserId();
      try {
        const { Device } = await import("@capacitor/device");
        const { identifier } = await Device.getId();
        if (!identifier) return getAppUserId();
        const deviceId = `d_${identifier}`;
        const current = localStorage.getItem(APP_USER_ID_KEY);
        if (current && current !== deviceId) {
          await axios.post(`${API}/access/migrate`, { from_id: current, to_id: deviceId });
        }
        localStorage.setItem(APP_USER_ID_KEY, deviceId);
      } catch (e) {
        console.warn("[subscription] Device ID non disponibile", e);
      }
      return getAppUserId();
    })();
  }
  return _idReady;
}

// Codice convenzione dal link Google Play (solo al primo avvio dopo l'installazione)
const REFERRER_DONE_KEY = "cgsync.referrer_checked";
export async function consumeInstallReferrerCode() {
  if (!isNative() || localStorage.getItem(REFERRER_DONE_KEY)) return null;
  localStorage.setItem(REFERRER_DONE_KEY, "1");
  try {
    const { registerPlugin } = await import("@capacitor/core");
    const { referrer } = await registerPlugin("InstallReferrer").getReferrer();
    return parseCodeFromText(decodeURIComponent(referrer || ""));
  } catch {
    return null;
  }
}

export function parseCodeFromText(text) {
  const m = /(?:conv_code=|[?&]code=|\/c\/)([A-Za-z0-9-]{3,40})/.exec(text || "");
  return m ? m[1].toUpperCase() : null;
}

export const PLAY_URL = "https://play.google.com/store/apps/details?id=com.caregiversync.app";
export const playUrlWithCode = (code) => `${PLAY_URL}&referrer=${encodeURIComponent(`conv_code=${code}`)}`;

// Da compilare quando l'app sarà pubblicata su App Store (es. https://apps.apple.com/it/app/caregiver-senior/id123)
export const APP_STORE_URL = "";
export const isIOSDevice = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
export const isAndroidDevice = () => /android/i.test(navigator.userAgent);
