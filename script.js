// script.js (versión con Firebase + Firestore + IA ligera + IA local avanzada + IA profunda)

// ----- IMPORTS DE FIREBASE DESDE CDN -----
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// ----- CONFIGURACIÓN DE TU PROYECTO FIREBASE -----
const firebaseConfig = {
  apiKey: "AIzaSyAZdspFCOgzOPKPQ63b2MTs4ZjZz8QoBtg",
  authDomain: "creatividad-digital.firebaseapp.com",
  projectId: "creatividad-digital",
  storageBucket: "creatividad-digital.firebasestorage.app",
  messagingSenderId: "152517888172",
  appId: "1:152517888172:web:c81a4ff025f68925453709"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Colecciones en Firestore
const photosCol = collection(db, "photos");
const ratingsCol = collection(db, "ratings");
const participantsCol = collection(db, "participants");
const sessionsCol = collection(db, "sessions");
const configDocRef = doc(db, "config", "general");

// Ítems de valoración por defecto (expertos)
const DEFAULT_RATING_ITEMS = [
  { id: "item1", label: "Originalidad y novedad" },
  { id: "item2", label: "Expresión creativa y emocional" },
  { id: "item3", label: "Uso innovador de técnicas digitales" },
  { id: "item4", label: "Composición visual y técnica" },
  { id: "item5", label: "Interacción y cocreación" }
];


// CBQD (cuestionario) por defecto
const DEFAULT_CBQD_ENABLED = true;
// Por defecto no incluimos ítems: deben configurarse en el panel de investigación con la versión validada que uses.
const DEFAULT_CBQD_ITEMS = [];

// Configuración IA ligera por defecto
const DEFAULT_AI_CONFIG = {
  enabled: false,
  features: {
    brightness: { enabled: true, weight: 25 },
    contrast: { enabled: true, weight: 25 },
    colorfulness: { enabled: true, weight: 25 },
    edgeDensity: { enabled: true, weight: 25 }
  }
};

// Configuración por defecto de claves
const DEFAULT_AUTH_CONFIG = {
  uploaderPassword: "alumno2025",
  expertPassword: "experto2025",
  adminPassword: "admin2025"
};

// Caché local de contraseñas (ayuda en iOS/Safari si Firestore falla puntualmente)
const LS_AUTH_CACHE_KEY = "authConfigCache_v1";

function normalizePwd(s) {
  return (s ?? "")
    .toString()
    .normalize("NFKC")
    .replace(/\u00A0/g, " ") // NBSP
    .trim();
}

function loadAuthCache() {
  try {
    const raw = localStorage.getItem(LS_AUTH_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function saveAuthCache(authConfig) {
  try {
    localStorage.setItem(LS_AUTH_CACHE_KEY, JSON.stringify(authConfig));
  } catch {
    // Silencioso: si el navegador bloquea storage, no hacemos nada
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}


// NUEVO: configuración por defecto de IA profunda (microservicio externo)
const DEEP_AI_CONFIG = {
  enabled: true, // pon false si quieres desactivarla temporalmente
  endpoint: "https://TU-ENDPOINT-DEEP-AI.com/analyze", // ← CAMBIA ESTA URL
  timeoutMs: 20000
};

// Configuración global simple
let globalConfig = {
  askCenter: false,
  centers: [],
  ratingItems: DEFAULT_RATING_ITEMS,
  aiConfig: DEFAULT_AI_CONFIG,
  authConfig: DEFAULT_AUTH_CONFIG,
  deepAI: DEEP_AI_CONFIG,

  // CBQD
  cbqdEnabled: DEFAULT_CBQD_ENABLED,
  cbqdItems: DEFAULT_CBQD_ITEMS
};

// Estado de carga de configuración (evita que el alumnado entre antes de tener CBQD/contraseñas/ajustes actualizados)
let _configLoaded = false;
let _configOk = false;
let _configLoadPromise = null;

async function ensureConfigLoaded() {
  if (_configLoaded) return _configOk;
  if (_configLoadPromise) return _configLoadPromise;

  _configLoadPromise = (async () => {
    _configOk = await loadGlobalConfig(true);
    _configLoaded = true;
    return _configOk;
  })();

  return _configLoadPromise;
}

// ----- GESTIÓN DE SECCIONES -----
const loginSection = document.getElementById("login-section");
const uploadSection = document.getElementById("upload-section");
const expertSection = document.getElementById("expert-section");
const adminSection = document.getElementById("admin-section");

// Elementos de configuración visual
const centerWrapper = document.getElementById("center-wrapper");
const centerSelect = document.getElementById("center");
const centerNote = document.getElementById("center-note");
const askCenterToggle = document.getElementById("ask-center-toggle");
const centersTextarea = document.getElementById("centers-textarea");
const saveCentersButton = document.getElementById("save-centers-button");
const ratingItemsTextarea = document.getElementById("rating-items-textarea");
const saveRatingItemsButton = document.getElementById("save-rating-items-button");
const resetDbButton = document.getElementById("reset-db-button");
const studiesSelect = document.getElementById("studies");
const bachWrapper = document.getElementById("bach-wrapper");
const ageChart = document.getElementById("age-chart");
const ageChartNote = document.getElementById("age-chart-note");
const loadPhotosButton = document.getElementById("load-photos-button");
const photosList = document.getElementById("photos-list");

// IA ligera: controles en Admin
const aiEnabledToggle = document.getElementById("ai-enabled-toggle");
const aiBrightnessEnabled = document.getElementById("ai-brightness-enabled");
const aiBrightnessWeight = document.getElementById("ai-brightness-weight");
const aiContrastEnabled = document.getElementById("ai-contrast-enabled");
const aiContrastWeight = document.getElementById("ai-contrast-weight");
const aiColorfulnessEnabled = document.getElementById("ai-colorfulness-enabled");
const aiColorfulnessWeight = document.getElementById("ai-colorfulness-weight");
const aiEdgeDensityEnabled = document.getElementById("ai-edgedensity-enabled");
const aiEdgeDensityWeight = document.getElementById("ai-edgedensity-weight");
const saveAiConfigButton = document.getElementById("save-ai-config-button");
// CBQD: controles en Admin
const cbqdEnabledToggle = document.getElementById("cbqd-enabled-toggle");
const cbqdItemsTextarea = document.getElementById("cbqd-items-textarea");
const saveCbqdItemsButton = document.getElementById("save-cbqd-items-button");


// Gestión de claves desde Admin
const uploaderPasswordInput = document.getElementById("uploader-password-input");
const expertPasswordInput = document.getElementById("expert-password-input");
const adminPasswordInput = document.getElementById("admin-password-input");
const savePasswordsButton = document.getElementById("save-passwords-button");

// Rating dinámico (expertos)
const ratingItemsContainer = document.getElementById("rating-items-container");
const puntfSpan = document.getElementById("puntf-value");
let ratingControls = [];

// Botones "Volver al inicio"
const backButtons = document.querySelectorAll(".back-button");
backButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    uploadSection.classList.add("hidden");
    expertSection.classList.add("hidden");
    adminSection.classList.add("hidden");
    loginSection.classList.remove("hidden");

    const roleSelect = document.getElementById("role-select");
    const accessPassword = document.getElementById("access-password");
    if (roleSelect) roleSelect.value = "";
    if (accessPassword) accessPassword.value = "";

    // Asegura que, al volver y acceder de nuevo, no queden datos del alumno anterior
    resetUploaderState({ newParticipant: true });
  });


// Al cargar la página, limpia posibles restos de una participación previa en este dispositivo
window.addEventListener("load", () => {
  try {
    resetUploaderState({ newParticipant: true });
  } catch (err) {
    console.error(err);
  }
});
});

// ---- APLICAR CONFIGURACIÓN ----
function applyCentersToSelect() {
  if (!centerSelect) return;

  centerSelect.innerHTML = "";

  const defaultOption = document.createElement("option");
  if (globalConfig.centers && globalConfig.centers.length > 0) {
    defaultOption.value = "";
    defaultOption.textContent = "Selecciona tu centro";
  } else {
    defaultOption.value = "";
    defaultOption.textContent = "No hay centros configurados";
  }
  centerSelect.appendChild(defaultOption);

  if (Array.isArray(globalConfig.centers)) {
    globalConfig.centers.forEach(name => {
      const trimmed = (name || "").trim();
      if (!trimmed) return;
      const opt = document.createElement("option");
      opt.value = trimmed;
      opt.textContent = trimmed;
      centerSelect.appendChild(opt);
    });
  }

  if (centerNote) {
    if (!globalConfig.centers || globalConfig.centers.length === 0) {
      centerNote.textContent = "Pregunta a tu profesor/a si no aparece tu centro.";
    } else {
      centerNote.textContent = "";
    }
  }
}

function applyConfigToUpload() {
  if (!centerWrapper) return;
  applyCentersToSelect();
  centerWrapper.style.display = globalConfig.askCenter ? "block" : "none";
}

function applyAiConfigToAdmin() {
  const ai = globalConfig.aiConfig || DEFAULT_AI_CONFIG;

  if (aiEnabledToggle) {
    aiEnabledToggle.checked = !!ai.enabled;
  }

  const feats = ai.features || DEFAULT_AI_CONFIG.features;

  if (aiBrightnessEnabled && feats.brightness) {
    aiBrightnessEnabled.checked = !!feats.brightness.enabled;
    aiBrightnessWeight.value = feats.brightness.weight ?? 25;
  }

  if (aiContrastEnabled && feats.contrast) {
    aiContrastEnabled.checked = !!feats.contrast.enabled;
    aiContrastWeight.value = feats.contrast.weight ?? 25;
  }

  if (aiColorfulnessEnabled && feats.colorfulness) {
    aiColorfulnessEnabled.checked = !!feats.colorfulness.enabled;
    aiColorfulnessWeight.value = feats.colorfulness.weight ?? 25;
  }

  if (aiEdgeDensityEnabled && feats.edgeDensity) {
    aiEdgeDensityEnabled.checked = !!feats.edgeDensity.enabled;
    aiEdgeDensityWeight.value = feats.edgeDensity.weight ?? 25;
  }
}

function applyConfigToAdmin() {
  if (askCenterToggle) {
    askCenterToggle.checked = !!globalConfig.askCenter;
  }
  if (centersTextarea) {
    centersTextarea.value = (globalConfig.centers || []).join("\n");
  }
  if (ratingItemsTextarea) {
    ratingItemsTextarea.value = (globalConfig.ratingItems || []).map(i => i.label).join("\n");
  }

  // Claves de acceso
  const auth = globalConfig.authConfig || DEFAULT_AUTH_CONFIG;
  if (uploaderPasswordInput) {
    uploaderPasswordInput.value = auth.uploaderPassword || "";
  }
  if (expertPasswordInput) {
    expertPasswordInput.value = auth.expertPassword || "";
  }
  if (adminPasswordInput) {
    adminPasswordInput.value = auth.adminPassword || "";
  }


  // CBQD
  if (cbqdEnabledToggle) {
    cbqdEnabledToggle.checked = !!globalConfig.cbqdEnabled;
  }
  if (cbqdItemsTextarea) {
    cbqdItemsTextarea.value = (globalConfig.cbqdItems || []).map(it => `${it.domain || "GENERAL"}|${it.text || ""}`.trim()).join("\n");
  }

  applyAiConfigToAdmin();
}

function buildRatingControls() {
  if (!ratingItemsContainer) return;

  ratingItemsContainer.innerHTML = "";
  ratingControls = [];

  const items = globalConfig.ratingItems && globalConfig.ratingItems.length
    ? globalConfig.ratingItems
    : DEFAULT_RATING_ITEMS;

  items.forEach((item, index) => {
    const wrapper = document.createElement("div");
    wrapper.className = "rating-item";

    const labelEl = document.createElement("label");
    const inputId = `rating-item-${item.id}`;
    labelEl.setAttribute("for", inputId);
    labelEl.textContent = `${index + 1}. ${item.label}`;

    const input = document.createElement("input");
    input.type = "range";
    input.min = "1";
    input.max = "10";
    input.value = "5";
    input.id = inputId;

    const valueSpan = document.createElement("span");
    valueSpan.textContent = "5";

    wrapper.appendChild(labelEl);
    wrapper.appendChild(input);
    wrapper.appendChild(valueSpan);

    input.addEventListener("input", () => {
      valueSpan.textContent = input.value;
      updatePuntf();
    });

    ratingItemsContainer.appendChild(wrapper);

    ratingControls.push({
      config: item,
      input,
      valueSpan
    });
  });

  updatePuntf();
}

function updatePuntf() {
  if (!ratingControls.length) {
    if (puntfSpan) puntfSpan.textContent = "0.0";
    return;
  }
  const sum = ratingControls.reduce(
    (acc, rc) => acc + Number(rc.input.value || 0),
    0
  );
  const avg = sum / ratingControls.length;
  if (puntfSpan) {
    puntfSpan.textContent = avg.toFixed(1);
  }
}

// Merge IA config con defaults
function mergeAiConfig(dataAi) {
  const base = JSON.parse(JSON.stringify(DEFAULT_AI_CONFIG));
  if (!dataAi) return base;

  base.enabled = !!dataAi.enabled;

  const srcFeat = dataAi.features || {};
  for (const key of Object.keys(base.features)) {
    if (srcFeat[key]) {
      base.features[key].enabled = !!srcFeat[key].enabled;
      const w = Number(srcFeat[key].weight);
      base.features[key].weight = Number.isFinite(w) ? w : base.features[key].weight;
    }
  }
  return base;
}

// Merge Auth config con defaults
function mergeAuthConfig(dataAuth) {
  const base = { ...DEFAULT_AUTH_CONFIG };
  if (!dataAuth) return base;

  if (typeof dataAuth.uploaderPassword === "string") {
    base.uploaderPassword = dataAuth.uploaderPassword;
  }
  if (typeof dataAuth.expertPassword === "string") {
    base.expertPassword = dataAuth.expertPassword;
  }
  if (typeof dataAuth.adminPassword === "string") {
    base.adminPassword = dataAuth.adminPassword;
  }
  return base;
}

// Merge DeepAI config con defaults
function mergeDeepAIConfig(dataDeep) {
  const base = { ...DEEP_AI_CONFIG };
  if (!dataDeep) return base;
  if (typeof dataDeep.enabled === "boolean") base.enabled = dataDeep.enabled;
  if (typeof dataDeep.endpoint === "string") base.endpoint = dataDeep.endpoint;
  const t = Number(dataDeep.timeoutMs);
  if (Number.isFinite(t) && t > 0) base.timeoutMs = t;
  return base;
}

// Carga configuración desde Firestore.
// Si forceServer=true, intentará evitar valores obsoletos usando lectura desde servidor.
async function loadGlobalConfig(forceServer = false) {
  try {
    let snap;
    if (forceServer) {
      try {
        snap = await getDocFromServer(configDocRef);
      } catch (e) {
        // Si no hay red / el SDK no puede ir al servidor, cae a lectura normal.
        snap = await getDoc(configDocRef);
      }
    } else {
      snap = await getDoc(configDocRef);
    }
    if (snap.exists()) {
      const data = snap.data();
      globalConfig.askCenter = !!data.askCenter;
      globalConfig.centers = Array.isArray(data.centers) ? data.centers : [];
      if (Array.isArray(data.ratingItems) && data.ratingItems.length > 0) {
        globalConfig.ratingItems = data.ratingItems.map((it, idx) => ({
          id: it.id || `item${idx + 1}`,
          label: it.label || `Ítem ${idx + 1}`
        }));
      } else {
        globalConfig.ratingItems = DEFAULT_RATING_ITEMS;
      }
      globalConfig.aiConfig = mergeAiConfig(data.aiConfig);
      globalConfig.authConfig = mergeAuthConfig(data.authConfig);
      globalConfig.deepAI = mergeDeepAIConfig(data.deepAI);
      globalConfig.cbqdEnabled = (data.cbqdEnabled !== undefined) ? !!data.cbqdEnabled : DEFAULT_CBQD_ENABLED;
      globalConfig.cbqdItems = Array.isArray(data.cbqdItems) ? data.cbqdItems : DEFAULT_CBQD_ITEMS;

      // Guarda una copia utilizable de contraseñas para iOS/Safari (si más tarde Firestore falla)
      saveAuthCache(globalConfig.authConfig);
    } else {
      globalConfig.askCenter = false;
      globalConfig.centers = [];
      globalConfig.ratingItems = DEFAULT_RATING_ITEMS;
      globalConfig.aiConfig = DEFAULT_AI_CONFIG;
      globalConfig.authConfig = DEFAULT_AUTH_CONFIG;
      globalConfig.deepAI = DEEP_AI_CONFIG;
      globalConfig.cbqdEnabled = DEFAULT_CBQD_ENABLED;
      globalConfig.cbqdItems = DEFAULT_CBQD_ITEMS;

      saveAuthCache(globalConfig.authConfig);
    }
  } catch (err) {
    console.error("Error cargando configuración global:", err);

    globalConfig.askCenter = false;
    globalConfig.centers = [];
    globalConfig.ratingItems = DEFAULT_RATING_ITEMS;
    globalConfig.aiConfig = DEFAULT_AI_CONFIG;
    globalConfig.deepAI = DEEP_AI_CONFIG;
    globalConfig.cbqdEnabled = DEFAULT_CBQD_ENABLED;
    globalConfig.cbqdItems = DEFAULT_CBQD_ITEMS;

    // En iOS/Safari puede fallar puntualmente Firestore: intenta usar la última config válida
    const cached = loadAuthCache();
    if (cached) {
      globalConfig.authConfig = mergeAuthConfig(cached);
      applyConfigToUpload();
      applyConfigToAdmin();
      buildRatingControls();
      return false;
    }

    globalConfig.authConfig = DEFAULT_AUTH_CONFIG;
    applyConfigToUpload();
    applyConfigToAdmin();
    buildRatingControls();
    return false;
  }

  applyConfigToUpload();
  applyConfigToAdmin();
  buildRatingControls();
  return true;
}

// Cargar configuración al inicio (y garantizar que esté lista antes de usar contraseñas/CBQD)
ensureConfigLoaded();

// Listener para mostrar/ocultar modalidad de Bachillerato según nivel
if (studiesSelect && bachWrapper) {
  studiesSelect.addEventListener("change", () => {
    if (studiesSelect.value === "Bachillerato") {
      bachWrapper.style.display = "block";
    } else {
      bachWrapper.style.display = "none";
      const bachTypeSelect = document.getElementById("bach-type");
      if (bachTypeSelect) bachTypeSelect.value = "";
    }
  });
}

// Listener del checkbox en el panel de admin para pedir centro educativo
if (askCenterToggle) {
  askCenterToggle.addEventListener("change", async () => {
    const newValue = askCenterToggle.checked;
    globalConfig.askCenter = newValue;
    applyConfigToUpload();

    try {
      const snap = await getDoc(configDocRef);
      const payload = { askCenter: newValue };
      if (!snap.exists()) {
        payload.centers = globalConfig.centers || [];
        payload.ratingItems = globalConfig.ratingItems || DEFAULT_RATING_ITEMS;
        payload.aiConfig = globalConfig.aiConfig || DEFAULT_AI_CONFIG;
        payload.authConfig = globalConfig.authConfig || DEFAULT_AUTH_CONFIG;
        payload.deepAI = globalConfig.deepAI || DEEP_AI_CONFIG;
        await setDoc(configDocRef, payload);
      } else {
        await updateDoc(configDocRef, payload);
      }
    } catch (err) {
      console.error("Error actualizando configuración:", err);
      alert("No se ha podido guardar la configuración de centro educativo.");
    }
  });
}

// Guardar lista de centros desde el panel admin
if (saveCentersButton) {
  saveCentersButton.addEventListener("click", async () => {
    if (!centersTextarea) return;
    const rawLines = centersTextarea.value.split("\n");
    const centersList = rawLines
      .map(line => line.trim())
      .filter(line => line.length > 0);

    globalConfig.centers = centersList;
    applyConfigToUpload();

    try {
      const snap = await getDoc(configDocRef);
      const payload = { centers: centersList };
      if (!snap.exists()) {
        payload.askCenter = globalConfig.askCenter;
        payload.ratingItems = globalConfig.ratingItems || DEFAULT_RATING_ITEMS;
        payload.aiConfig = globalConfig.aiConfig || DEFAULT_AI_CONFIG;
        payload.authConfig = globalConfig.authConfig || DEFAULT_AUTH_CONFIG;
        payload.deepAI = globalConfig.deepAI || DEEP_AI_CONFIG;
        await setDoc(configDocRef, payload);
      } else {
        await updateDoc(configDocRef, payload);
      }
      alert("Lista de centros actualizada.");
    } catch (err) {
      console.error("Error guardando centros:", err);
      alert("No se ha podido guardar la lista de centros.");
    }
  });
}

// Guardar ítems de valoración desde el panel admin
if (saveRatingItemsButton) {
  saveRatingItemsButton.addEventListener("click", async () => {
    if (!ratingItemsTextarea) return;
    const rawLines = ratingItemsTextarea.value.split("\n");
    const labels = rawLines
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (!labels.length) {
      alert("Debes introducir al menos un ítem de valoración.");
      return;
    }

    const ratingItems = labels.map((label, idx) => ({
      id: `item${idx + 1}`,
      label
    }));

    globalConfig.ratingItems = ratingItems;
    buildRatingControls();

    try {
      const snap = await getDoc(configDocRef);
      const payload = { ratingItems };
      if (!snap.exists()) {
        payload.askCenter = globalConfig.askCenter;
        payload.centers = globalConfig.centers || [];
        payload.aiConfig = globalConfig.aiConfig || DEFAULT_AI_CONFIG;
        payload.authConfig = globalConfig.authConfig || DEFAULT_AUTH_CONFIG;
        payload.deepAI = globalConfig.deepAI || DEEP_AI_CONFIG;
        await setDoc(configDocRef, payload);
      } else {
        await updateDoc(configDocRef, payload);
      }
      alert("Ítems de valoración actualizados.");
    } catch (err) {
      console.error("Error guardando ítems de valoración:", err);
      alert("No se ha podido guardar los ítems de valoración.");
    }
  });
}

// Guardar configuración IA ligera
if (saveAiConfigButton) {
  saveAiConfigButton.addEventListener("click", async () => {
    const ai = {
      enabled: aiEnabledToggle ? aiEnabledToggle.checked : false,
      features: {
        brightness: {
          enabled: aiBrightnessEnabled ? aiBrightnessEnabled.checked : true,
          weight: Number(aiBrightnessWeight?.value || 0)
        },
        contrast: {
          enabled: aiContrastEnabled ? aiContrastEnabled.checked : true,
          weight: Number(aiContrastWeight?.value || 0)
        },
        colorfulness: {
          enabled: aiColorfulnessEnabled ? aiColorfulnessEnabled.checked : true,
          weight: Number(aiColorfulnessWeight?.value || 0)
        },
        edgeDensity: {
          enabled: aiEdgeDensityEnabled ? aiEdgeDensityEnabled.checked : true,
          weight: Number(aiEdgeDensityWeight?.value || 0)
        }
      }
    };

    globalConfig.aiConfig = ai;

    try {
      const snap = await getDoc(configDocRef);
      const payload = { aiConfig: ai };
      if (!snap.exists()) {
        payload.askCenter = globalConfig.askCenter;
        payload.centers = globalConfig.centers || [];
        payload.ratingItems = globalConfig.ratingItems || DEFAULT_RATING_ITEMS;
        payload.authConfig = globalConfig.authConfig || DEFAULT_AUTH_CONFIG;
        payload.deepAI = globalConfig.deepAI || DEEP_AI_CONFIG;
        await setDoc(configDocRef, payload);
      } else {
        await updateDoc(configDocRef, payload);
      }
      alert("Configuración de IA actualizada.");
    } catch (err) {
      console.error("Error guardando configuración IA:", err);
      alert("No se ha podido guardar la configuración de IA.");
    }
  });
}

// Guardar claves de acceso
if (savePasswordsButton) {
  savePasswordsButton.addEventListener("click", async () => {
    const current = mergeAuthConfig(globalConfig.authConfig);

    const newAuthConfig = {
      uploaderPassword: (uploaderPasswordInput?.value.trim() || current.uploaderPassword),
      expertPassword: (expertPasswordInput?.value.trim() || current.expertPassword),
      adminPassword: (adminPasswordInput?.value.trim() || current.adminPassword)
    };

    globalConfig.authConfig = newAuthConfig;

    try {
      const snap = await getDoc(configDocRef);
      const payload = { authConfig: newAuthConfig };
      if (!snap.exists()) {
        payload.askCenter = globalConfig.askCenter;
        payload.centers = globalConfig.centers || [];
        payload.ratingItems = globalConfig.ratingItems || DEFAULT_RATING_ITEMS;
        payload.aiConfig = globalConfig.aiConfig || DEFAULT_AI_CONFIG;
        payload.deepAI = globalConfig.deepAI || DEEP_AI_CONFIG;
        await setDoc(configDocRef, payload);
      } else {
        await updateDoc(configDocRef, payload);
      }
      alert("Claves de acceso actualizadas. A partir de ahora se usarán las nuevas claves.");
    } catch (err) {
      console.error("Error guardando claves de acceso:", err);
      alert("No se han podido guardar las nuevas claves de acceso.");
    }
  });
}

// Reinicializar base de datos (borrar todas las fotos y valoraciones)
if (resetDbButton) {
  resetDbButton.addEventListener("click", async () => {
    const ok = confirm(
      "Esta acción borrará TODAS las fotografías y valoraciones de la base de datos. " +
      "La configuración (centros, ítems, IA, etc.) se mantendrá. ¿Seguro que quieres continuar?"
    );
    if (!ok) return;

    try {
      const [photosSnap, ratingsSnap] = await Promise.all([
        getDocs(photosCol),
        getDocs(ratingsCol)
      ]);

      const ops = [];
      photosSnap.forEach(docSnap => ops.push(deleteDoc(docSnap.ref)));
      ratingsSnap.forEach(docSnap => ops.push(deleteDoc(docSnap.ref)));

      await Promise.all(ops);

      alert("Base de datos reinicializada. Se han borrado todas las fotografías y valoraciones.");
      if (photosList) photosList.innerHTML = "";
      updateAdminSummary();
    } catch (err) {
      console.error("Error al reinicializar la base de datos:", err);
      alert("Ha ocurrido un error al reinicializar la base de datos.");
    }
  });
}

// ================================================
// Redimensionar y comprimir la imagen (adaptado a móvil)
// ================================================
function resizeImage(file, maxWidth = 1920, maxHeight = 1920, quality = 0.7) {
  return new Promise((resolve, reject) => {
    if (!file.type || !file.type.startsWith("image/")) {
      reject(new Error("El archivo seleccionado no es una imagen."));
      return;
    }

    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      try {
        let width = img.width;
        let height = img.height;

        const scale = Math.min(maxWidth / width, maxHeight / height, 1);
        width = Math.round(width * scale);
        height = Math.round(height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        URL.revokeObjectURL(url);
        resolve(dataUrl);
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se ha podido leer la imagen. El formato puede no ser compatible con este navegador."));
    };

    img.src = url;
  });
}

// ================================================
// IA ligera: análisis simple de la imagen en el cliente
// ================================================
function clamp01(x) {
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function computeAiFeaturesFromDataUrl(dataUrl, aiConfig) {
  return new Promise((resolve) => {
    if (!aiConfig || !aiConfig.enabled) {
      resolve({ features: null, score: null });
      return;
    }

    const img = new Image();
    img.onload = () => {
      try {
        // Reducimos la imagen a algo manejable, por ejemplo 256 px de lado mayor
        const maxSide = 256;
        let w = img.width;
        let h = img.height;
        const scale = Math.min(maxSide / w, maxSide / h, 1);
        w = Math.max(1, Math.round(w * scale));
        h = Math.max(1, Math.round(h * scale));

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);

        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;
        const n = w * h;

        let sumLum = 0;
        let sumLum2 = 0;
        let sumColorDiff = 0;

        const lumArr = new Float32Array(n);

        // 1) Luminancia y colorfulness básica
        for (let i = 0; i < n; i++) {
          const r = data[i * 4] / 255;
          const g = data[i * 4 + 1] / 255;
          const b = data[i * 4 + 2] / 255;

          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          lumArr[i] = lum;
          sumLum += lum;
          sumLum2 += lum * lum;

          const cd = (Math.abs(r - g) + Math.abs(r - b) + Math.abs(g - b)) / 3;
          sumColorDiff += cd;
        }

        const meanLum = sumLum / n;
        const varLum = sumLum2 / n - meanLum * meanLum;
        const stdLum = Math.sqrt(Math.max(varLum, 0));

        const brightnessRaw = meanLum;            // 0–1
        const contrastRaw = stdLum;               // ~0–0.4
        const colorfulnessRaw = sumColorDiff / n; // 0–1 aprox

        // 2) Edge density (muy simple, usando gradiente sobre luminancia)
        let edgeSum = 0;
        let edgeCount = 0;
        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const idx = y * w + x;
            const idxL = y * w + (x - 1);
            const idxR = y * w + (x + 1);
            const idxU = (y - 1) * w + x;
            const idxD = (y + 1) * w + x;

            const dx = lumArr[idxR] - lumArr[idxL];
            const dy = lumArr[idxD] - lumArr[idxU];
            const mag = Math.sqrt(dx * dx + dy * dy);
            edgeSum += mag;
            edgeCount++;
          }
        }
        const edgeDensityRaw = edgeCount > 0 ? edgeSum / edgeCount : 0; // 0–~0.7

        const features = {
          brightness: brightnessRaw,
          contrast: contrastRaw,
          colorfulness: colorfulnessRaw,
          edgeDensity: edgeDensityRaw
        };

        // Normalización heurística (0–1) por parámetro
        function normalizeFeature(name, value) {
          switch (name) {
            case "brightness": {
              // Queremos evitar fotos demasiado oscuras o quemadas:
              // pico alrededor de 0.55, caída progresiva hacia 0 y 1
              const val = value;
              const tri = 1 - Math.abs(val - 0.55) / 0.55; // ~1 en 0.55, ~0 en 0 o 1
              return clamp01(tri);
            }
            case "contrast": {
              // Contraste interesante suele estar en torno a 0.25–0.35
              const norm = value / 0.30;
              return clamp01(norm);
            }
            case "colorfulness": {
              // Colores ricos alrededor de 0.3–0.5
              const norm = value / 0.35;
              return clamp01(norm);
            }
            case "edgeDensity": {
              // Complejidad estructural: útil hasta ~0.3
              const norm = value / 0.25;
              return clamp01(norm);
            }
            default:
              return clamp01(value);
          }
        }

        const normFeatures = {};
        for (const key of Object.keys(features)) {
          normFeatures[key] = normalizeFeature(key, features[key]);
        }

        const weights = aiConfig.features || {};
        let num = 0;
        let den = 0;

        for (const key of Object.keys(features)) {
          const fConf = weights[key];
          if (!fConf || !fConf.enabled) continue;
          const wgt = Number(fConf.weight) || 0;
          if (wgt <= 0) continue;
          num += normFeatures[key] * wgt;
          den += wgt;
        }

        let score = null;
        if (den > 0) {
          const avg01 = num / den;

          // Término de “sinergia”: combinación de contraste, color y bordes
          const c = normFeatures.contrast ?? avg01;
          const col = normFeatures.colorfulness ?? avg01;
          const edge = normFeatures.edgeDensity ?? avg01;
          const synergy = clamp01((c * col + col * edge + c * edge) / 3);

          // Mezclamos media y sinergia para aumentar la variabilidad
          const final01 = clamp01(0.7 * avg01 + 0.3 * synergy);

          // Escala 0–10 con dos decimales
          score = +(final01 * 10).toFixed(2);
        }

        resolve({ features, score });
      } catch (err) {
        console.error("Error calculando IA ligera:", err);
        resolve({ features: null, score: null });
      }
    };

    img.onerror = () => {
      console.error("No se ha podido cargar la imagen para IA ligera.");
      resolve({ features: null, score: null });
    };

    img.src = dataUrl;
  });
}

