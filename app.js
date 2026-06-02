/* =========================================================
   Rhyme Studio — free AI nursery-rhyme video planner
   Pure vanilla JS. Saves to localStorage. No server needed.
   ========================================================= */

const STORAGE_KEY = "rhymeStudio.v1";

/* ---------- State ---------- */
let state = { projects: [], activeId: null };
let firstVisit = false;

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
    else firstVisit = true;
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
  updateLength(p);
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
  $("#medleyBtn").addEventListener("click", loadMedley);
  $("#welcomeMedleyBtn").addEventListener("click", loadMedley);

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

/* =========================================================
   Sample project — auto-loaded on a visitor's first open
   ========================================================= */
function sampleProject() {
  const p = blankProject("⭐ Twinkle Twinkle Baby Stars (sample)");
  p.artStyle = "cute 3D Pixar-style cartoon, soft dreamy night lighting, rounded shapes, pastel colors, gentle glow, for toddlers";
  p.song.style = "soft lullaby, gentle female voice, twinkly bells and soft piano, slow dreamy tempo";
  p.song.lyrics = [
    "Twinkle twinkle baby stars,",
    "Up above so high you are,",
    "Little stars all shining bright,",
    "Twinkle through the cozy night,",
    "Twinkle twinkle baby stars,",
    "Sweet dreams little ones you are.",
  ].join("\n");
  p.song.link = "";
  p.characters = [
    { name: "Luna the Little Star", desc: "a glowing baby star, soft yellow, rosy cheeks, big sparkly eyes, tiny arms, happy gentle smile, soft golden glow", link: "" },
    { name: "Mr. Moon", desc: "a friendly crescent moon, soft cream color, sleepy kind face, closed peaceful eyes, gentle smile", link: "" },
    { name: "Baby Bo", desc: "a sleepy toddler in blue star pajamas, hugging a teddy bear, big round eyes, sweet sleepy smile", link: "" },
  ];
  const scenes = [
    { lyric: "Twinkle twinkle baby stars,", desc: "A deep blue night sky full of glowing baby stars, Luna the Little Star twinkling happily in the center", motion: "slow zoom in, stars gently pulse and sparkle", status: "clip" },
    { lyric: "Up above so high you are,", desc: "Wide view of the starry sky above soft rolling hills and tiny houses with warm windows", motion: "slow pan upward toward the stars", status: "image" },
    { lyric: "Little stars all shining bright,", desc: "A cluster of cute baby stars giggling and shining, soft sparkles floating around them", motion: "stars bounce gently, sparkles drift", status: "todo" },
    { lyric: "Twinkle through the cozy night,", desc: "Mr. Moon smiling among the clouds while stars twinkle around his soft glow", motion: "gentle drifting clouds, soft glow pulsing", status: "todo" },
    { lyric: "Twinkle twinkle baby stars,", desc: "Luna the Little Star waving goodnight, surrounded by twinkling friends", motion: "Luna waves, slow gentle sway", status: "todo" },
    { lyric: "Sweet dreams little ones you are.", desc: "Baby Bo asleep in bed hugging a teddy, soft starlight through the window, Luna glowing softly", motion: "very slow zoom out, calm and peaceful", status: "todo" },
  ];
  p.scenes = scenes;
  p.voice.notes = "Luna the Little Star sings the whole lullaby. Use Hedra: upload Luna's image + the Suno song audio to make her mouth move.";
  p.edit.c1 = true;
  return p;
}

/* =========================================================
   Classic Medley template — a full ready-to-make 3-5 min plan
   (all rhymes are public domain = safe for YouTube)
   ========================================================= */
