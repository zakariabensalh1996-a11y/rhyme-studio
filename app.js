/* =========================================================
   Rhyme Studio — free AI nursery-rhyme video planner
   Pure vanilla JS. Saves to localStorage. No server needed.
   ========================================================= */

const STORAGE_KEY = "rhymeStudio.v1";

/* ---------- State ---------- */
let state = { projects: [], activeId: null };

function blankProject(title) {
  return {
    id: "p_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
    title: title || "My Nursery Rhyme",
    artStyle: "cute 3D Pixar-style cartoon, soft lighting, rounded shapes, bright happy colors, for toddlers",
    song: { style: "cheerful kids song, gentle female voice, ukulele and bells, slow tempo", lyrics: "", link: "" },
    characters: [],
    scenes: [],
    voice: { notes: "", links: "" },
    edit: { c1: false, c2: false, c3: false, c4: false, c5: false, c6: false, finalLink: "" },
    currentStep: 1,
  };
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) state = JSON.parse(raw);
  } catch (e) { console.warn("Could not load saved data", e); }
  if (!Array.isArray(state.projects)) state = { projects: [], activeId: null };
}

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch (e) { toast("⚠️ Could not save (storage full?)"); }
}

function getActive() { return state.projects.find(p => p.id === state.activeId) || null; }

/* ---------- Nested get/set for data-bind paths ---------- */
function getPath(obj, path) {
  return path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}
function setPath(obj, path, value) {
  const keys = path.split(".");
  const last = keys.pop();
  const target = keys.reduce((o, k) => (o[k] = o[k] || {}), obj);
  target[last] = value;
}

/* ---------- DOM helpers ---------- */
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

let toastTimer;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 1800);
}

async function copyText(text, label) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Fallback for older / non-secure contexts
    const ta = document.createElement("textarea");
    ta.value = text; document.body.appendChild(ta); ta.select();
    document.execCommand("copy"); ta.remove();
  }
  toast("📋 " + (label || "Copied") + " — paste it into the tool!");
}

/* =========================================================
   Prompt generators — the heart of the app
   ========================================================= */
function songPrompt(p) {
  return [
    "=== STYLE OF MUSIC (paste in the Style box) ===",
    p.song.style || "cheerful kids nursery rhyme, gentle voice",
    "",
    "=== LYRICS (paste in the Lyrics box) ===",
    p.song.lyrics || "(write your lyrics in Step 1 first)",
  ].join("\n");
}

function characterPrompt(p, c) {
  const parts = [
    p.artStyle,
    c.desc || "a cute friendly character",
    "full body, centered, character reference sheet, plain soft pastel background",
    "friendly big eyes, gentle smile, appealing to toddlers",
    "high quality, clean, consistent character design",
  ];
  return parts.filter(Boolean).join(", ");
}

function sceneImagePrompt(p, s) {
  const cast = p.characters.map(c => c.name).filter(Boolean).join(", ");
  const parts = [
    p.artStyle,
    s.desc || "a happy cartoon scene",
    cast ? ("characters in scene: " + cast) : "",
    "colorful storybook background, cinematic, bright and cheerful, 16:9",
  ];
  return parts.filter(Boolean).join(", ");
}

function sceneVideoPrompt(p, s) {
  const parts = [
    s.motion || "gentle natural movement",
    "smooth animation, " + (p.artStyle || "3D cartoon style"),
    "looping-friendly, stable characters, no distortion",
  ];
  return parts.filter(Boolean).join(", ");
}

function fullShotList(p) {
  const lines = [];
  lines.push("🎬 SHOT LIST — " + (p.title || "Untitled"));
  lines.push("Art style: " + p.artStyle);
  lines.push("Song: " + (p.song.link || "(not linked yet)"));
  lines.push("");
  if (!p.scenes.length) { lines.push("(No scenes yet — add some in Step 3.)"); }
  p.scenes.forEach((s, i) => {
    lines.push(`--- Scene ${i + 1}  [${statusLabel(s.status)}] ---`);
    if (s.lyric) lines.push("Lyric: " + s.lyric);
    if (s.desc) lines.push("See:   " + s.desc);
    if (s.motion) lines.push("Move:  " + s.motion);
    lines.push("Image prompt: " + sceneImagePrompt(p, s));
    lines.push("Video prompt: " + sceneVideoPrompt(p, s));
    if (s.link) lines.push("Clip:  " + s.link);
    lines.push("");
  });
  return lines.join("\n");
}