// ================================================
// IA local avanzada: análisis compositivo (tercios, horizonte, φ…)
// ================================================
async function computeLocalAdvancedAnalysis(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const W = img.width;
        const H = img.height;

        const canvas = document.createElement("canvas");
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);

        const pix = ctx.getImageData(0, 0, W, H).data;

        // ---- 1. Centro visual aproximado (contraste local) ----
        let cx = 0, cy = 0, totalWeight = 0;
        for (let y = 1; y < H - 1; y += 4) {
          for (let x = 1; x < W - 1; x += 4) {
            const idx = (y * W + x) * 4;
            const r = pix[idx], g = pix[idx + 1], b = pix[idx + 2];
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;

            const idxR = (y * W + (x + 1)) * 4;
            const r2 = pix[idxR], g2 = pix[idxR + 1], b2 = pix[idxR + 2];
            const lum2 = 0.299 * r2 + 0.587 * g2 + 0.114 * b2;

            const diff = Math.abs(lum - lum2);

            cx += x * diff;
            cy += y * diff;
            totalWeight += diff;
          }
        }

        let centerX = W / 2;
        let centerY = H / 2;
        if (totalWeight > 0) {
          centerX = cx / totalWeight;
          centerY = cy / totalWeight;
        }

        // ---- 2. Regla de los tercios ----
        const tX1 = W / 3, tX2 = (2 * W) / 3;
        const tY1 = H / 3, tY2 = (2 * H) / 3;
        const maxDiag = Math.sqrt(W * W + H * H);

        function dist(x1, y1, x2, y2) {
          return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
        }

        const d1 = dist(centerX, centerY, tX1, tY1);
        const d2 = dist(centerX, centerY, tX2, tY1);
        const d3 = dist(centerX, centerY, tX1, tY2);
        const d4 = dist(centerX, centerY, tX2, tY2);
        const minD = Math.min(d1, d2, d3, d4);
        const thirdsScore01 = 1 - clamp01((minD / maxDiag) * 2.5);

        // ---- 3. Horizonte (borde horizontal fuerte) ----
        let bestY = 0;
        let bestStrength = 0;

        for (let y = 1; y < H - 1; y += 2) {
          let rowDiff = 0;
          for (let x = 1; x < W - 1; x += 4) {
            const idx = (y * W + x) * 4;
            const lum = 0.299 * pix[idx] + 0.587 * pix[idx + 1] + 0.114 * pix[idx + 2];

            const idxD = ((y + 1) * W + x) * 4;
            const lumD = 0.299 * pix[idxD] + 0.587 * pix[idxD + 1] + 0.114 * pix[idxD + 2];

            rowDiff += Math.abs(lum - lumD);
          }
          if (rowDiff > bestStrength) {
            bestStrength = rowDiff;
            bestY = y;
          }
        }

        const idealH1 = H / 3;
        const idealH2 = (2 * H) / 3;
        const dH = Math.min(Math.abs(bestY - idealH1), Math.abs(bestY - idealH2));
        const horizonScore01 = 1 - clamp01((dH / H) * 1.8);

        // ---- 4. Proporción áurea (φ) ----
        const phi = 0.618;
        const gx = W * phi;
        const gy = H * phi;
        const dG = dist(centerX, centerY, gx, gy);
        const goldenScore01 = 1 - clamp01((dG / maxDiag) * 3.2);

        // ---- 5. Saliencia básica por gradiente ----
        let salSum = 0;
        let salCount = 0;
        for (let y = 1; y < H - 1; y += 3) {
          for (let x = 1; x < W - 1; x += 3) {
            const idx = (y * W + x) * 4;
            const lumC = 0.299 * pix[idx] + 0.587 * pix[idx + 1] + 0.114 * pix[idx + 2];

            const idxR = (y * W + (x + 1)) * 4;
            const idxD = ((y + 1) * W + x) * 4;
            const lumR = 0.299 * pix[idxR] + 0.587 * pix[idxR + 1] + 0.114 * pix[idxR + 2];
            const lumD = 0.299 * pix[idxD] + 0.587 * pix[idxD + 1] + 0.114 * pix[idxD + 2];

            const grad = Math.abs(lumC - lumR) + Math.abs(lumC - lumD);
            salSum += grad;
            salCount++;
          }
        }
        const salRaw = salCount > 0 ? salSum / salCount : 0;
        const salienceScore01 = clamp01(salRaw / 50);

        const final01 =
          0.35 * thirdsScore01 +
          0.25 * horizonScore01 +
          0.20 * goldenScore01 +
          0.20 * salienceScore01;

        const localAdvancedScore = +(clamp01(final01) * 10).toFixed(2);

        resolve({
          thirdsScore: +(thirdsScore01 * 10).toFixed(2),
          horizonScore: +(horizonScore01 * 10).toFixed(2),
          goldenScore: +(goldenScore01 * 10).toFixed(2),
          salienceScore: +(salienceScore01 * 10).toFixed(2),
          localAdvancedScore
        });
      } catch (err) {
        console.error("Error IA local avanzada:", err);
        resolve({
          thirdsScore: null,
          horizonScore: null,
          goldenScore: null,
          salienceScore: null,
          localAdvancedScore: null
        });
      }
    };

    img.onerror = () => {
      console.error("Error cargando imagen para IA avanzada.");
      resolve({
        thirdsScore: null,
        horizonScore: null,
        goldenScore: null,
        salienceScore: null,
        localAdvancedScore: null
      });
    };

    img.src = dataUrl;
  });
}