function medleyProject() {
  const p = blankProject("🎉 Classic Nursery Rhyme Medley (3–5 min)");
  p.artStyle = "cute 3D Pixar-style cartoon, soft lighting, rounded shapes, bright happy colors, big friendly eyes, for toddlers";
  p.song.style = "upbeat cheerful kids medley, bright happy female voice, playful piano, ukulele and light drums, clear sing-along, joyful";
  p.song.lyrics = [
    "Hello friends, let's sing and play,",
    "Fun little songs to brighten your day!",
    "",
    "Twinkle twinkle little star,",
    "How I wonder what you are,",
    "Up above the world so high,",
    "Like a diamond in the sky.",
    "",
    "Old MacDonald had a farm, E-I-E-I-O,",
    "And on his farm he had a cow, E-I-E-I-O,",
    "With a moo moo here and a moo moo there,",
    "And on his farm he had a duck, E-I-E-I-O,",
    "",
    "The wheels on the bus go round and round,",
    "Round and round, round and round,",
    "The wheels on the bus go round and round,",
    "All through the town!",
    "",
    "Baa baa black sheep, have you any wool?",
    "Yes sir, yes sir, three bags full!",
    "",
    "If you're happy and you know it, clap your hands!",
    "If you're happy and you know it, stomp your feet!",
    "If you're happy and you know it, shout hooray!",
    "",
    "Thank you friends for singing along,",
    "See you next time for another song!",
  ].join("\n");
  p.characters = [
    { name: "Mimi the Mouse", desc: "a tiny cheerful mouse host, round ears, red polka-dot bow, big sparkly eyes, friendly smile, waves hello", link: "" },
    { name: "Benny the Bunny", desc: "a fluffy white baby bunny, long floppy ears, blue overalls, big happy eyes, bouncy", link: "" },
    { name: "Daisy the Duck", desc: "a cute yellow duckling, orange beak and feet, tiny wings, joyful smile", link: "" },
    { name: "Farmer Sam", desc: "a friendly round cartoon farmer, straw hat, red checked shirt, rosy cheeks, big smile", link: "" },
    { name: "Lulu the Lamb", desc: "a soft white baby lamb, fluffy curly wool, pink bow, gentle blue eyes", link: "" },
  ];
  const rows = [
    ["(Intro) Hello friends, let's sing and play", "Title card scene: Mimi the Mouse waves hello on a bright stage with balloons and the title 'Sing Along Rhymes'", "Mimi waves, balloons float up, confetti sparkle"],
    ["Fun little songs to brighten your day!", "All characters (Mimi, Benny, Daisy, Lulu) jump in together smiling at the camera", "characters bounce in one by one, happy"],
    ["Twinkle twinkle little star", "Night sky full of glowing stars, one big smiling star in the center, Mimi looking up in wonder", "slow zoom in, stars twinkle and pulse"],
    ["How I wonder what you are", "Close-up of the friendly big star winking, soft sparkles drifting", "star gently sways, sparkles float"],
    ["Up above the world so high", "Wide view of the starry sky above rolling hills with tiny glowing houses", "slow pan upward toward the stars"],
    ["Like a diamond in the sky", "The star shines bright like a sparkling diamond, rainbow glow around it", "bright glow pulses, gentle twinkle"],
    ["Old MacDonald had a farm, E-I-E-I-O", "Sunny cartoon farm with a red barn, green fields, Farmer Sam waving by the fence", "slow push in on the farm, clouds drift"],
    ["And on his farm he had a cow", "A happy spotted cartoon cow chewing grass, butterflies around it", "cow turns head and moos, tail swishes"],
    ["With a moo moo here and a moo moo there", "Close-up of the smiling cow mooing, Farmer Sam laughing beside it", "cow opens mouth to moo, gentle bounce"],
    ["And on his farm he had a duck, E-I-E-I-O", "Daisy the Duck splashing in a little farm pond, ducklings following", "duck waddles and splashes, ripples in water"],
    ["The wheels on the bus go round and round", "A cute yellow cartoon school bus driving down a sunny town road, big round wheels", "bus drives left to right, wheels spin"],
    ["Round and round, round and round", "Close-up of the spinning bus wheels with motion sparkles", "wheels spin fast, gentle bounce"],
    ["The wheels on the bus go round and round", "Inside the bus: Benny, Daisy and Lulu sitting happily by the windows waving", "characters sway with the bus, wave out window"],
    ["All through the town!", "Wide shot of the bus passing colorful houses, trees and a park", "bus drives across screen, scenery passes"],
    ["Baa baa black sheep, have you any wool?", "Lulu the Lamb (and a black sheep friend) on a green hill, fluffy clouds above", "sheep hop gently, wind in the wool"],
    ["Yes sir, yes sir, three bags full!", "The sheep proudly shows three little bags of soft wool, Mimi clapping", "sheep nods, bags wobble, Mimi claps"],
    ["If you're happy and you know it, clap your hands!", "All characters in a row clapping their hands, big smiles, colorful background", "everyone claps together, bouncy beat"],
    ["If you're happy and you know it, stomp your feet!", "Characters stomping their feet happily, little dust puffs", "feet stomp, characters bounce"],
    ["If you're happy and you know it, shout hooray!", "Characters throwing arms up shouting hooray, confetti and stars burst", "arms up, confetti explodes, big cheer"],
    ["Thank you friends for singing along", "All characters waving goodbye together, warm sunset colors", "characters wave, gentle sway"],
    ["See you next time for another song!", "End card: 'Thanks for watching! Subscribe' with characters and a big star", "slow zoom out, star sparkles, gentle float"],
  ];
  p.scenes = rows.map(([lyric, desc, motion]) => ({ lyric, desc, motion, status: "todo", link: "" }));
  p.voice.notes = "Mimi the Mouse can be the singing host. Optional: use Hedra to make Mimi's mouth move on the intro and outro lines. The rest is just music + scenes, no lip-sync needed.";
  p.edit.c1 = false;
  return p;
}

function loadMedley() {
  const m = medleyProject();
  state.projects.push(m);
  state.activeId = m.id;
  save(); render();
  toast("📚 Classic Medley loaded — 21 scenes ready!");
}

/* ---------- Length planner ---------- */
const SECONDS_PER_CLIP = 5;
function updateLength(p) {
  const el = document.getElementById("lengthPlanner");
  if (!el || !p) return;
  const n = p.scenes.length;
  const secs = n * SECONDS_PER_CLIP;
  const mm = Math.floor(secs / 60), ss = secs % 60;
  const timeStr = mm + " min " + (ss < 10 ? "0" + ss : ss) + " sec";
  document.getElementById("lpHeadline").textContent =
    n + " scene" + (n === 1 ? "" : "s") + " ≈ " + timeStr + " of video";
  // Target band: 3 min (180s) to 5 min (300s). Bar fills toward 5 min.
  const pct = Math.min(100, Math.round(secs / 300 * 100));
  document.getElementById("lpBar").style.width = pct + "%";
  let hint;
  if (secs < 180) hint = "Keep adding scenes — you need ~" + Math.ceil((180 - secs) / SECONDS_PER_CLIP) + " more to reach 3 minutes. (Tip: you can also repeat scenes & loop clips in CapCut.)";
  else if (secs <= 300) hint = "✅ Great — you're in the 3–5 minute sweet spot for YouTube!";
  else hint = "You have plenty (" + timeStr + "). That's fine — extra scenes give you variety.";
  document.getElementById("lpHint").textContent = hint;
}

/* ---------- Boot ---------- */
load();
if (firstVisit && state.projects.length === 0) {
  const s = sampleProject();
  state.projects.push(s);
  state.activeId = s.id;
  save();
}
bindGlobalEvents();
render();