function statusLabel(st) {
  return st === "clip" ? "CLIP DONE" : st === "image" ? "image done" : "to do";
}

/* =========================================================
   Rendering
   ========================================================= */
function refreshProjectPicker() {
  const picker = $("#projectPicker");
  picker.innerHTML = "";
  state.projects.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.title || "Untitled";
    if (p.id === state.activeId) opt.selected = true;
    picker.appendChild(opt);
  });
}

function render() {
  const p = getActive();
  const hasProject = !!p;
  $("#welcome").classList.toggle("hidden", hasProject);
  $("#workspace").classList.toggle("hidden", !hasProject);
  $("#projectPicker").classList.toggle("hidden", !state.projects.length);
  refreshProjectPicker();
  if (!hasProject) return;

  // Bind simple fields
  $$("[data-bind]").forEach(el => {
    const val = getPath(p, el.dataset.bind);
    if (el.type === "checkbox") el.checked = !!val;
    else el.value = val == null ? "" : val;
  });

  renderCharacters(p);
  renderScenes(p);
  showStep(p.currentStep || 1);
  updateProgress(p);
}

function renderCharacters(p) {
  const list = $("#characterList");
  list.innerHTML = "";
  p.characters.forEach((c, idx) => list.appendChild(characterCard(p, c, idx)));
}

function characterCard(p, c, idx) {
  const node = $("#characterTemplate").content.firstElementChild.cloneNode(true);
  const name = node.querySelector(".char-name");
  const desc = node.querySelector(".char-desc");
  const link = node.querySelector(".char-link");
  name.value = c.name || "";
  desc.value = c.desc || "";
  link.value = c.link || "";
  name.addEventListener("input", () => { c.name = name.value; save(); });
  desc.addEventListener("input", () => { c.desc = desc.value; save(); });
  link.addEventListener("input", () => { c.link = link.value; save(); });
  node.querySelector(".char-prompt").addEventListener("click", () => copyText(characterPrompt(p, c), "Image prompt for " + (c.name || "character")));
  node.querySelector(".btn-del").addEventListener("click", () => {
    p.characters.splice(idx, 1); save(); renderCharacters(p);
  });
  return node;
}

function renderScenes(p) {
  const list = $("#sceneList");
  list.innerHTML = "";
  p.scenes.forEach((s, idx) => list.appendChild(sceneCard(p, s, idx)));
}

function sceneCard(p, s, idx) {
  const node = $("#sceneTemplate").content.firstElementChild.cloneNode(true);
  node.querySelector(".scene-num").textContent = "Scene " + (idx + 1);
  const lyric = node.querySelector(".scene-lyric");
  const desc = node.querySelector(".scene-desc");
  const motion = node.querySelector(".scene-motion");
  const status = node.querySelector(".scene-status");
  const link = node.querySelector(".scene-link");
  lyric.value = s.lyric || ""; desc.value = s.desc || "";
  motion.value = s.motion || ""; status.value = s.status || "todo"; link.value = s.link || "";
  lyric.addEventListener("input", () => { s.lyric = lyric.value; save(); });
  desc.addEventListener("input", () => { s.desc = desc.value; save(); });
  motion.addEventListener("input", () => { s.motion = motion.value; save(); });
  link.addEventListener("input", () => { s.link = link.value; save(); });
  status.addEventListener("change", () => { s.status = status.value; save(); updateProgress(p); });
  node.querySelector(".scene-img-prompt").addEventListener("click", () => copyText(sceneImagePrompt(p, s), "Image prompt (Scene " + (idx + 1) + ")"));
  node.querySelector(".scene-vid-prompt").addEventListener("click", () => copyText(sceneVideoPrompt(p, s), "Video prompt (Scene " + (idx + 1) + ")"));
  node.querySelector(".btn-del").addEventListener("click", () => {
    p.scenes.splice(idx, 1); save(); renderScenes(p);
  });
  return node;
}

function showStep(n) {
  $$(".step-tab").forEach(t => t.classList.toggle("active", +t.dataset.step === n));
  $$(".panel").forEach(panel => panel.classList.toggle("active", +panel.dataset.panel === n));
}

function updateProgress(p) {
  const checks = [
    !!(p.song.lyrics && p.song.lyrics.trim()),
    !!(p.song.link && p.song.link.trim()),
    p.characters.some(c => c.link && c.link.trim()),
    p.scenes.some(s => s.status === "clip"),
    !!(p.edit.finalLink && p.edit.finalLink.trim()),
  ];
  const done = checks.filter(Boolean).length;
  $("#progressFill").style.width = (done / checks.length * 100) + "%";
}

