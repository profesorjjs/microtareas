
/* ========= Datos ========= */
const CBQD_ITEMS = [

  { n: 1, t: "¿Has compartido imágenes o fotos a través de tus redes sociales (Facebook, Instagram, etcétera)?" },
  { n: 2, t: "¿Has hecho un vídeo sobre algo personal y lo has publicado en YouTube?" },
  { n: 3, t: "¿Has hecho publicaciones en tu blog sobre tus amigos y familiares?" },
  { n: 4, t: "¿Has hecho publicaciones en tu blog sobre algún pasatiempo o actividad de ocio no relacionada con la escuela?" },
  { n: 5, t: "¿Has hecho presentaciones usando PowerPoint, Prezi, KeyNote u otros?" },
  { n: 6, t: "¿Has hecho vídeos o películas usando alguna aplicación de vídeo?" },
  { n: 7, t: "¿Has publicado contenido creativo en las redes sociales?" },
  { n: 8, t: "¿Has hecho un vídeo musical sobre ti o tu pandilla de amigos?" },
  { n: 9, t: "¿Has contribuido en una página web (fansite) sobre tus programas de televisión o videojuegos favoritos?" },
  { n: 10, t: "¿Has creado arte de fanáticos (fanart)?" },
  { n: 11, t: "¿Has creado o desarrollado una aplicación para un dispositivo móvil?" },
  { n: 12, t: "¿Has creado contenido nuevo para videojuegos?" },
  { n: 13, t: "¿Has sido disyóquey para una emisora de radio o evento local?" },
  { n: 14, t: "¿Has vendido algo que hayas hecho en un sitio web?" },
  { n: 15, t: "¿Has ganado un premio por realizar una fotografía digital?" },
  { n: 16, t: "¿Has desarrollado un blog o sitio web para una clase o proyecto escolar?" },
  { n: 17, t: "¿Has participado en un club relacionado con la tecnología después de la escuela?" },
  { n: 18, t: "¿Has creado algo usando una impresora en 3D?" },
  { n: 19, t: "¿Has iniciado un grupo en redes sociales para promocionar una actividad u organización?" },
  { n: 20, t: "¿Has creado un proyecto multimedia para una clase?" },
  { n: 21, t: "¿Has creado un podcast?" },
  { n: 22, t: "¿Has hecho un vídeo para un proyecto de clase?" },
  { n: 23, t: "¿Has enviado algo que escribiste a un concurso online, digital o de radio?" },
  { n: 24, t: "¿Has comenzado un nuevo blog?" },
  { n: 25, t: "¿Se te ha pedido que contribuyas en un blog o en alguna de sus secciones?" },
  { n: 26, t: "¿Has hecho animación digital usando herramientas web?" },
  { n: 27, t: "¿Has hecho un mashup de música y lo has publicado online?" },
  { n: 28, t: "¿Has enviado tu arte digital a una comunidad creativa online?" },
  { n: 29, t: "¿Has ganado un concurso de arte digital?" },
  { n: 30, t: "¿Has recibido clases de arte digital (Photoshop, animación 3D, etc.)?" },
  { n: 31, t: "¿Has ganado dinero por publicidad en redes sociales o YouTube?" },
  { n: 32, t: "¿Has recaudado dinero para un proyecto usando crowdfunding?" },
  { n: 33, t: "¿Has creado tu propio blog de vídeos o webshow?" }

];

const LIKERT = [
  { v: 0, t: "Nunca" },
  { v: 1, t: "Rara vez" },
  { v: 2, t: "A veces" },
  { v: 3, t: "A menudo" },
  { v: 4, t: "Muy a menudo" },
];

const DB_KEY = "cbqd_platform_v2";

/* ========= Utilidades ========= */
function nowISO() {
  return new Date().toISOString();
}

function showMsg(el, text, kind="info") {
  el.textContent = text;
  el.classList.add("show");
  el.style.borderColor = kind === "error" ? "rgba(180,0,0,.25)" : "rgba(48,63,159,.18)";
  el.style.background = kind === "error" ? "#fff5f5" : "#f7f7ff";
}