// ================================================
// IA profunda — microservicio externo
// ================================================
async function computeDeepAI(dataUrl) {
  const cfg = globalConfig.deepAI || DEEP_AI_CONFIG;
  if (!cfg.enabled || !cfg.endpoint) {
    return { deepScore: null, deepExplanation: null };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), cfg.timeoutMs || 20000);

    const res = await fetch(cfg.endpoint, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      // Adapta la clave "imageBase64" al contrato real de tu microservicio
      body: JSON.stringify({ imageBase64: dataUrl })
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn("Deep AI: respuesta HTTP no OK:", res.status);
      return { deepScore: null, deepExplanation: null };
    }

    const json = await res.json();
    return {
      deepScore: json.score ?? null,
      deepExplanation: json.explanation ?? null
    };
  } catch (err) {
    console.error("Error llamando a Deep AI:", err);
    return { deepScore: null, deepExplanation: null };
  }
}

// --------------------------------------------------------------
// GESTIÓN DE SECCIONES Y LOGIN
// --------------------------------------------------------------
function showSection(sectionId) {
  [uploadSection, expertSection, adminSection].forEach(sec => sec.classList.add("hidden"));
  if (sectionId === "upload") uploadSection.classList.remove("hidden");
  if (sectionId === "expert") expertSection.classList.remove("hidden");
  if (sectionId === "admin") {
    adminSection.classList.remove("hidden");
    applyConfigToAdmin();
    updateAdminSummary();
  }
}

