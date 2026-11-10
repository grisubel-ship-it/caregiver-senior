import axios from "axios";
import { getAppUserId, isNative } from "@/lib/subscription";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

// Ridimensiona e comprime ogni pagina per tenere il PDF leggero
async function toJpeg(src, maxSide = 1700) {
  const img = await loadImage(src);
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
  return { data: canvas.toDataURL("image/jpeg", 0.72), w: canvas.width, h: canvas.height };
}

export async function imagesToPdf(sources) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const [pw, ph, m] = [210, 297, 8];
  for (let i = 0; i < sources.length; i += 1) {
    const { data, w, h } = await toJpeg(sources[i]);
    if (i > 0) pdf.addPage();
    const ratio = Math.min((pw - 2 * m) / w, (ph - 2 * m) / h);
    const [iw, ih] = [w * ratio, h * ratio];
    pdf.addImage(data, "JPEG", (pw - iw) / 2, (ph - ih) / 2, iw, ih);
  }
  return pdf.output("blob");
}

// Apre lo scanner nativo (ritaglio automatico); restituisce le pagine come data URL
export async function scanPagesNative() {
  const { registerPlugin, Capacitor } = await import("@capacitor/core");
  const DocumentScanner = Capacitor.getPlatform() === "android"
    ? registerPlugin("DocScanner")
    : (await import("capacitor-document-scanner")).DocumentScanner;
  const { scannedImages, status } = await DocumentScanner.scanDocument({
    responseType: "base64",
    croppedImageQuality: 85,
    maxNumDocuments: 24,
  });
  if (status === "cancel" || !scannedImages?.length) return [];
  return scannedImages.map((b) => (b.startsWith("data:") ? b : `data:image/jpeg;base64,${b}`));
}

export const readFilesAsDataUrls = (files) =>
  Promise.all(
    [...files].map(
      (f) =>
        new Promise((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result);
          r.onerror = reject;
          r.readAsDataURL(f);
        })
    )
  );

export async function uploadDocument(patientId, pdfBlob, title, pages, category, expiresOn = "", replaces = "") {
  const form = new FormData();
  form.append("file", pdfBlob, "documento.pdf");
  form.append("title", title);
  form.append("category", category);
  form.append("expires_on", expiresOn);
  form.append("replaces", replaces);
  form.append("pages", String(pages));
  form.append("app_user_id", getAppUserId());
  const { data } = await axios.post(`${API}/patients/${patientId}/documents`, form, { timeout: 120000 });
  return data;
}

export const searchDocuments = async (q, category) =>
  (await axios.get(`${API}/documents/search`, { params: { q, category, app_user_id: getAppUserId() } })).data;

export const listExpiring = async (within = 30) =>
  (await axios.get(`${API}/documents/expiring`, { params: { within, app_user_id: getAppUserId() } })).data;

export const listDocuments = async (patientId) =>
  (await axios.get(`${API}/patients/${patientId}/documents`)).data;

export const deleteDocument = (id) => axios.delete(`${API}/documents/${id}`, { params: { app_user_id: getAppUserId() } });

export const updateDocument = async (id, changes) =>
  (await axios.patch(`${API}/documents/${id}`, { ...changes, app_user_id: getAppUserId() })).data;

const blobToBase64 = (blob) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1]);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });

const fetchPdf = async (doc) =>
  (await axios.get(`${API}/documents/${doc.id}/file`, { responseType: "blob", timeout: 120000 })).data;
const fileName = (doc) => `${(doc.title || "documento").replace(/[^\w\- ]+/g, "_").slice(0, 60)}.pdf`;

// App: salva il PDF e apre il menu del telefono (WhatsApp, email, stampa...) con il file allegato
async function shareNative(doc, blob, dialogTitle) {
  const { Filesystem, Directory } = await import("@capacitor/filesystem");
  const { Share } = await import("@capacitor/share");
  const { uri } = await Filesystem.writeFile({ path: fileName(doc), data: await blobToBase64(blob), directory: Directory.Cache });
  await Share.share({ title: doc.title, text: doc.title, files: [uri], dialogTitle });
}

// Web: apre il PDF in una nuova scheda. App: menu Apri con / Condividi
export async function openDocument(doc) {
  // La finestra si apre subito (gesto dell'utente) per non essere bloccata dal browser
  const win = isNative() ? null : window.open("", "_blank");
  const data = await fetchPdf(doc);
  if (isNative()) return shareNative(doc, data, "Apri o condividi il documento");
  const url = URL.createObjectURL(data);
  if (win) win.location.href = url;
  else window.location.assign(url);
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

// Riepilogo per il medico: app -> menu Condividi con il PDF, web -> download
export async function getSummary(patient, days) {
  const { data } = await axios.get(`${API}/patients/${patient.id}/summary.pdf`, {
    params: { days, app_user_id: getAppUserId() },
    responseType: "blob",
    timeout: 180000,
  });
  const doc = { title: `Riepilogo medico ${patient.name}` };
  if (isNative()) return shareNative(doc, data, "Invia o salva il riepilogo");
  const url = URL.createObjectURL(data);
  const a = Object.assign(document.createElement("a"), { href: url, download: fileName(doc) });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

// Condivide il PDF allegato; sul web senza condivisione di file lo scarica. Ritorna "shared" | "downloaded"
export async function shareDocument(doc) {
  const data = await fetchPdf(doc);
  if (isNative()) {
    await shareNative(doc, data, "Invia il documento");
    return "shared";
  }
  const file = new File([data], fileName(doc), { type: "application/pdf" });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: doc.title, text: doc.title });
      return "shared";
    } catch (e) {
      if (e?.name === "AbortError") throw new Error("cancel");
    }
  }
  const url = URL.createObjectURL(data);
  const a = Object.assign(document.createElement("a"), { href: url, download: file.name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return "downloaded";
}