function hideMsg(el) {
  el.classList.remove("show");
  el.textContent = "";
}

function downloadText(filename, text, mime="text/plain") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function safeId(s) {
  return (s || "").trim().toUpperCase();
}

function clampInt(x, min, max) {
  const n = Number.parseInt(x, 10);
  if (Number.isNaN(n)) return null;
  return Math.max(min, Math.min(max, n));
}

/* ========= Persistencia ========= */
function loadDB() {
  const raw = localStorage.getItem(DB_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function saveDB(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function initDB() {
  let db = loadDB();
  if (db) return db;

  db = {
    users: {
      "ADMIN": { role: "admin", password: "admin", active: true, createdAt: nowISO() },
      "A001": { role: "student", password: "alumno", active: true, createdAt: nowISO() },
      "E001": { role: "expert", password: "experto", active: true, createdAt: nowISO() },
    },
    submissions: {
      // studentId: { cbqd: {answers:[], submittedAt}, micro: {photos:[{dataUrl, desc, submittedAt}...] , submittedAt}, }
    },
    ratings: {
      // studentId: { expertId: { byMicro: [{creativity, technique, overall, comment, ratedAt}...], ratedAt } }
    },
    sessions: {} // no persist, but keeps schema
  };
  saveDB(db);
  return db;
}

/* ========= Estado de sesión ========= */
let DB = initDB();
let SESSION = {
  role: null,
  userId: null
};

/* ========= Selectores ========= */
const els = {
  loginSection: document.getElementById("login-section"),
  role: document.getElementById("role"),
  userId: document.getElementById("userId"),
  password: document.getElementById("password"),
  loginBtn: document.getElementById("login-btn"),
  loginMsg: document.getElementById("login-msg"),

  studentCbqdSection: document.getElementById("student-cbqd-section"),
  cbqdForm: document.getElementById("cbqd-form"),
  cbqdSubmit: document.getElementById("cbqd-submit"),
  cbqdMsg: document.getElementById("cbqd-msg"),
  logoutStudent1: document.getElementById("logout-student-1"),

  studentMicroSection: document.getElementById("student-micro-section"),
  microSteps: document.getElementById("micro-steps"),
  microSubmit: document.getElementById("micro-submit"),
  microMsg: document.getElementById("micro-msg"),
  logoutStudent2: document.getElementById("logout-student-2"),

  expertSection: document.getElementById("expert-section"),
  expertTarget: document.getElementById("expert-target"),
  expertContent: document.getElementById("expert-content"),
  expertRefresh: document.getElementById("expert-refresh"),
  expertMsg: document.getElementById("expert-msg"),
  logoutExpert: document.getElementById("logout-expert"),

  adminSection: document.getElementById("admin-section"),
  logoutAdmin: document.getElementById("logout-admin"),
  tabs: Array.from(document.querySelectorAll(".tab")),
  tabUsers: document.getElementById("tab-users"),
  tabResults: document.getElementById("tab-results"),
  tabExport: document.getElementById("tab-export"),

  newRole: document.getElementById("new-role"),
  newId: document.getElementById("new-id"),
  newPass: document.getElementById("new-pass"),
  createUser: document.getElementById("create-user"),
  adminUserMsg: document.getElementById("admin-user-msg"),
  usersTable: document.getElementById("users-table"),

  resultsView: document.getElementById("results-view"),

  exportJson: document.getElementById("export-json"),
  exportCsv: document.getElementById("export-csv"),
  exportMsg: document.getElementById("export-msg"),
};

/* ========= UI helpers ========= */
function hideAll() {
  els.loginSection.classList.add("hidden");
  els.studentCbqdSection.classList.add("hidden");
  els.studentMicroSection.classList.add("hidden");
  els.expertSection.classList.add("hidden");
  els.adminSection.classList.add("hidden");
}

function goTo(sectionEl) {
  hideAll();
  sectionEl.classList.remove("hidden");
}

function logout() {
  SESSION = { role: null, userId: null };
  els.userId.value = "";
  els.password.value = "";
  hideMsg(els.loginMsg);
  goTo(els.loginSection);
}

function getUser(userId) {
  return DB.users[userId] || null;
}

function ensureSubmission(studentId) {
  if (!DB.submissions[studentId]) DB.submissions[studentId] = {};
  return DB.submissions[studentId];
}

function isStudentComplete(studentId) {
  const sub = DB.submissions[studentId] || {};
  const cbqdDone = !!(sub.cbqd && Array.isArray(sub.cbqd.answers) && sub.cbqd.answers.length === CBQD_ITEMS.length);
  const microDone = !!(sub.micro && Array.isArray(sub.micro.photos) && sub.micro.photos.length === 3 && sub.micro.photos.every(p => !!p.dataUrl));
  return cbqdDone && microDone;
}

/* ========= Login ========= */
function login() {
  hideMsg(els.loginMsg);

  const role = els.role.value;
  const userId = safeId(els.userId.value);
  const password = (els.password.value || "").trim();

  if (!userId || !password) {
    showMsg(els.loginMsg, "Falta el ID o la clave.", "error");
    return;
  }

  const user = getUser(userId);
  if (!user || !user.active) {
    showMsg(els.loginMsg, "Usuario inexistente o desactivado.", "error");
    return;
  }

  if (user.role !== role) {
    showMsg(els.loginMsg, "El perfil seleccionado no coincide con el usuario.", "error");
    return;
  }

  if (user.password !== password) {
    showMsg(els.loginMsg, "Clave incorrecta.", "error");
    return;
  }

  SESSION = { role, userId };
  if (role === "student") {
    enterStudent();
  } else if (role === "expert") {
    enterExpert();
  } else {
    enterAdmin();
  }
}

/* ========= CBQD UI ========= */
function renderCBQDForm(existingAnswers) {
  els.cbqdForm.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "micro";

  CBQD_ITEMS.forEach((item, idx) => {
    const card = document.createElement("div");
    card.className = "micro-card";
    const h = document.createElement("h3");
    h.textContent = `Ítem ${item.n}`;
    const p = document.createElement("p");
    p.textContent = item.t;

    const sel = document.createElement("select");
    sel.dataset.idx = String(idx);
    const opt0 = document.createElement("option");
    opt0.value = "";
    opt0.textContent = "Selecciona una opción…";
    sel.appendChild(opt0);

    LIKERT.forEach(o => {
      const opt = document.createElement("option");
      opt.value = String(o.v);
      opt.textContent = o.t;
      sel.appendChild(opt);
    });

    if (existingAnswers && existingAnswers[idx] !== undefined && existingAnswers[idx] !== null) {
      sel.value = String(existingAnswers[idx]);
    }

    card.appendChild(h);
    card.appendChild(p);
    card.appendChild(sel);
    wrap.appendChild(card);
  });

  els.cbqdForm.appendChild(wrap);
}

function collectCBQDAnswers() {
  const selects = Array.from(els.cbqdForm.querySelectorAll("select[data-idx]"));
  const answers = new Array(CBQD_ITEMS.length).fill(null);
  for (const s of selects) {
    const idx = Number.parseInt(s.dataset.idx, 10);
    const v = s.value;
    if (v === "") return null;
    answers[idx] = clampInt(v, 0, 4);
  }
  return answers;
}

/* ========= Microexperimentos UI ========= */
function renderMicro(studentId) {
  els.microSteps.innerHTML = "";

  const sub = ensureSubmission(studentId);
  const existing = (sub.micro && sub.micro.photos) ? sub.micro.photos : [];

  for (let i = 0; i < 3; i++) {
    const card = document.createElement("div");
    card.className = "micro-card";
    const h = document.createElement("h3");
    h.textContent = `Microexperimento ${i+1}`;
    const p = document.createElement("p");
    p.textContent = "Sube una fotografía (JPG/PNG/WebP) que represente tu respuesta a la tarea.";

    const file = document.createElement("input");
    file.type = "file";
    file.accept = "image/*";
    file.dataset.micro = String(i);

    const ta = document.createElement("textarea");
    ta.placeholder = "Descripción breve (opcional)";
    ta.dataset.desc = String(i);

    const preview = document.createElement("div");
    preview.className = "preview hidden";
    const img = document.createElement("img");
    preview.appendChild(img);

    // restore
    if (existing[i] && existing[i].dataUrl) {
      img.src = existing[i].dataUrl;
      preview.classList.remove("hidden");
      ta.value = existing[i].desc || "";
    }

    file.addEventListener("change", async (ev) => {
      const f = ev.target.files && ev.target.files[0];
      if (!f) return;
      if (!f.type.startsWith("image/")) {
        showMsg(els.microMsg, "Ese archivo no parece una imagen.", "error");
        return;
      }
      const dataUrl = await readFileAsDataURL(f);
      img.src = dataUrl;
      preview.classList.remove("hidden");

      // save draft immediately
      const s = ensureSubmission(studentId);
      if (!s.micro) s.micro = { photos: [] };
      if (!Array.isArray(s.micro.photos)) s.micro.photos = [];
      s.micro.photos[i] = {
        dataUrl,
        desc: ta.value || "",
        submittedAt: nowISO()
      };
      saveDB(DB);
      showMsg(els.microMsg, "Imagen guardada (borrador).", "info");
    });

    ta.addEventListener("input", () => {
      const s = ensureSubmission(studentId);
      if (!s.micro) s.micro = { photos: [] };
      if (!Array.isArray(s.micro.photos)) s.micro.photos = [];
      if (!s.micro.photos[i]) s.micro.photos[i] = { dataUrl: null, desc: "", submittedAt: null };
      s.micro.photos[i].desc = ta.value || "";
      saveDB(DB);
    });

    card.appendChild(h);
    card.appendChild(p);
    card.appendChild(file);
    card.appendChild(ta);
    card.appendChild(preview);
    els.microSteps.appendChild(card);
  }
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ========= Entradas por rol ========= */
function enterStudent() {
  const studentId = SESSION.userId;
  const sub = ensureSubmission(studentId);

  // Si ya completó todo, lo informamos y bloqueamos edición
  if (isStudentComplete(studentId)) {
    goTo(els.studentMicroSection);
    els.microSubmit.disabled = true;
    renderMicro(studentId);
    showMsg(els.microMsg, "Tu envío ya está completo y registrado. Si necesitas corregir algo, contacta con administración.", "info");
    return;
  }

  // Si CBQD no está completo -> CBQD
  const cbqdDone = !!(sub.cbqd && Array.isArray(sub.cbqd.answers) && sub.cbqd.answers.length === CBQD_ITEMS.length);
  if (!cbqdDone) {
    goTo(els.studentCbqdSection);
    els.cbqdSubmit.disabled = false;
    renderCBQDForm(sub.cbqd ? sub.cbqd.answers : null);
    hideMsg(els.cbqdMsg);
    return;
  }

  // Si CBQD completo -> micro
  goTo(els.studentMicroSection);
  els.microSubmit.disabled = false;
  renderMicro(studentId);
  hideMsg(els.microMsg);
}

function enterExpert() {
  goTo(els.expertSection);
  hideMsg(els.expertMsg);
  renderExpertTargets();
}

function enterAdmin() {
  goTo(els.adminSection);
  hideMsg(els.exportMsg);
  hideMsg(els.adminUserMsg);
  setActiveTab("users");
  renderUsersTable();
  renderResultsView();
}

/* ========= Acciones alumno ========= */
function submitCBQD() {
  hideMsg(els.cbqdMsg);
  const studentId = SESSION.userId;
  const answers = collectCBQDAnswers();
  if (!answers) {
    showMsg(els.cbqdMsg, "Falta alguna respuesta: revisa el formulario.", "error");
    return;
  }

  const sub = ensureSubmission(studentId);
  sub.cbqd = { answers, submittedAt: nowISO() };
  saveDB(DB);

  showMsg(els.cbqdMsg, "CBQD guardado. Ahora pasas a los microexperimentos 🙂");
  // avanzar
  enterStudent();
}

function submitMicro() {
  hideMsg(els.microMsg);
  const studentId = SESSION.userId;
  const sub = ensureSubmission(studentId);

  const cbqdDone = !!(sub.cbqd && Array.isArray(sub.cbqd.answers) && sub.cbqd.answers.length === CBQD_ITEMS.length);
  if (!cbqdDone) {
    showMsg(els.microMsg, "Antes debes completar el CBQD.", "error");
    enterStudent();
    return;
  }

  const photos = (sub.micro && Array.isArray(sub.micro.photos)) ? sub.micro.photos : [];
  const ok = photos.length === 3 && photos.every(p => p && p.dataUrl);
  if (!ok) {
    showMsg(els.microMsg, "Te falta alguna fotografía. Necesitas completar los 3 microexperimentos.", "error");
    return;
  }

  sub.micro.submittedAt = nowISO();
  saveDB(DB);

  els.microSubmit.disabled = true;
  showMsg(els.microMsg, "Envío completado y registrado. ¡Gracias!", "info");
}

/* ========= Experto/a ========= */
function renderExpertTargets() {
  const options = [];
  for (const [studentId, sub] of Object.entries(DB.submissions)) {
    // Solo si hay micro completo (para valorar fotos)
    const microDone = !!(sub.micro && Array.isArray(sub.micro.photos) && sub.micro.photos.length === 3 && sub.micro.photos.every(p => !!p.dataUrl));
    if (!microDone) continue;
    options.push(studentId);
  }

  els.expertTarget.innerHTML = "";
  if (options.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "No hay envíos con fotos todavía";
    els.expertTarget.appendChild(opt);
    els.expertContent.innerHTML = "";
    return;
  }

  for (const id of options.sort()) {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = id;
    els.expertTarget.appendChild(opt);
  }

  els.expertTarget.onchange = () => renderExpertContent(els.expertTarget.value);
  renderExpertContent(els.expertTarget.value);
}

function renderExpertContent(studentId) {
  hideMsg(els.expertMsg);
  els.expertContent.innerHTML = "";

  if (!studentId) return;

  const sub = DB.submissions[studentId];
  const photos = sub.micro.photos;

  const wrap = document.createElement("div");
  wrap.className = "micro";

  const existing = (DB.ratings[studentId] && DB.ratings[studentId][SESSION.userId]) ? DB.ratings[studentId][SESSION.userId] : null;
  const existingByMicro = existing ? existing.byMicro : [];

  for (let i = 0; i < 3; i++) {
    const card = document.createElement("div");
    card.className = "micro-card";

    const h = document.createElement("h3");
    h.textContent = `Microexperimento ${i+1}`;

    const imgWrap = document.createElement("div");
    imgWrap.className = "preview";
    const img = document.createElement("img");
    img.src = photos[i].dataUrl;
    img.alt = `Foto micro ${i+1}`;
    imgWrap.appendChild(img);

    const desc = document.createElement("p");
    desc.className = "muted";
    desc.textContent = photos[i].desc ? `Descripción del alumno/a: ${photos[i].desc}` : "Sin descripción.";

    const grid = document.createElement("div");
    grid.className = "grid-3";

    const creativity = ratingSelect("Creatividad", i, "creativity", existingByMicro[i]?.creativity);
    const technique = ratingSelect("Calidad técnica", i, "technique", existingByMicro[i]?.technique);
    const overall = ratingSelect("Valoración global", i, "overall", existingByMicro[i]?.overall);

    grid.appendChild(creativity);
    grid.appendChild(technique);
    grid.appendChild(overall);

    const commentLabel = document.createElement("label");
    commentLabel.textContent = "Comentario (opcional)";
    const comment = document.createElement("textarea");
    comment.dataset.micro = String(i);
    comment.dataset.field = "comment";
    comment.value = existingByMicro[i]?.comment || "";

    card.appendChild(h);
    card.appendChild(imgWrap);
    card.appendChild(desc);
    card.appendChild(grid);
    card.appendChild(commentLabel);
    card.appendChild(comment);
    wrap.appendChild(card);
  }

  const actions = document.createElement("div");
  actions.className = "actions";
  const btn = document.createElement("button");
  btn.className = "primary";
  btn.textContent = "Guardar valoración";
  btn.onclick = () => saveExpertRating(studentId);
  actions.appendChild(btn);

  els.expertContent.appendChild(wrap);
  els.expertContent.appendChild(actions);
}

function ratingSelect(labelText, microIdx, field, existingVal) {
  const div = document.createElement("div");
  const lab = document.createElement("label");
  lab.textContent = labelText;

  const sel = document.createElement("select");
  sel.dataset.micro = String(microIdx);
  sel.dataset.field = field;

  const o0 = document.createElement("option");
  o0.value = "";
  o0.textContent = "—";
  sel.appendChild(o0);

  for (let v = 1; v <= 5; v++) {
    const o = document.createElement("option");
    o.value = String(v);
    o.textContent = String(v);
    sel.appendChild(o);
  }

  if (existingVal) sel.value = String(existingVal);

  div.appendChild(lab);
  div.appendChild(sel);
  return div;
}

function saveExpertRating(studentId) {
  hideMsg(els.expertMsg);
  const container = els.expertContent;
  const selects = Array.from(container.querySelectorAll("select[data-field]"));
  const comments = Array.from(container.querySelectorAll("textarea[data-field='comment']"));

  const byMicro = new Array(3).fill(null).map(() => ({creativity:null, technique:null, overall:null, comment:""}));

  for (const s of selects) {
    const i = Number.parseInt(s.dataset.micro, 10);
    const field = s.dataset.field;
    const v = s.value === "" ? null : clampInt(s.value, 1, 5);
    byMicro[i][field] = v;
  }

  for (const c of comments) {
    const i = Number.parseInt(c.dataset.micro, 10);
    byMicro[i].comment = (c.value || "").trim();
  }

  // Validación: para guardar, exigimos que al menos "overall" esté informado en los 3.
  const ok = byMicro.every(m => m.overall !== null);
  if (!ok) {
    showMsg(els.expertMsg, "Para guardar, completa al menos la valoración global (1–5) en los 3 microexperimentos.", "error");
    return;
  }

  if (!DB.ratings[studentId]) DB.ratings[studentId] = {};
  DB.ratings[studentId][SESSION.userId] = {
    byMicro,
    ratedAt: nowISO()
  };
  saveDB(DB);

  showMsg(els.expertMsg, "Valoración guardada.", "info");
}

/* ========= Admin ========= */
function setActiveTab(tab) {
  for (const b of els.tabs) {
    const active = b.dataset.tab === tab;
    b.classList.toggle("active", active);
  }
  els.tabUsers.classList.toggle("hidden", tab !== "users");
  els.tabResults.classList.toggle("hidden", tab !== "results");
  els.tabExport.classList.toggle("hidden", tab !== "export");
}

function renderUsersTable() {
  els.usersTable.innerHTML = "";

  const table = document.createElement("table");
  table.className = "table";
  table.innerHTML = `
    <thead>
      <tr>
        <th>ID</th>
        <th>Rol</th>
        <th>Activo</th>
        <th>Progreso</th>
        <th>Clave</th>
        <th>Acciones</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector("tbody");

  const ids = Object.keys(DB.users).sort();
  for (const id of ids) {
    const u = DB.users[id];
    const tr = document.createElement("tr");

    const prog = u.role === "student" ? studentProgressBadge(id) : "—";

    tr.innerHTML = `
      <td><code>${id}</code></td>
      <td>${roleLabel(u.role)}</td>
      <td>${u.active ? '<span class="badge">Sí</span>' : '<span class="badge">No</span>'}</td>
      <td>${prog}</td>
      <td><input type="text" value="${escapeHtml(u.password)}" data-user="${id}" class="pass-input"></td>
      <td class="actions-cell"></td>
    `;

    const actionsTd = tr.querySelector(".actions-cell");
    const saveBtn = document.createElement("button");
    saveBtn.className = "ghost";
    saveBtn.textContent = "Guardar clave";
    saveBtn.onclick = () => {
      const inp = tr.querySelector("input.pass-input");
      DB.users[id].password = (inp.value || "").trim();
      saveDB(DB);
      showMsg(els.adminUserMsg, `Clave actualizada para ${id}.`);
    };

    const toggleBtn = document.createElement("button");
    toggleBtn.className = "ghost";
    toggleBtn.textContent = u.active ? "Desactivar" : "Activar";
    toggleBtn.onclick = () => {
      DB.users[id].active = !DB.users[id].active;
      saveDB(DB);
      renderUsersTable();
      showMsg(els.adminUserMsg, `Estado actualizado para ${id}.`);
    };

    actionsTd.appendChild(saveBtn);
    actionsTd.appendChild(toggleBtn);

    if (u.role === "student") {
      const resetBtn = document.createElement("button");
      resetBtn.className = "ghost";
      resetBtn.textContent = "Reiniciar progreso";
      resetBtn.onclick = () => {
        if (DB.submissions[id]) delete DB.submissions[id];
        if (DB.ratings[id]) delete DB.ratings[id];
        saveDB(DB);
        renderUsersTable();
        renderResultsView();
        showMsg(els.adminUserMsg, `Progreso reiniciado para ${id}.`);
      };
      actionsTd.appendChild(resetBtn);
    }

    tbody.appendChild(tr);
  }

  els.usersTable.appendChild(table);
}

function studentProgressBadge(studentId) {
  const sub = DB.submissions[studentId] || {};
  const cbqdDone = !!(sub.cbqd && sub.cbqd.answers && sub.cbqd.answers.length === CBQD_ITEMS.length);
  const microDone = !!(sub.micro && sub.micro.photos && sub.micro.photos.length === 3 && sub.micro.photos.every(p => !!p.dataUrl));

  const parts = [];
  parts.push(cbqdDone ? "CBQD ✅" : "CBQD ⏳");
  parts.push(microDone ? "Micro ✅" : "Micro ⏳");
  const done = cbqdDone && microDone;

  return `<span class="badge">${parts.join(" · ")}</span>${done ? ' <span class="badge">Completado</span>' : ''}`;
}

function roleLabel(r) {
  if (r === "student") return "Alumno/a";
  if (r === "expert") return "Experto/a";
  return "Administrador/a";
}

function escapeHtml(s) {
  return (s || "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function createUser() {
  hideMsg(els.adminUserMsg);

  const role = els.newRole.value;
  const id = safeId(els.newId.value);
  const pass = (els.newPass.value || "").trim();

  if (!id || !pass) {
    showMsg(els.adminUserMsg, "Falta ID o clave.", "error");
    return;
  }
  if (DB.users[id]) {
    showMsg(els.adminUserMsg, "Ese ID ya existe.", "error");
    return;
  }

  DB.users[id] = { role, password: pass, active: true, createdAt: nowISO() };
  saveDB(DB);

  els.newId.value = "";
  els.newPass.value = "";
  renderUsersTable();
  showMsg(els.adminUserMsg, `Usuario creado: ${id} (${roleLabel(role)}).`);
}

function renderResultsView() {
  els.resultsView.innerHTML = "";

  const students = Object.entries(DB.users)
    .filter(([id,u]) => u.role === "student")
    .map(([id]) => id)
    .sort();

  if (students.length === 0) {
    els.resultsView.textContent = "No hay alumnado registrado.";
    return;
  }

  const table = document.createElement("table");
  table.className = "table";
  table.innerHTML = `
    <thead>
      <tr>
        <th>Alumno/a</th>
        <th>CBQD</th>
        <th>Micro (fotos)</th>
        <th>Nº evaluadores</th>
        <th>Media global (1–5)</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tb = table.querySelector("tbody");

  for (const sid of students) {
    const sub = DB.submissions[sid] || {};
    const cbqdDone = !!(sub.cbqd && sub.cbqd.answers && sub.cbqd.answers.length === CBQD_ITEMS.length);
    const microDone = !!(sub.micro && sub.micro.photos && sub.micro.photos.length === 3 && sub.micro.photos.every(p => !!p.dataUrl));

    const rat = DB.ratings[sid] || {};
    const nEval = Object.keys(rat).length;
    const avg = computeOverallAverage(rat);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><code>${sid}</code></td>
      <td>${cbqdDone ? "✅" : "—"}</td>
      <td>${microDone ? "✅" : "—"}</td>
      <td>${nEval}</td>
      <td>${avg !== null ? avg.toFixed(2) : "—"}</td>
    `;
    tb.appendChild(tr);
  }

  els.resultsView.appendChild(table);
}

function computeOverallAverage(ratingsForStudent) {
  const vals = [];
  for (const r of Object.values(ratingsForStudent || {})) {
    for (const m of (r.byMicro || [])) {
      if (m && typeof m.overall === "number") vals.push(m.overall);
    }
  }
  if (vals.length === 0) return null;
  const sum = vals.reduce((a,b)=>a+b,0);
  return sum / vals.length;
}

function exportJSON() {
  hideMsg(els.exportMsg);
  const payload = {
    exportedAt: nowISO(),
    cbqdItems: CBQD_ITEMS,
    users: DB.users,
    submissions: DB.submissions,
    ratings: DB.ratings
  };
  downloadText("cbqd_micro_export.json", JSON.stringify(payload, null, 2), "application/json");
  showMsg(els.exportMsg, "JSON descargado.", "info");
}

function exportCSV() {
  hideMsg(els.exportMsg);

  // CSV orientado a análisis: 1 fila por alumno/a
  const header = [
    "student_id",
    "cbqd_submitted_at",
    ...CBQD_ITEMS.map((it, i) => `cbqd_{it.n}`),
    "micro_submitted_at",
    "micro1_present","micro2_present","micro3_present",
    "n_experts",
    "overall_mean"
  ];

  const rows = [header];

  const students = Object.entries(DB.users)
    .filter(([id,u]) => u.role === "student")
    .map(([id]) => id)
    .sort();

  for (const sid of students) {
    const sub = DB.submissions[sid] || {};
    const cbqdAt = sub.cbqd?.submittedAt || "";
    const ans = sub.cbqd?.answers || [];
    const microAt = sub.micro?.submittedAt || "";
    const photos = sub.micro?.photos || [];
    const present = [0,1,2].map(i => (photos[i] && photos[i].dataUrl) ? 1 : 0);

    const rat = DB.ratings[sid] || {};
    const nEval = Object.keys(rat).length;
    const avg = computeOverallAverage(rat);

    const row = [
      sid,
      cbqdAt,
      ...CBQD_ITEMS.map((it, idx) => (ans[idx] ?? "")),
      microAt,
      ...present,
      nEval,
      avg !== null ? avg.toFixed(4) : ""
    ];

    rows.push(row);
  }

  const csv = rows.map(r => r.map(v => csvCell(v)).join(",")).join("\n");
  downloadText("cbqd_micro_export.csv", csv, "text/csv;charset=utf-8");
  showMsg(els.exportMsg, "CSV descargado.", "info");
}

function csvCell(v) {
  const s = String(v ?? "");
  if (s.includes('"') || s.includes(",") || s.includes("\n")) {
    return '"' + s.replaceAll('"','""') + '"';
  }
  return s;
}

/* ========= Eventos ========= */
els.loginBtn.addEventListener("click", login);
els.password.addEventListener("keydown", (e) => {
  if (e.key === "Enter") login();
});

els.logoutStudent1.addEventListener("click", logout);
els.logoutStudent2.addEventListener("click", logout);
els.logoutExpert.addEventListener("click", logout);
els.logoutAdmin.addEventListener("click", logout);

els.cbqdSubmit.addEventListener("click", submitCBQD);
els.microSubmit.addEventListener("click", submitMicro);

els.expertRefresh.addEventListener("click", () => {
  DB = loadDB() || DB;
  renderExpertTargets();
  showMsg(els.expertMsg, "Lista actualizada.", "info");
});

els.tabs.forEach(b => b.addEventListener("click", () => {
  const tab = b.dataset.tab;
  setActiveTab(tab);
  if (tab === "users") renderUsersTable();
  if (tab === "results") renderResultsView();
}));

els.createUser.addEventListener("click", createUser);

els.exportJson.addEventListener("click", exportJSON);
els.exportCsv.addEventListener("click", exportCSV);

// Init
goTo(els.loginSection);