// ----- LOGIN / ACCESO POR ROL -----
document.getElementById("login-button").addEventListener("click", async () => {
  // 1) Asegura que existe configuración mínima (y cache de auth si Firestore falla)
  const ok = await ensureConfigLoaded();
  // 2) Intenta SIEMPRE refrescar la configuración real desde Firestore.
  //    Esto es clave para que cambios recientes (p. ej., cbqdEnabled) se reflejen al entrar como alumnado.
  try {
    await loadGlobalConfig(true);
  } catch (err) {
    // Reintento silencioso: en iOS/Safari Firestore puede fallar de forma intermitente
    if (!ok) {
      try { await sleep(200); await loadGlobalConfig(true); } catch (_) {}
    }
  }
  const role = document.getElementById("role-select").value;
  const password = normalizePwd(document.getElementById("access-password").value);

  if (!role) {
    alert("Selecciona un tipo de acceso.");
    return;
  }

  const auth = globalConfig.authConfig || DEFAULT_AUTH_CONFIG;
  let expected = "";
  if (role === "uploader") expected = auth.uploaderPassword;
  else if (role === "expert") expected = auth.expertPassword;
  else if (role === "admin") expected = auth.adminPassword;

  expected = normalizePwd(expected);

  if (password !== expected) {
    alert("Clave incorrecta.");
    return;
  }

  loginSection.classList.add("hidden");

  if (role === "uploader") {
    // Vuelve a refrescar por si el panel admin ha cambiado algo justo ahora (CBQD, centros, etc.)
    try { await loadGlobalConfig(true); } catch (_) {}
    applyConfigToUpload();
    resetUploaderState({ newParticipant: true });
    showSection("upload");
  } else if (role === "expert") {
    showSection("expert");
  } else if (role === "admin") {
    showSection("admin");
  }
});


// ----- CBQD (ADMIN): activar/desactivar + configurar ítems -----
if (cbqdEnabledToggle) {
  cbqdEnabledToggle.addEventListener("change", async () => {
    const prev = !!globalConfig.cbqdEnabled;
    globalConfig.cbqdEnabled = !!cbqdEnabledToggle.checked;
    try {
      const snap = await getDoc(configDocRef);
      const payload = { cbqdEnabled: globalConfig.cbqdEnabled };
      if (!snap.exists()) {
        // crear doc completo con defaults mínimos
        await setDoc(configDocRef, {
          askCenter: globalConfig.askCenter,
          centers: globalConfig.centers || [],
          ratingItems: globalConfig.ratingItems || DEFAULT_RATING_ITEMS,
          aiConfig: globalConfig.aiConfig || DEFAULT_AI_CONFIG,
          authConfig: globalConfig.authConfig || DEFAULT_AUTH_CONFIG,
          deepAI: globalConfig.deepAI || DEEP_AI_CONFIG,
          cbqdEnabled: globalConfig.cbqdEnabled,
          cbqdItems: globalConfig.cbqdItems || DEFAULT_CBQD_ITEMS
        });
      } else {
        await updateDoc(configDocRef, payload);
      }

      // Verificación inmediata (evita la sensación de "lo marco pero no hace nada")
      await loadGlobalConfig(true);
      applyConfigToAdmin();
    } catch (err) {
      console.error("Error guardando cbqdEnabled:", err);
      alert("No se ha podido guardar el estado del CBQD.");
      // revertir estado y visualmente
      globalConfig.cbqdEnabled = prev;
      cbqdEnabledToggle.checked = prev;
    }
  });
}

if (saveCbqdItemsButton) {
  saveCbqdItemsButton.addEventListener("click", async () => {
    const raw = (cbqdItemsTextarea?.value || "")
      .split("\n")
      .map(l => l.trim())
      .filter(Boolean);

    const cbqdItems = raw.map((line, idx) => {
      const [domainRaw, ...rest] = line.split("|");
      const domain = (domainRaw || "").trim() || "GENERAL";
      const text = rest.join("|").trim() || `Ítem ${idx + 1}`;
      return { id: `cbqd_${idx + 1}`, domain, text };
    });

    globalConfig.cbqdItems = cbqdItems;
    applyConfigToAdmin();

    try {
      const snap = await getDoc(configDocRef);
      const payload = { cbqdItems };
      if (!snap.exists()) {
        await setDoc(configDocRef, {
          askCenter: globalConfig.askCenter,
          centers: globalConfig.centers || [],
          ratingItems: globalConfig.ratingItems || DEFAULT_RATING_ITEMS,
          aiConfig: globalConfig.aiConfig || DEFAULT_AI_CONFIG,
          authConfig: globalConfig.authConfig || DEFAULT_AUTH_CONFIG,
          deepAI: globalConfig.deepAI || DEEP_AI_CONFIG,
          cbqdEnabled: globalConfig.cbqdEnabled,
          cbqdItems
        });
      } else {
        await updateDoc(configDocRef, payload);
      }

      await loadGlobalConfig(true);
      applyConfigToAdmin();

      alert("CBQD actualizado.");
    } catch (err) {
      console.error("Error guardando CBQD:", err);
      alert("No se ha podido guardar el CBQD.");
    }
  });
}


// ----- WIZARD DE PARTICIPACIÓN (CBQD + 3 microtareas) -----
const wizardSteps = Array.from(document.querySelectorAll(".wizard-step"));
const wizardProgressBar = document.getElementById("wizard-progress-bar");

// Botones del wizard
const wizardNext = document.getElementById("wizard-next");
const wizardNext2 = document.getElementById("wizard-next-2");
const wizardNext3 = document.getElementById("wizard-next-3");
const wizardNext4 = document.getElementById("wizard-next-4");
const wizardBack = document.getElementById("wizard-back");
const wizardBack3 = document.getElementById("wizard-back-3");
const wizardBack4 = document.getElementById("wizard-back-4");
const wizardBack5 = document.getElementById("wizard-back-5");
const submitAllBtn = document.getElementById("submit-all");

const cbqdDisabledBox = document.getElementById("cbqd-disabled");
const cbqdWarningBox = document.getElementById("cbqd-warning");
const cbqdItemsHost = document.getElementById("cbqd-items");
const cbqdScoreBox = document.getElementById("cbqd-scorebox");

// Paso 2 (CBQD) en el wizard: lo mostramos/ocultamos según configuración.
// El wizard controla la visibilidad real; esto evita que el paso quede “anclado”
// por estados previos o por cambios en caliente desde el panel admin.
const cbqdStepEl = document.querySelector('.wizard-step[data-step="2"]');

function syncCbqdStepVisibility() {
  // El paso 2 existe siempre. Su contenido informa si el CBQD está desactivado.
  if (!cbqdStepEl) return;
  cbqdStepEl.classList.remove("hidden");
}

function computeWizardOrder() {
  // Mantén el paso 2 (CBQD) siempre en el flujo del alumnado.
  // Si está desactivado o no hay ítems, se mostrará un aviso en el propio paso.
  return [1, 2, 3, 4, 5];
}

let wizardOrder = computeWizardOrder();
let wizardIdx = 0;

function showWizardStepByIndex(idx) {
  // Asegura que el DOM refleja el estado del CBQD antes de computar el orden.
  syncCbqdStepVisibility();

  wizardOrder = computeWizardOrder();
  wizardIdx = Math.min(Math.max(idx, 0), wizardOrder.length - 1);

  const stepNumber = wizardOrder[wizardIdx];

  wizardSteps.forEach(s => s.classList.add("hidden"));
  const current = wizardSteps.find(s => Number(s.dataset.step) === stepNumber);
  if (current) current.classList.remove("hidden");

  const pct = (wizardIdx / (wizardOrder.length - 1)) * 100;
  if (wizardProgressBar) wizardProgressBar.style.width = `${isFinite(pct) ? pct : 0}%`;

  // estado CBQD (informativo)
  if (stepNumber === 2) {
    const items = globalConfig.cbqdItems || [];
    if (!globalConfig.cbqdEnabled) {
      cbqdDisabledBox?.classList.remove("hidden");
      cbqdWarningBox?.classList.add("hidden");
      cbqdScoreBox?.classList.add("hidden");
      if (cbqdItemsHost) cbqdItemsHost.innerHTML = "";
    } else if (!items.length) {
      cbqdDisabledBox?.classList.add("hidden");
      cbqdWarningBox?.classList.remove("hidden");
      cbqdScoreBox?.classList.add("hidden");
      if (cbqdItemsHost) cbqdItemsHost.innerHTML = "";
    } else {
      cbqdDisabledBox?.classList.add("hidden");
      cbqdWarningBox?.classList.add("hidden");
      cbqdScoreBox?.classList.remove("hidden");
      renderCbqd();
    }
  }
}

function ensureParticipantId() {
  const key = "cbqd_participant_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = `P_${Math.random().toString(16).slice(2)}_${Date.now()}`;
    localStorage.setItem(key, id);
  }
  return id;
}

function clearParticipantId() {
  try {
    localStorage.removeItem("cbqd_participant_id");
  } catch (_) {}
}

// Reinicia el estado del alumnado para evitar que aparezcan datos del participante anterior
function resetUploaderState({ newParticipant = true } = {}) {
  // Formularios del wizard
  const forms = ["step1-form", "task1-form", "task2-form", "task3-form"];
  forms.forEach(id => {
    const f = document.getElementById(id);
    if (f && typeof f.reset === "function") f.reset();
  });

  // Ocultar bloques condicionales
  if (typeof bachWrapper !== "undefined" && bachWrapper) bachWrapper.style.display = "none";
  if (typeof centerWrapper !== "undefined" && centerWrapper) centerWrapper.style.display = globalConfig.askCenter ? "block" : "none";

  // Limpiar radios CBQD explícitamente
  document.querySelectorAll('input[type="radio"][name^="cbqd_"]').forEach(r => { r.checked = false; });

  // Limpiar previews y análisis de microtareas
  const previewIds = [
    "task1-preview", "task2-preview", "task3-preview",
    "task1-ai-analysis", "task2-ai-analysis", "task3-ai-analysis"
  ];
  previewIds.forEach(id => document.getElementById(id)?.classList?.add("hidden"));

  const metaIds = ["task1-preview-meta","task2-preview-meta","task3-preview-meta"];
  metaIds.forEach(id => { const el = document.getElementById(id); if (el) el.textContent = ""; });

  const imgIds = ["task1-preview-image","task2-preview-image","task3-preview-image"];
  imgIds.forEach(id => { const el = document.getElementById(id); if (el) el.src = ""; });

  const scoreIds = [
    "task1-ai-light","task1-ai-local","task1-ai-deep","task1-ai-deep-expl",
    "task2-ai-light","task2-ai-local","task2-ai-deep","task2-ai-deep-expl",
    "task3-ai-light","task3-ai-local","task3-ai-deep","task3-ai-deep-expl",
    "cbqd-total","cbqd-subscales"
  ];
  scoreIds.forEach(id => { const el = document.getElementById(id); if (el) el.textContent = ""; });

  // Cache de IA
  if (typeof microtaskAiCache !== "undefined" && microtaskAiCache) {
    microtaskAiCache.MT1_AUTOEXP = null;
    microtaskAiCache.MT2_ESCOLAR = null;
    microtaskAiCache.MT3_TRANSFORM = null;
  }

  // Vuelve al paso 1 del wizard
  if (typeof showWizardStepByIndex === "function") {
    showWizardStepByIndex(0);
  }

  // Nuevo participante (evita arrastrar identificación entre alumnos)
  if (newParticipant) clearParticipantId();
}