/* =========================================================
   Events
   ========================================================= */
function newProject() {
  const title = prompt("Name your video:", "My Nursery Rhyme");
  if (title === null) return;
  const p = blankProject(title.trim() || "My Nursery Rhyme");
  state.projects.push(p);
  state.activeId = p.id;
  save(); render();
  toast("✨ New project created!");
}

function bindGlobalEvents() {
  $("#newProjectBtn").addEventListener("click", newProject);
  $("#welcomeNewBtn").addEventListener("click", newProject);

  $("#projectPicker").addEventListener("change", e => {
    state.activeId = e.target.value; save(); render();
  });

  $("#deleteProjectBtn").addEventListener("click", () => {
    const p = getActive(); if (!p) return;
    if (!confirm('Delete "' + (p.title || "this project") + '"? This cannot be undone.')) return;
    state.projects = state.projects.filter(x => x.id !== p.id);
    state.activeId = state.projects[0] ? state.projects[0].id : null;
    save(); render();
    toast("🗑 Project deleted");
  });

  // Step tabs
  $("#stepNav").addEventListener("click", e => {
    const tab = e.target.closest(".step-tab"); if (!tab) return;
    const n = +tab.dataset.step;
    const p = getActive(); if (p) { p.currentStep = n; save(); }
    showStep(n);
  });

  // Generic two-way binding for [data-bind] fields
  $("#workspace").addEventListener("input", e => {
    const el = e.target.closest("[data-bind]"); if (!el) return;
    const p = getActive(); if (!p) return;
    const val = el.type === "checkbox" ? el.checked : el.value;
    setPath(p, el.dataset.bind, val);
    save();
    if (el.dataset.bind === "title") refreshProjectPicker();
    updateProgress(p);
  });

  // Prompt buttons in Step 1 & 5
  document.body.addEventListener("click", e => {
    const btn = e.target.closest("[data-prompt]"); if (!btn) return;
    const p = getActive(); if (!p) return;
    if (btn.dataset.prompt === "song") copyText(songPrompt(p), "Suno song prompt");
  });
  $("#copyShotlistBtn").addEventListener("click", () => {
    const p = getActive(); if (p) copyText(fullShotList(p), "Full shot list");
  });

  // Add character / scene
  $("#addCharacterBtn").addEventListener("click", () => {
    const p = getActive(); if (!p) return;
    p.characters.push({ name: "", desc: "", link: "" });
    save(); renderCharacters(p);
  });
  $("#addSceneBtn").addEventListener("click", () => {
    const p = getActive(); if (!p) return;
    p.scenes.push({ lyric: "", desc: "", motion: "", status: "todo", link: "" });
    save(); renderScenes(p);
  });

  // Auto-fill scenes from lyrics
  $("#autoScenesBtn").addEventListener("click", () => {
    const p = getActive(); if (!p) return;
    const lines = (p.song.lyrics || "").split("\n").map(l => l.trim()).filter(Boolean);
    if (!lines.length) { toast("✍️ Write lyrics in Step 1 first"); return; }
    if (!confirm("Create " + lines.length + " scenes, one per lyric line?")) return;
    lines.forEach(line => p.scenes.push({ lyric: line, desc: "", motion: "", status: "todo", link: "" }));
    save(); renderScenes(p);
    toast("✨ Added " + lines.length + " scenes");
  });

  // Export / Import
  $("#exportBtn").addEventListener("click", () => {
    const p = getActive(); if (!p) { toast("No project to save"); return; }
    const blob = new Blob([JSON.stringify(p, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = (p.title || "rhyme-project").replace(/[^\w\-]+/g, "_") + ".json";
    a.click();
    URL.revokeObjectURL(a.href);
    toast("⬇ Saved project file");
  });
  $("#importBtn").addEventListener("click", () => $("#importInput").click());
  $("#importInput").addEventListener("change", e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const p = JSON.parse(reader.result);
        p.id = "p_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
        state.projects.push(p); state.activeId = p.id;
        save(); render();
        toast("⬆ Project loaded!");
      } catch { toast("⚠️ That file isn't a valid project"); }
    };
    reader.readAsText(file);
    e.target.value = "";
  });
}

/* ---------- Boot ---------- */
load();
bindGlobalEvents();
render();
