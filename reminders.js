import axios from "axios";
import { getAppUserId, isNative } from "@/lib/subscription";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const KEY = "cgsenior.reminders.enabled";
const CHANNEL = "farmaci";

export const listReminders = async (patientId) => (await axios.get(`${API}/patients/${patientId}/reminders`)).data;
export const createReminder = async (patientId, body) =>
  (await axios.post(`${API}/patients/${patientId}/reminders`, { ...body, app_user_id: getAppUserId() })).data;
export const updateReminder = async (id, body) =>
  (await axios.patch(`${API}/reminders/${id}`, { ...body, app_user_id: getAppUserId() })).data;
export const deleteReminder = (id) => axios.delete(`${API}/reminders/${id}`, { params: { app_user_id: getAppUserId() } });

export const enabledIds = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
};
const saveIds = (ids) => localStorage.setItem(KEY, JSON.stringify([...new Set(ids)]));

// ID numerico stabile per ogni coppia promemoria/orario
const notifId = (rid, time) => {
  let h = 0;
  for (const ch of `${rid}|${time}`) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return Math.abs(h) % 2000000000 || 1;
};

const plugin = async () => (await import("@capacitor/local-notifications")).LocalNotifications;
const ACTION_TYPE = "MED_DONE";

const localDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const markTaken = async (reminderId, time) =>
  (await axios.post(`${API}/reminders/${reminderId}/taken`, { app_user_id: getAppUserId(), time, date: localDate() })).data;

// Tasto "Fatto" nella notifica: segna nel diario il farmaco come dato. onResult(ok, already)
export async function initReminderActions(onResult) {
  if (!isNative()) return null;
  const LN = await plugin();
  return LN.addListener("localNotificationActionPerformed", async ({ actionId, notification }) => {
    const { reminderId, time } = notification?.extra || {};
    if (actionId !== "done" || !reminderId) return;
    try {
      const res = await markTaken(reminderId, time);
      onResult(true, res.already);
    } catch {
      onResult(false);
    }
  });
}

// Riprogramma sul telefono tutti i promemoria attivati qui, con i dati aggiornati dal server
export async function syncReminders() {
  if (!isNative()) return;
  const LN = await plugin();
  const ids = enabledIds();
  const items = ids.length ? (await axios.get(`${API}/reminders`, { params: { ids: ids.join(",") } })).data : [];
  saveIds(items.map((r) => r.id));
  const { notifications: pending } = await LN.getPending();
  if (pending.length) await LN.cancel({ notifications: pending.map((n) => ({ id: n.id })) });
  const notifications = items
    .filter((r) => r.active)
    .flatMap((r) =>
      r.times.map((t) => {
        const [hour, minute] = t.split(":").map(Number);
        return {
          id: notifId(r.id, t),
          title: `Farmaco per ${r.patient_name}`,
          body: `${r.medication}${r.dose ? ` · ${r.dose}` : ""} · ore ${t}`,
          channelId: CHANNEL,
          actionTypeId: ACTION_TYPE,
          extra: { reminderId: r.id, time: t },
          schedule: { on: { hour, minute }, allowWhileIdle: true },
        };
      })
    );
  notifications.push(...(await expiryNotifications()));
  if (notifications.length) {
    await LN.registerActionTypes({ types: [{ id: ACTION_TYPE, actions: [{ id: "done", title: "Fatto", foreground: true }] }] });
    await LN.schedule({ notifications });
  }
}

const EXP_KEY = "cgsenior.expiry.alerts";
export const expiryAlertsOn = () => localStorage.getItem(EXP_KEY) === "1";

// Avvisi scadenza documenti alle 9:00: 7 giorni prima e il giorno stesso
async function expiryNotifications() {
  if (!expiryAlertsOn()) return [];
  let docs = [];
  try {
    docs = (await axios.get(`${API}/documents/expiring`, { params: { within: 400, app_user_id: getAppUserId() } })).data;
  } catch {
    return [];
  }
  const now = Date.now();
  return docs.flatMap((d) => {
    const [y, m, day] = d.expires_on.split("-").map(Number);
    return [7, 0]
      .map((before) => ({ before, at: new Date(y, m - 1, day - before, 9, 0) }))
      .filter(({ at }) => at.getTime() > now)
      .map(({ before, at }) => ({
        id: notifId(`exp-${d.id}`, String(before)),
        title: before ? `Documento in scadenza tra 7 giorni` : "Documento in scadenza oggi",
        body: `${d.title} · ${d.patient_name}`,
        channelId: CHANNEL,
        schedule: { at, allowWhileIdle: true },
      }));
  });
}

async function ensurePermission() {
  const LN = await plugin();
  let { display } = await LN.checkPermissions();
  if (display !== "granted") ({ display } = await LN.requestPermissions());
  if (display !== "granted") return false;
  try {
    await LN.createChannel({ id: CHANNEL, name: "Promemoria farmaci", importance: 5, visibility: 1, vibration: true });
  } catch {
    /* iOS non usa i canali */
  }
  return true;
}

export async function setExpiryAlerts(on) {
  if (on && !(await ensurePermission())) return false;
  localStorage.setItem(EXP_KEY, on ? "1" : "0");
  await syncReminders();
  return true;
}

// Attiva/disattiva gli avvisi su questo telefono. Ritorna false se il permesso è negato
export async function setEnabledHere(id, on) {
  if (on) {
    if (!(await ensurePermission())) return false;
    saveIds([...enabledIds(), id]);
  } else {
    saveIds(enabledIds().filter((x) => x !== id));
  }
  await syncReminders();
  return true;
}