function newSessionId() {
  return `S_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function nowIso() {
  return new Date().toISOString();
}

// Hash simple (no criptográfico) para versionado reproducible en exportaciones.
function simpleHash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // a unsigned + base36 para hacerlo corto
  return (h >>> 0).toString(36);
}

function computeCbqdInstrumentVersion(cbqdItems) {
  const items = Array.isArray(cbqdItems) ? cbqdItems : [];
  const payload = items.map(it => `${it.id}|${it.domain || "GENERAL"}|${it.text || ""}`).join("\n");
  return `CBQD_${items.length}_${simpleHash(payload)}`;
}

function computeCbqdScores(cbqdResponses) {
  const valid = (cbqdResponses || []).filter(r => Number.isFinite(r.value));
  const total = valid.reduce((a, r) => a + r.value, 0);
  const subscales = {};
  valid.forEach(r => {
    const k = (r.domain || "GENERAL").trim() || "GENERAL";
    subscales[k] = (subscales[k] || 0) + r.value;
  });
  return { total, subscales, answered: valid.length, missing: (cbqdResponses || []).length - valid.length };
}

function renderCbqd() {
  if (!cbqdItemsHost) return;

  const items = globalConfig.cbqdItems || [];
  cbqdItemsHost.innerHTML = "";

  if (!items.length) {
    return;
  }

  items.forEach((it, idx) => {
    const box = document.createElement("div");
    box.className = "cbqd-item";
    box.dataset.cbqdId = String(it.id);

    const p = document.createElement("p");
    p.innerHTML = `<strong>${idx + 1}.</strong> ${it.text}`;
    box.appendChild(p);

    const scale = document.createElement("div");
    scale.className = "cbqd-scale";

    for (let v = 1; v <= 5; v++) {
      const lab = document.createElement("label");
      const input = document.createElement("input");
      input.type = "radio";
      input.name = `cbqd_${it.id}`;
      input.value = String(v);
      input.required = true;
      input.addEventListener("change", () => {
        // Si el alumno responde, quitamos cualquier marca de "pendiente".
        box.classList.remove("cbqd-missing");
        updateCbqdScores();
      });

      lab.appendChild(input);
      lab.appendChild(document.createTextNode(String(v)));
      scale.appendChild(lab);
    }

    box.appendChild(scale);
    cbqdItemsHost.appendChild(box);
  });

  updateCbqdScores();
}

// Inyecta un estilo mínimo para indicar ítems CBQD pendientes sin tocar tu CSS.
function ensureCbqdMissingStyle() {
  if (document.getElementById("cbqd-missing-style")) return;
  const style = document.createElement("style");
  style.id = "cbqd-missing-style";
  style.textContent = `
    .cbqd-item.cbqd-missing{outline:2px solid #b00020; outline-offset:6px; border-radius:10px;}
    .cbqd-item.cbqd-missing p{color:#b00020;}
  `;
  document.head.appendChild(style);
}

function showWizardMessage(text) {
  const msg = document.getElementById("wizard-message");
  if (!msg) {
    alert(text);
    return;
  }
  msg.textContent = text;
  msg.className = "message error";
}

function clearWizardMessage() {
  const msg = document.getElementById("wizard-message");
  if (!msg) return;
  msg.textContent = "";
  msg.className = "message";
}

// Valida que el CBQD esté completo (si está activado). Si falta algo, avisa, marca y centra el primer ítem pendiente.
function validateCbqdComplete({ focusFirstMissing = true } = {}) {
  const items = globalConfig.cbqdItems || [];
  const cbqdEnabledNow = !!globalConfig.cbqdEnabled && items.length > 0;
  if (!cbqdEnabledNow) return true;

  const responses = getCbqdResponses();
  const missingIds = responses.filter(r => r.value === null).map(r => String(r.id));

  // Limpia marcas previas
  document.querySelectorAll(".cbqd-item.cbqd-missing").forEach(el => el.classList.remove("cbqd-missing"));

  if (!missingIds.length) return true;

  ensureCbqdMissingStyle();

  // Marca los ítems pendientes
  missingIds.forEach(id => {
    const el = cbqdItemsHost?.querySelector(`.cbqd-item[data-cbqd-id="${CSS.escape(id)}"]`);
    if (el) el.classList.add("cbqd-missing");
  });

  showWizardMessage(`Te falta por responder ${missingIds.length} ítem(s) del CBQD. Complétalos para continuar.`);

  // Lleva al alumno al paso del CBQD si no está ya
  const currentStep = wizardOrder[wizardIdx];
  if (currentStep !== 2) {
    // Busca el índice del paso 2 en el orden actual
    const targetIdx = wizardOrder.indexOf(2);
    if (targetIdx >= 0) showWizardStepByIndex(targetIdx);
  }

  if (focusFirstMissing) {
    const firstId = missingIds[0];
    const firstEl = cbqdItemsHost?.querySelector(`.cbqd-item[data-cbqd-id="${CSS.escape(firstId)}"]`);
    if (firstEl && typeof firstEl.scrollIntoView === "function") {
      firstEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }
  return false;
}

function getCbqdResponses() {
  const items = globalConfig.cbqdItems || [];
  return items.map(it => {
    const sel = document.querySelector(`input[name="cbqd_${it.id}"]:checked`);
    return {
      id: it.id,
      domain: it.domain || "GENERAL",
      value: sel ? Number(sel.value) : null
    };
  });
}

function updateCbqdScores() {
  // Si el alumno va completando, limpia el aviso general cuando ya no falte nada.
  const items = globalConfig.cbqdItems || [];
  if (!!globalConfig.cbqdEnabled && items.length) {
    const stillMissing = getCbqdResponses().some(r => r.value === null);
    if (!stillMissing) {
      clearWizardMessage();
      document.querySelectorAll(".cbqd-item.cbqd-missing").forEach(el => el.classList.remove("cbqd-missing"));
    }
  }
  const totalEl = document.getElementById("cbqd-total");
  const subEl = document.getElementById("cbqd-subscales");

  const resp = getCbqdResponses().filter(r => Number.isFinite(r.value));
  if (!resp.length) {
    if (totalEl) totalEl.textContent = "—";
    if (subEl) subEl.innerHTML = "";
    return;
  }

  const total = resp.reduce((a, r) => a + r.value, 0);
  if (totalEl) totalEl.textContent = String(total);

  const byDom = new Map();
  resp.forEach(r => {
    const k = r.domain || "GENERAL";
    byDom.set(k, (byDom.get(k) || 0) + r.value);
  });

  if (subEl) {
    subEl.innerHTML = "";
    for (const [dom, sum] of byDom.entries()) {
      const p = document.createElement("p");
      p.innerHTML = `<strong>${dom}:</strong> ${sum}`;
      subEl.appendChild(p);
    }
  }
}

// contador microtarea 2
const task2TextArea = document.getElementById("task2-text");
task2TextArea?.addEventListener("input", () => {
  const c = document.getElementById("task2-count");
  if (c) c.textContent = String(task2TextArea.value.length);
});

// ==================================================
// Análisis automático (IA) para microtareas (preview)
// ==================================================
// Cache en memoria para no recalcular continuamente.
// Se recalcula de nuevo en el envío final por robustez.
let microtaskAiCache = {
  MT1_AUTOEXP: null,
  MT2_ESCOLAR: null,
  MT3_TRANSFORM: null
};

async function analyzeDataUrlForUi(dataUrl) {
  // IA ligera
  let aiFeatures = null;
  let aiScore = null;
  try {
    const aiResult = await computeAiFeaturesFromDataUrl(dataUrl, globalConfig.aiConfig);
    aiFeatures = aiResult.features;
    aiScore = aiResult.score;
  } catch (err) {
    console.error("Error IA ligera:", err);
  }

  // IA local avanzada
  let localAdvanced = null;
  try {
    localAdvanced = await computeLocalAdvancedAnalysis(dataUrl);
  } catch (err) {
    console.error("Error IA local avanzada:", err);
    localAdvanced = {
      thirdsScore: null,
      horizonScore: null,
      goldenScore: null,
      salienceScore: null,
      localAdvancedScore: null
    };
  }

  // IA profunda (microservicio)
  let deepAI = null;
  try {
    deepAI = await computeDeepAI(dataUrl);
  } catch (err) {
    console.error("Error IA profunda:", err);
    deepAI = {
      deepScore: null,
      deepExplanation: null
    };
  }

  return { aiFeatures, aiScore, localAdvanced, deepAI };
}

async function analyzeMicrotaskFileAndRender(taskId, file, els) {
  if (!file) return;
  if (!file.type?.includes("jpeg") && !file.name?.toLowerCase?.().endsWith(".jpg") && !file.name?.toLowerCase?.().endsWith(".jpeg")) {
    // No forzamos error aquí: el navegador ya limita por accept; evitamos falsos positivos.
  }

  const { previewBox, previewImg, previewMeta, aiBox, aiLight, aiLocal, aiDeep, aiDeepExpl } = els;

  // Mostrar placeholders
  previewBox?.classList.remove("hidden");
  aiBox?.classList.remove("hidden");
  if (aiLight) aiLight.textContent = "…";
  if (aiLocal) aiLocal.textContent = "…";
  if (aiDeep) aiDeep.textContent = "…";
  if (aiDeepExpl) aiDeepExpl.textContent = "";
  if (previewMeta) previewMeta.textContent = "Procesando y analizando la imagen…";

  // 1) Redimensionar
  const dataUrl = await resizeImage(file);
  if (previewImg) previewImg.src = dataUrl;

  // 2) Analizar
  const analysis = await analyzeDataUrlForUi(dataUrl);

  // 3) Pintar resultados
  const l = analysis.aiScore;
  const loc = analysis.localAdvanced?.localAdvancedScore;
  const d = analysis.deepAI?.deepScore;

  if (aiLight) aiLight.textContent = l != null ? Number(l).toFixed(2) : "–";
  if (aiLocal) aiLocal.textContent = loc != null ? Number(loc).toFixed(2) : "–";
  if (aiDeep) aiDeep.textContent = d != null ? Number(d).toFixed(2) : "–";
  if (aiDeepExpl) aiDeepExpl.textContent = analysis.deepAI?.deepExplanation || "";

  if (previewMeta) {
    const sizeKb = Math.round((dataUrl.length * 0.75) / 1024);
    previewMeta.textContent = `Tamaño aproximado: ${sizeKb} KB`;
  }

  microtaskAiCache[taskId] = {
    dataUrl,
    ...analysis
  };
}

function wireMicrotaskAi(taskId, inputId, prefix) {
  const input = document.getElementById(inputId);
  if (!input) return;

  const els = {
    previewBox: document.getElementById(`${prefix}-preview`),
    previewImg: document.getElementById(`${prefix}-preview-image`),
    previewMeta: document.getElementById(`${prefix}-preview-meta`),
    aiBox: document.getElementById(`${prefix}-ai-analysis`),
    aiLight: document.getElementById(`${prefix}-ai-light`),
    aiLocal: document.getElementById(`${prefix}-ai-local`),
    aiDeep: document.getElementById(`${prefix}-ai-deep`),
    aiDeepExpl: document.getElementById(`${prefix}-ai-deep-expl`)
  };

  input.addEventListener("change", async () => {
    try {
      const file = input.files?.[0];
      if (!file) return;
      await analyzeMicrotaskFileAndRender(taskId, file, els);
    } catch (err) {
      console.error(err);
      els.previewBox?.classList.remove("hidden");
      els.aiBox?.classList.remove("hidden");
      if (els.previewMeta) els.previewMeta.textContent = "No se ha podido analizar esta imagen.";
      if (els.aiLight) els.aiLight.textContent = "–";
      if (els.aiLocal) els.aiLocal.textContent = "–";
      if (els.aiDeep) els.aiDeep.textContent = "–";
      if (els.aiDeepExpl) els.aiDeepExpl.textContent = "";
    }
  });
}

wireMicrotaskAi("MT1_AUTOEXP", "task1-photo", "task1");
wireMicrotaskAi("MT2_ESCOLAR", "task2-photo", "task2");
wireMicrotaskAi("MT3_TRANSFORM", "task3-output", "task3");

// Navegación (validando por pasos)
wizardNext?.addEventListener("click", async () => {
  const step1Form = document.getElementById("step1-form");
  if (step1Form && !step1Form.reportValidity()) return;

  // Refresca la config justo antes de calcular el siguiente paso.
  // Así, si el CBQD se activa/desactiva en admin, el alumnado ve el paso 2 al instante.
  try { await loadGlobalConfig(true); } catch (_) {}

  showWizardStepByIndex(wizardIdx + 1);
});

wizardBack?.addEventListener("click", () => showWizardStepByIndex(wizardIdx - 1));
wizardBack3?.addEventListener("click", () => showWizardStepByIndex(wizardIdx - 1));
wizardBack4?.addEventListener("click", () => showWizardStepByIndex(wizardIdx - 1));
wizardBack5?.addEventListener("click", () => showWizardStepByIndex(wizardIdx - 1));

wizardNext2?.addEventListener("click", () => {
  // Si CBQD está activo, no se puede avanzar hasta completarlo.
  if (!validateCbqdComplete({ focusFirstMissing: true })) return;
  showWizardStepByIndex(wizardIdx + 1);
});

wizardNext3?.addEventListener("click", () => {
  const t1 = document.getElementById("task1-form");
  if (t1 && !t1.reportValidity()) return;
  showWizardStepByIndex(wizardIdx + 1);
});

wizardNext4?.addEventListener("click", () => {
  const t2 = document.getElementById("task2-form");
  if (t2 && !t2.reportValidity()) return;
  showWizardStepByIndex(wizardIdx + 1);
});

submitAllBtn?.addEventListener("click", async () => {
  const msg = document.getElementById("wizard-message");
  if (msg) {
    msg.textContent = "";
    msg.className = "message";
  }

  try {
    await ensureConfigLoaded();
    const step1Form = document.getElementById("step1-form");
    const t1 = document.getElementById("task1-form");
    const t2 = document.getElementById("task2-form");
    const t3 = document.getElementById("task3-form");

    if (step1Form && !step1Form.reportValidity()) return;
    if (t1 && !t1.reportValidity()) return;
    if (t2 && !t2.reportValidity()) return;
    if (t3 && !t3.reportValidity()) return;

    // CBQD (si procede)
    // Si CBQD está activo, bloquea el envío hasta completarlo.
    if (!validateCbqdComplete({ focusFirstMissing: true })) return;

    const participantId = ensureParticipantId();
    const sessionId = newSessionId();
    const submittedAt = nowIso();

    // Demografía (campos ya existentes)
    const ageValue = Number(document.getElementById("age")?.value || 0);
    const gender = document.getElementById("gender")?.value || "";
    const studies = document.getElementById("studies")?.value || "";
    const bachType = document.getElementById("bach-type")?.value || "";
    const vocation = document.getElementById("vocation")?.value?.trim?.() || "";
    const studiesFather = document.getElementById("studies-father")?.value || "";
    const studiesMother = document.getElementById("studies-mother")?.value || "";
    const rep = document.querySelector('input[name="rep"]:checked')?.value || "";
    const fail = document.querySelector('input[name="fail"]:checked')?.value || "";
    const pcsHome = Number(document.getElementById("pcs-home")?.value || 0);
    const pcRoom = document.querySelector('input[name="pc-room"]:checked')?.value || "";
    const pcFrequency = document.getElementById("pc-frequency")?.value || "";
    const pcHours = Number(document.getElementById("pc-hours")?.value || 0);
    const center = document.getElementById("center")?.value || "";

    const privacyOk = document.getElementById("privacy-ok")?.checked;
    if (!privacyOk) throw new Error("Debes aceptar la política de privacidad.");

    const cbqdItemsNow = globalConfig.cbqdItems || [];
    const cbqdEnabledNow = !!globalConfig.cbqdEnabled && cbqdItemsNow.length > 0;
    const cbqdResponses = cbqdEnabledNow ? getCbqdResponses() : [];
    const cbqdInstrumentVersion = cbqdEnabledNow ? computeCbqdInstrumentVersion(cbqdItemsNow) : "";
    const cbqdScores = cbqdEnabledNow ? computeCbqdScores(cbqdResponses) : { total: null, subscales: {}, answered: 0, missing: 0 };

    // Archivos microtareas
    const f1 = document.getElementById("task1-photo")?.files?.[0];
    const f2 = document.getElementById("task2-photo")?.files?.[0];
    const f3 = document.getElementById("task3-output")?.files?.[0];
    const task2Text = (document.getElementById("task2-text")?.value || "").trim();

    if (!f1 || !f2 || !f3) throw new Error("Faltan archivos de alguna microtarea.");
    if (!task2Text || task2Text.length > 280) throw new Error("El texto de la microtarea 2 es obligatorio y ≤ 280 caracteres.");

    // --- Preparar imágenes y análisis IA (por microtarea) ---
    // Reutiliza el cache si ya se analizó en la vista previa, pero vuelve a calcular si falta.
    async function getOrAnalyze(taskId, file) {
      const cached = microtaskAiCache?.[taskId];
      if (cached?.dataUrl) return cached;

      const dataUrl = await resizeImage(file);
      const analysis = await analyzeDataUrlForUi(dataUrl);
      const full = { dataUrl, ...analysis };
      microtaskAiCache[taskId] = full;
      return full;
    }

    const [mt1, mt2, mt3] = await Promise.all([
      getOrAnalyze("MT1_AUTOEXP", f1),
      getOrAnalyze("MT2_ESCOLAR", f2),
      getOrAnalyze("MT3_TRANSFORM", f3)
    ]);

    // Guardar PARTICIPANT (identificador persistente) + SESIÓN (una participación concreta).
    // - participants: mínimo para poder unir y auditar.
    // - sessions: snapshot completo (demografía + CBQD) para análisis científico.
    const participantRef = doc(db, "participants", participantId);
    const pSnap = await getDoc(participantRef);
    const firstSeenAt = (pSnap.exists() && pSnap.data()?.firstSeenAt) ? pSnap.data().firstSeenAt : submittedAt;
    await setDoc(participantRef, {
      participantId,
      firstSeenAt,
      lastSeenAt: submittedAt
    }, { merge: true });

    const demographics = {
      age: ageValue,
      gender,
      studies,
      bachType,
      vocation,
      studiesFather,
      studiesMother,
      rep,
      fail,
      pcsHome,
      pcRoom,
      pcFrequency,
      pcHours,
      center: globalConfig.askCenter ? center : ""
    };

    const sessionRef = doc(db, "sessions", sessionId);
    await setDoc(sessionRef, {
      sessionId,
      participantId,
      submittedAt,
      demographics,
      cbqd: {
        enabled: cbqdEnabledNow,
        instrumentVersion: cbqdInstrumentVersion,
        itemsUsed: cbqdItemsNow.map(it => ({ id: it.id, domain: it.domain || "GENERAL", text: it.text || "" })),
        responses: cbqdResponses,
        scores: {
          total: cbqdScores.total,
          subscales: cbqdScores.subscales,
          answered: cbqdScores.answered,
          missing: cbqdScores.missing
        }
      }
    });

    // Guardar artefactos como "photos" para integrarlos con valoración por expertos
    const commonMeta = {
      participantId,
      sessionId,
      submittedAt,
      taskSource: "wizard",

      // Snapshot mínimo en la foto para no romper la interfaz de expertos ni gráficas rápidas.
      // El 'canon' para análisis está en sessions.demographics.
      age: ageValue,
      gender,
      studies,
      bachType,
      vocation,
      studiesFather,
      studiesMother,
      rep,
      fail,
      pcsHome,
      pcRoom,
      pcFrequency,
      pcHours,
      center: globalConfig.askCenter ? center : "",

      cbqdEnabled: cbqdEnabledNow,
      cbqdVersion: cbqdInstrumentVersion,
      cbqdTotal: cbqdScores.total,
      cbqdSubscales: cbqdScores.subscales,
      cbqdResponses: cbqdResponses
    };

    await addDoc(photosCol, {
      ...commonMeta,
      taskId: "MT1_AUTOEXP",
      dataUrl: mt1.dataUrl,
      aiFeatures: mt1.aiFeatures,
      aiScore: mt1.aiScore,
      localAdvanced: mt1.localAdvanced,
      deepAI: mt1.deepAI
    });

    await addDoc(photosCol, {
      ...commonMeta,
      taskId: "MT2_ESCOLAR",
      dataUrl: mt2.dataUrl,
      text280: task2Text,
      aiFeatures: mt2.aiFeatures,
      aiScore: mt2.aiScore,
      localAdvanced: mt2.localAdvanced,
      deepAI: mt2.deepAI
    });

    await addDoc(photosCol, {
      ...commonMeta,
      taskId: "MT3_TRANSFORM",
      dataUrl: mt3.dataUrl,
      aiFeatures: mt3.aiFeatures,
      aiScore: mt3.aiScore,
      localAdvanced: mt3.localAdvanced,
      deepAI: mt3.deepAI
    });

    if (msg) {
      msg.className = "message success";
      msg.textContent = "¡Enviado! Muchas gracias por participar.";
    }

    // Preparar el dispositivo para un nuevo alumno (sin arrastrar identificación ni respuestas)
    clearParticipantId();
    microtaskAiCache = {};

  } catch (err) {
    console.error(err);
    if (msg) {
      msg.className = "message error";
      msg.textContent = err?.message || "Ha ocurrido un error al enviar.";
    }
  }
});


// ----- SUBIDA DE FOTOGRAFÍA (FIRESTORE + IA) -----
const uploadForm = document.getElementById("upload-form");
const uploadMessage = document.getElementById("upload-message");
const uploadPreview = document.getElementById("upload-preview");
const previewImage = document.getElementById("preview-image");
const previewMeta = document.getElementById("preview-meta");

// NUEVO: bloques de análisis automático en la vista de subida
const uploadAiAnalysis = document.getElementById("upload-ai-analysis");
const aiLightScoreSpan = document.getElementById("ai-light-score");
const aiLocalScoreSpan = document.getElementById("ai-local-score");
const aiDeepScoreSpan = document.getElementById("ai-deep-score");
const aiDeepExplanationP = document.getElementById("ai-deep-explanation");

if (uploadForm) uploadForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  uploadMessage.textContent = "";
  uploadMessage.className = "message";

  if (!uploadForm.reportValidity()) {
    return;
  }

  const fileInput = document.getElementById("photo-file");
  const ageValue = Number(document.getElementById("age").value);
  const gender = document.getElementById("gender").value;
  const studies = document.getElementById("studies").value;
  const bachType = document.getElementById("bach-type").value || "";
  const vocation = document.getElementById("vocation").value.trim();
  const studiesFather = document.getElementById("studies-father").value;
  const studiesMother = document.getElementById("studies-mother").value;

  const rep = document.querySelector('input[name="rep"]:checked')?.value || "";
  const fail = document.querySelector('input[name="fail"]:checked')?.value || "";
  const pcsHome = Number(document.getElementById("pcs-home").value);
  const pcRoom = document.querySelector('input[name="pc-room"]:checked')?.value || "";
  const pcFrequency = document.getElementById("pc-frequency").value;
  const pcHours = Number(document.getElementById("pc-hours").value);
  const center = centerSelect ? centerSelect.value.trim() : "";

  const privacyOk = document.getElementById("privacy-ok");

  if (!Number.isFinite(ageValue) || ageValue < 10 || ageValue > 100) {
    uploadMessage.textContent = "Introduce una edad válida entre 10 y 100 años.";
    uploadMessage.classList.add("error");
    return;
  }

  if (!privacyOk || !privacyOk.checked) {
    uploadMessage.textContent = "Debes aceptar la política de privacidad.";
    uploadMessage.classList.add("error");
    return;
  }

  if (!fileInput.files || !fileInput.files[0]) {
    uploadMessage.textContent = "Debes seleccionar una fotografía.";
    uploadMessage.classList.add("error");
    return;
  }

  const file = fileInput.files[0];

  uploadMessage.textContent = "Procesando fotografía...";
  uploadMessage.className = "message";

  try {
    const dataUrl = await resizeImage(file, 1920, 1920, 0.7);

    if (dataUrl.length > 950000) {
      uploadMessage.textContent =
        "La fotografía sigue siendo demasiado pesada incluso tras comprimirla. Prueba con una imagen más pequeña.";
      uploadMessage.classList.add("error");
      return;
    }

    // IA ligera
    let aiFeatures = null;
    let aiScore = null;
    try {
      const aiResult = await computeAiFeaturesFromDataUrl(dataUrl, globalConfig.aiConfig);
      aiFeatures = aiResult.features;
      aiScore = aiResult.score;
    } catch (err) {
      console.error("Error IA ligera:", err);
    }

    // IA local avanzada
    let localAdvanced = null;
    try {
      localAdvanced = await computeLocalAdvancedAnalysis(dataUrl);
    } catch (err) {
      console.error("Error IA local avanzada:", err);
      localAdvanced = {
        thirdsScore: null,
        horizonScore: null,
        goldenScore: null,
        salienceScore: null,
        localAdvancedScore: null
      };
    }

    // IA profunda (microservicio)
    let deepAI = null;
    try {
      deepAI = await computeDeepAI(dataUrl);
    } catch (err) {
      console.error("Error IA profunda:", err);
      deepAI = {
        deepScore: null,
        deepExplanation: null
      };
    }

    const docRef = await addDoc(photosCol, {
      dataUrl: dataUrl,
      age: ageValue,
      gender: gender,
      studies: studies,
      bachType: bachType,
      vocation: vocation,
      studiesFather: studiesFather,
      studiesMother: studiesMother,
      rep: rep,
      fail: fail,
      pcsHome: pcsHome,
      pcRoom: pcRoom,
      pcFrequency: pcFrequency,
      pcHours: pcHours,
      center: center,

      aiFeatures: aiFeatures,
      aiScore: aiScore,

      localAdvanced: localAdvanced,
      deepAI: deepAI,

      createdAt: new Date().toISOString()
    });

    const photoId = docRef.id;

    uploadMessage.textContent = "Fotografía guardada correctamente en la base de datos. ¡Gracias por tu participación!";
    uploadMessage.className = "message success";

    uploadPreview.classList.remove("hidden");
    previewImage.src = dataUrl;

    const aiText = aiScore != null ? ` | AI_PUNTF: ${aiScore}` : "";
    const localText = localAdvanced?.localAdvancedScore != null ? ` | IA_local: ${localAdvanced.localAdvancedScore}` : "";
    const deepText = deepAI?.deepScore != null ? ` | IA_profunda: ${deepAI.deepScore}` : "";

    previewMeta.textContent =
      "ID: " + photoId +
      " | Edad: " + ageValue +
      " | Sexo: " + gender +
      " | Estudios: " + studies +
      " | Bachillerato: " + (bachType || "N/A") +
      aiText + localText + deepText;

    if (uploadAiAnalysis) {
      uploadAiAnalysis.classList.remove("hidden");
      if (aiLightScoreSpan) {
        aiLightScoreSpan.textContent = aiScore != null ? aiScore.toFixed(2) : "–";
      }
      if (aiLocalScoreSpan) {
        aiLocalScoreSpan.textContent =
          localAdvanced?.localAdvancedScore != null
            ? localAdvanced.localAdvancedScore.toFixed(2)
            : "–";
      }
      if (aiDeepScoreSpan) {
        aiDeepScoreSpan.textContent =
          deepAI?.deepScore != null ? deepAI.deepScore.toFixed(2) : "–";
      }
      if (aiDeepExplanationP) {
        aiDeepExplanationP.textContent = deepAI?.deepExplanation || "";
      }
    }

    uploadForm.reset();
    if (bachWrapper) bachWrapper.style.display = "none";
    applyConfigToUpload(); // reconstruir select de centros tras reset
  } catch (err) {
    console.error("Error al procesar o guardar la fotografía:", err);
    uploadMessage.textContent =
      "Ha ocurrido un problema al procesar la fotografía. Es posible que el formato de la imagen no sea compatible en este dispositivo.";
    uploadMessage.classList.add("error");
  }
});

// ----- VALORACIÓN POR EXPERTOS -----
const ratingArea = document.getElementById("rating-area");
const noPhotosMessage = document.getElementById("no-photos-message");
const photoRatingCard = document.getElementById("photo-rating-card");
const ratingPhoto = document.getElementById("rating-photo");
const ratingPhotoInfo = document.getElementById("rating-photo-info");
const ratingMessage = document.getElementById("rating-message");

let currentPhotoForExpert = null;

document.getElementById("start-rating-button").addEventListener("click", () => {
  const expertId = document.getElementById("expert-id").value.trim();
  if (!expertId) {
    alert("Introduce tu código de experto/a.");
    return;
  }

  ratingArea.classList.remove("hidden");
  loadNextPhotoForExpert();
});


function formatTaskId(taskId) {
  switch (taskId) {
    case "MT1_AUTOEXP": return "Microtarea 1 (autoexpresiva)";
    case "MT2_ESCOLAR": return "Microtarea 2 (reinterpretación escolar)";
    case "MT3_TRANSFORM": return "Microtarea 3 (transformación)";
    default: return taskId || "—";
  }
}

async function loadNextPhotoForExpert() {
  const expertId = document.getElementById("expert-id").value.trim();
  if (!expertId) return;

  try {
    const photosSnap = await getDocs(photosCol);
    const photos = photosSnap.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }));

    const ratingsSnap = await getDocs(
      query(ratingsCol, where("expertId", "==", expertId))
    );

    const ratedPhotoIds = new Set(
      ratingsSnap.docs.map(d => d.data().photoId)
    );

    const pending = photos.filter(p => !ratedPhotoIds.has(p.id));

    if (pending.length === 0) {
      currentPhotoForExpert = null;
      photoRatingCard.classList.add("hidden");
      noPhotosMessage.classList.remove("hidden");
      ratingMessage.textContent = "";
      return;
    }

    noPhotosMessage.classList.add("hidden");
    photoRatingCard.classList.remove("hidden");

    const randomIndex = Math.floor(Math.random() * pending.length);
    const photo = pending[randomIndex];
    currentPhotoForExpert = photo;

    ratingPhoto.src = photo.dataUrl || photo.imageDataUrl || "";

    const aiText1 = photo.aiScore != null ? ` | AI_PUNTF: ${photo.aiScore}` : "";
    const aiText2 = photo.localAdvanced?.localAdvancedScore != null
      ? ` | IA_local: ${photo.localAdvanced.localAdvancedScore}`
      : "";
    const aiText3 = photo.deepAI?.deepScore != null
      ? ` | IA_profunda: ${photo.deepAI.deepScore}`
      : "";

    ratingPhotoInfo.textContent =
      `ID: ${photo.id} | Tarea: ${formatTaskId(photo.taskId)} | Edad: ${photo.age} | Sexo: ${photo.gender} | ` +
      `Estudios: ${photo.studies} | Bachillerato: ${photo.bachType || "N/A"}` +
      (photo.text280 ? ` | Texto: ${photo.text280}` : "") +
      aiText1 + aiText2 + aiText3;

    ratingControls.forEach(rc => {
      rc.input.value = 5;
      rc.valueSpan.textContent = "5";
    });
    updatePuntf();
    ratingMessage.textContent = "";
  } catch (err) {
    console.error(err);
    noPhotosMessage.textContent = "Error cargando fotografías.";
    noPhotosMessage.classList.remove("hidden");
    photoRatingCard.classList.add("hidden");
  }
}

// Guardar valoración de experto
document.getElementById("save-rating-button").addEventListener("click", async () => {
  if (!currentPhotoForExpert) return;

  const expertId = document.getElementById("expert-id").value.trim();
  if (!expertId) {
    alert("Introduce tu código de experto/a.");
    return;
  }

  if (!ratingControls.length) {
    alert("No hay ítems de valoración configurados.");
    return;
  }

  const ratingsMap = {};
  let sum = 0;
  ratingControls.forEach(rc => {
    const v = Number(rc.input.value);
    sum += v;
    ratingsMap[rc.config.id] = v;
  });
  const puntf = sum / ratingControls.length;

  try {
    await addDoc(ratingsCol, {
      photoId: currentPhotoForExpert.id,
      expertId,
      ratings: ratingsMap,
      puntf,
      createdAt: new Date().toISOString()
    });

    ratingMessage.textContent = "Valoración guardada.";
    ratingMessage.className = "message success";

    loadNextPhotoForExpert();
  } catch (err) {
    console.error(err);
    ratingMessage.textContent = "Error al guardar la valoración.";
    ratingMessage.className = "message error";
  }
});

// Omitir foto
document.getElementById("skip-photo-button").addEventListener("click", () => {
  loadNextPhotoForExpert();
});

// ----- PANEL ADMIN / RESUMEN + EXPORTAR CSV + VISUALIZACIÓN -----
async function updateAdminSummary() {
  try {
    const photosSnap = await getDocs(photosCol);
    const ratingsSnap = await getDocs(ratingsCol);

    const summaryList = document.getElementById("admin-summary-list");
    summaryList.innerHTML = "";

    const li1 = document.createElement("li");
    li1.textContent = `Número de fotografías almacenadas: ${photosSnap.size}`;
    summaryList.appendChild(li1);

    const li2 = document.createElement("li");
    li2.textContent = `Número total de valoraciones registradas: ${ratingsSnap.size}`;
    summaryList.appendChild(li2);

    const expertIds = Array.from(
      new Set(ratingsSnap.docs.map(d => d.data().expertId))
    );
    const li3 = document.createElement("li");
    li3.textContent = `Número de expertos/as activos: ${expertIds.length}`;
    summaryList.appendChild(li3);

    renderAgeChart(photosSnap);
  } catch (err) {
    console.error(err);
  }
}

function renderAgeChart(photosSnap) {
  if (!ageChart) return;

  const ageCounts = {};
  photosSnap.docs.forEach(docSnap => {
    const p = docSnap.data();
    if (typeof p.age === "number") {
      ageCounts[p.age] = (ageCounts[p.age] || 0) + 1;
    }
  });

  ageChart.innerHTML = "";
  if (ageChartNote) ageChartNote.textContent = "";

  const ages = Object.keys(ageCounts).map(a => Number(a)).sort((a, b) => a - b);
  if (ages.length === 0) {
    if (ageChartNote) {
      ageChartNote.textContent = "Todavía no hay datos suficientes para mostrar la distribución por edad.";
    }
    return;
  }

  const maxCount = Math.max(...ages.map(a => ageCounts[a]));
  ages.forEach(age => {
    const row = document.createElement("div");
    row.className = "chart-row";

    const label = document.createElement("span");
    label.className = "chart-label";
    label.textContent = `${age} años`;

    const outer = document.createElement("div");
    outer.className = "chart-bar-outer";

    const inner = document.createElement("div");
    inner.className = "chart-bar-inner";
    const widthPercent = (ageCounts[age] / maxCount) * 100;
    inner.style.width = `${widthPercent}%`;

    outer.appendChild(inner);
    row.appendChild(label);
    row.appendChild(outer);
    ageChart.appendChild(row);
  });

  if (ageChartNote) {
    ageChartNote.textContent = "Cada barra representa el número relativo de fotografías por edad.";
  }
}

// Listado de todas las fotografías y valoraciones
async function loadAllPhotosWithRatings() {
  if (!photosList) return;
  photosList.textContent = "Cargando fotografías y valoraciones...";

  try {
    const [photosSnap, ratingsSnap] = await Promise.all([
      getDocs(photosCol),
      getDocs(ratingsCol)
    ]);

    if (photosSnap.empty) {
      photosList.textContent = "No hay fotografías almacenadas.";
      return;
    }

    const ratingsByPhoto = {};
    ratingsSnap.docs.forEach(docSnap => {
      const r = docSnap.data();
      const photoId = r.photoId;
      if (!photoId) return;
      if (!ratingsByPhoto[photoId]) ratingsByPhoto[photoId] = [];
      ratingsByPhoto[photoId].push({
        id: docSnap.id,
        ...r
      });
    });

    const items = globalConfig.ratingItems && globalConfig.ratingItems.length
      ? globalConfig.ratingItems
      : DEFAULT_RATING_ITEMS;

    photosList.innerHTML = "";
    photosSnap.docs.forEach(docSnap => {
      const p = docSnap.data();
      const photoId = docSnap.id;

      const card = document.createElement("div");
      card.className = "photo-card";

      const img = document.createElement("img");
      img.src = p.dataUrl;
      img.alt = "Fotografía " + photoId;

      const ai1 = p.aiScore != null ? `AI_PUNTF: ${p.aiScore}` : "";
      const ai2 = p.localAdvanced?.localAdvancedScore != null
        ? `IA_local: ${p.localAdvanced.localAdvancedScore}`
        : "";
      const ai3 = p.deepAI?.deepScore != null
        ? `IA_profunda: ${p.deepAI.deepScore}`
        : "";

      const meta = document.createElement("p");
      meta.innerHTML = `
        <strong>ID:</strong> ${photoId}<br>
        Edad: ${p.age ?? ""} | Sexo: ${p.gender || ""}<br>
        Estudios: ${p.studies || ""} | Bachillerato: ${p.bachType || ""}<br>
        Vocación: ${p.vocation || ""}<br>
        Centro: ${p.center || ""}<br>
        ${ai1} ${ai2} ${ai3}
      `;

      card.appendChild(img);
      card.appendChild(meta);

      const rList = ratingsByPhoto[photoId] || [];
      const ratingsInfo = document.createElement("div");
      ratingsInfo.className = "photo-ratings";

      if (rList.length === 0) {
        ratingsInfo.textContent = "Sin valoraciones aún.";
      } else {
        const avg = rList.reduce(
          (sum, r) => sum + (typeof r.puntf === "number" ? r.puntf : 0),
          0
        ) / rList.length;

        const resumen = document.createElement("p");
        resumen.textContent = `Valoraciones: ${rList.length} | PUNTF media: ${avg.toFixed(2)}`;
        ratingsInfo.appendChild(resumen);

        const table = document.createElement("table");
        const thead = document.createElement("thead");

        let headerHtml = "<tr><th>Experto/a</th>";
        items.forEach(item => {
          headerHtml += `<th>${item.label}</th>`;
        });
        headerHtml += "<th>PUNTF</th></tr>";
        thead.innerHTML = headerHtml;
        table.appendChild(thead);

        const tbody = document.createElement("tbody");
        rList.forEach(r => {
          const tr = document.createElement("tr");

          const ratingsMap = r.ratings || {};
          let rowHtml = `<td>${r.expertId || ""}</td>`;
          items.forEach((item, idx) => {
            let val = ratingsMap[item.id];
            // Compatibilidad con datos antiguos tipo sub1, sub2...
            if (val === undefined && r[`sub${idx + 1}`] !== undefined) {
              val = r[`sub${idx + 1}`];
            }
            rowHtml += `<td>${val ?? ""}</td>`;
          });
          rowHtml += `<td>${typeof r.puntf === "number" ? r.puntf.toFixed(2) : ""}</td>`;

          tr.innerHTML = rowHtml;
          tbody.appendChild(tr);
        });

        table.appendChild(tbody);
        ratingsInfo.appendChild(table);
      }

      card.appendChild(ratingsInfo);
      photosList.appendChild(card);
    });
  } catch (err) {
    console.error(err);
    photosList.textContent = "Error cargando fotografías y valoraciones.";
  }
}

if (loadPhotosButton) {
  loadPhotosButton.addEventListener("click", loadAllPhotosWithRatings);
}

// Exportar CSV (formato largo): 1 fila por (foto × experto), incluyendo CBQD + demografía vinculada.
document.getElementById("export-csv-button").addEventListener("click", async () => {
  try {
    const [photosSnap, ratingsSnap, sessionsSnap] = await Promise.all([
      getDocs(photosCol),
      getDocs(ratingsCol),
      getDocs(sessionsCol)
    ]);

    if (photosSnap.empty) {
      alert("No hay fotografías almacenadas.");
      return;
    }

    // Indexación en memoria
    const photos = {};
    photosSnap.docs.forEach(d => { photos[d.id] = d.data(); });

    const sessions = {};
    sessionsSnap.docs.forEach(d => { sessions[d.id] = d.data(); });

    const ratingItems = (globalConfig.ratingItems && globalConfig.ratingItems.length)
      ? globalConfig.ratingItems
      : DEFAULT_RATING_ITEMS;

    // Detectar universo de ítems CBQD y dominios (para exportaciones robustas aunque cambie la config)
    const cbqdItemIds = new Set();
    const cbqdDomains = new Set();

    Object.values(sessions).forEach(s => {
      const c = s.cbqd || {};
      const items = c.itemsUsed || c.items || [];
      items.forEach(it => {
        if (it?.id) cbqdItemIds.add(it.id);
        const dom = (it?.domain || "GENERAL").trim() || "GENERAL";
        cbqdDomains.add(dom);
      });
      (c.responses || []).forEach(r => {
        if (r?.id) cbqdItemIds.add(r.id);
        const dom = (r?.domain || "GENERAL").trim() || "GENERAL";
        cbqdDomains.add(dom);
      });
    });

    // Si todavía no hay sesiones (datos antiguos), usa la config actual como fallback.
    if (cbqdItemIds.size === 0) {
      (globalConfig.cbqdItems || []).forEach(it => {
        if (it?.id) cbqdItemIds.add(it.id);
        const dom = (it?.domain || "GENERAL").trim() || "GENERAL";
        cbqdDomains.add(dom);
      });
    }

    const cbqdItemList = Array.from(cbqdItemIds).sort();
    const cbqdDomainList = Array.from(cbqdDomains).sort();

    const header = [
      // Identificación y estructura
      "fotoId",
      "taskId",
      "participantId",
      "sessionId",
      "submittedAt",
      "createdAt",
      "text280",

      // Demografía
      "sexo",
      "edad",
      "estudios",
      "tipoBach",
      "vocacion",
      "estudios_padre",
      "estudios_madre",
      "repite_curso",
      "suspensos",
      "num_ordenadores_casa",
      "ordenador_habitacion",
      "frecuencia_uso_ordenador",
      "horas_diarias_ordenador",
      "centro_educativo",

      // CBQD
      "cbqd_on",
      "cbqd_ver",
      "cbqd_total",
      "cbqd_answered",
      "cbqd_missing"
    ];

    cbqdDomainList.forEach(dom => header.push(`cbqd_dom_${dom}`));
    cbqdItemList.forEach(id => header.push(`cbqd_item_${id}`));

    // IA
    header.push(
      "ai_brightness",
      "ai_contrast",
      "ai_colorfulness",
      "ai_edgeDensity",
      "ai_score",
      "local_thirds",
      "local_horizon",
      "local_golden",
      "local_salience",
      "local_score",
      "deep_score",
      "deep_explanation",

      // Valoración
      "expertoId"
    );

    ratingItems.forEach(item => header.push(item.label));
    header.push("puntf");

    const rows = [header];

    const ratingsArr = ratingsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    function pickDemographics(p, s) {
      // Preferimos el snapshot de sesión; si no existe, usamos lo que haya en la foto.
      const d = (s && s.demographics) ? s.demographics : (p || {});
      return {
        age: d.age ?? p?.age ?? "",
        gender: d.gender || p?.gender || "",
        studies: d.studies || p?.studies || "",
        bachType: d.bachType || p?.bachType || "",
        vocation: d.vocation || p?.vocation || "",
        studiesFather: d.studiesFather || p?.studiesFather || "",
        studiesMother: d.studiesMother || p?.studiesMother || "",
        rep: d.rep || p?.rep || "",
        fail: d.fail || p?.fail || "",
        pcsHome: d.pcsHome ?? p?.pcsHome ?? "",
        pcRoom: d.pcRoom || p?.pcRoom || "",
        pcFrequency: d.pcFrequency || p?.pcFrequency || "",
        pcHours: d.pcHours ?? p?.pcHours ?? "",
        center: d.center || p?.center || ""
      };
    }

    function pickCbqd(p, s) {
      const c = (s && s.cbqd) ? s.cbqd : null;
      if (c && typeof c === "object") {
        const enabled = !!(c.enabled);
        const version = c.instrumentVersion || "";

        // Compatibilidad: algunos datos guardan scores en c.scores
        let total = null;
        let subscales = {};
        let answered = 0;
        let missing = 0;
        let responses = c.responses || [];
        if (c.scores && typeof c.scores === "object") {
          total = c.scores.total ?? null;
          subscales = c.scores.subscales || {};
          answered = c.scores.answered ?? 0;
          missing = c.scores.missing ?? 0;
        } else {
          // si no hay scores, recomputamos
          const sc = computeCbqdScores(responses);
          total = sc.total;
          subscales = sc.subscales;
          answered = sc.answered;
          missing = sc.missing;
        }

        const map = {};
        responses.forEach(r => {
          if (r?.id) map[r.id] = Number.isFinite(r.value) ? r.value : "";
        });
        return { enabled, version, total, subscales, answered, missing, map };
      }

      // Fallback (fotos antiguas)
      const enabled = !!p?.cbqdEnabled;
      const version = p?.cbqdVersion || "";
      const total = (p?.cbqdTotal ?? "");
      const subscales = p?.cbqdSubscales || {};
      const map = {};
      const resp = Array.isArray(p?.cbqdResponses) ? p.cbqdResponses : [];
      resp.forEach(r => {
        if (r?.id) map[r.id] = Number.isFinite(r.value) ? r.value : "";
      });
      const sc = resp.length ? computeCbqdScores(resp) : { answered: 0, missing: 0 };
      return { enabled, version, total, subscales, answered: sc.answered, missing: sc.missing, map };
    }

    function photoRowBase(photoId, p, s, rOrNull) {
      const f = p.aiFeatures || {};
      const adv = p.localAdvanced || {};
      const deep = p.deepAI || {};
      const dem = pickDemographics(p, s);
      const cbqd = pickCbqd(p, s);

      const base = [
        photoId,
        p.taskId || "",
        p.participantId || s?.participantId || "",
        p.sessionId || "",
        p.submittedAt || s?.submittedAt || "",
        p.createdAt || "",
        p.text280 || "",

        dem.gender,
        dem.age,
        dem.studies,
        dem.bachType,
        dem.vocation,
        dem.studiesFather,
        dem.studiesMother,
        dem.rep,
        dem.fail,
        dem.pcsHome,
        dem.pcRoom,
        dem.pcFrequency,
        dem.pcHours,
        dem.center,

        cbqd.enabled ? "1" : "0",
        cbqd.version,
        cbqd.total ?? "",
        cbqd.answered ?? "",
        cbqd.missing ?? ""
      ];

      // Subescalas fijas por dominio
      cbqdDomainList.forEach(dom => base.push(cbqd.subscales?.[dom] ?? ""));
      // Ítems
      cbqdItemList.forEach(id => base.push(cbqd.map?.[id] ?? ""));

      base.push(
        f.brightness ?? "",
        f.contrast ?? "",
        f.colorfulness ?? "",
        f.edgeDensity ?? "",
        p.aiScore ?? "",
        adv.thirdsScore ?? "",
        adv.horizonScore ?? "",
        adv.goldenScore ?? "",
        adv.salienceScore ?? "",
        adv.localAdvancedScore ?? "",
        deep.deepScore ?? "",
        deep.deepExplanation ?? "",
        rOrNull?.expertId || ""
      );

      // Ratings
      const ratingsMap = rOrNull?.ratings || {};
      ratingItems.forEach((item, idx) => {
        let val = ratingsMap[item.id];
        if (val === undefined && rOrNull && rOrNull[`sub${idx + 1}`] !== undefined) {
          val = rOrNull[`sub${idx + 1}`];
        }
        base.push(val ?? "");
      });

      base.push(rOrNull && typeof rOrNull.puntf === "number" ? rOrNull.puntf.toFixed(2) : "");
      return base;
    }

    if (ratingsArr.length === 0) {
      // Sin valoraciones: una fila por foto
      Object.entries(photos).forEach(([photoId, p]) => {
        const s = p.sessionId ? sessions[p.sessionId] : null;
        rows.push(photoRowBase(photoId, p, s, null));
      });
    } else {
      // Con valoraciones: una fila por valoración
      ratingsArr.forEach(r => {
        const p = photos[r.photoId];
        if (!p) return;
        const s = p.sessionId ? sessions[p.sessionId] : null;
        rows.push(photoRowBase(r.photoId, p, s, r));
      });
    }

    const csvContent = rows.map(row =>
      row.map(value => {
        const str = String(value ?? "");
        if (str.includes(";") || str.includes("\"") || str.includes("\n") || str.includes("\r")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(";")
    ).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const now = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const a = document.createElement("a");
    a.href = url;
    a.download = `creatividad_digital_full_${now}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert("CSV generado y descargado.");
  } catch (err) {
    console.error(err);
    alert("Ha ocurrido un error al generar el CSV.");
  }
});

