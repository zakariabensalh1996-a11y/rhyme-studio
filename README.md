# 🎵 Rhyme Studio

A free, browser-based app for planning and building **3D-cartoon nursery rhyme videos** using only free AI tools. No account, no server, no cost — everything saves in your browser.

It walks you through 5 steps and gives you **ready-to-paste AI prompts** for each one.

---

## ✨ What it does

| Step | You do | Free tool |
|------|--------|-----------|
| 1. 🎶 Song | Write lyrics → copy a Suno prompt | [Suno](https://suno.com), [Udio](https://www.udio.com) |
| 2. 🧸 Characters | Describe each character → copy an image prompt | [Leonardo.ai](https://leonardo.ai), [Bing Image Creator](https://www.bing.com/images/create) |
| 3. 🎬 Scenes | Build a shot list → copy image + video prompts | [Kling AI](https://klingai.com), [Hailuo](https://hailuoai.video), [Pika](https://pika.art) |
| 4. 👄 Voice / lip-sync | Make mouths move to the song | [Hedra](https://www.hedra.com), [ElevenLabs](https://elevenlabs.io) |
| 5. ✂️ Edit | Assemble clips on the beat, add captions | [CapCut](https://www.capcut.com), [DaVinci Resolve](https://www.blackmagicdesign.com/products/davinciresolve) |
| 6. 📺 Publish | Generate title, description, tags & thumbnail prompt | [YouTube Studio](https://studio.youtube.com), [Canva](https://www.canva.com) |

The app keeps your lyrics, characters, shot list, clip links, and progress all in one place. Use **⬇ Save file** to back up a project, **⬆ Load file** to restore it.

### 📚 Ready-made templates
Click **📚 Templates** (top bar) or a template button on the welcome screen to instantly load a full project:
- **🎉 Classic Medley** — Twinkle Twinkle + Old MacDonald + Wheels on the Bus + Baa Baa Black Sheep + If You're Happy. 5 characters, 21 scenes (~3–5 min).
- **🐮 Farm Animals** — Old MacDonald with cow, pig, duck, sheep. 5 characters, 12 scenes.
- **⭐ Bedtime Stars** — gentle Twinkle Twinkle lullaby. 3 characters, 10 scenes.
- **🔤 ABC Phonics Song** — alphabet sing-along with a teacher mascot.
- **🔢 Counting Song 1–10** — "Once I Caught a Fish Alive" counting rhyme.
- **🌈 Colors Song** — learn red/yellow/blue/green with a painter.
- **📖 The Three Little Pigs** — public-domain fairy-tale **story** mode (narration + soft music).

These genres match popular preschool channels (nursery rhymes, lullabies, phonics, counting, colors, fairy tales).

All use **public-domain rhymes + AI music = safe to monetize** on YouTube.

### ⏱️ Length planner
In **Step 3 (Scenes)** a planner shows your estimated video length (≈5 sec per clip) and tells you when you've hit the **3–5 minute** YouTube sweet spot.

### 📐 Video format
In **Step 1** pick **16:9 (YouTube)** or **9:16 (Shorts / TikTok / Reels)** — the choice is added automatically to every image, video, and thumbnail prompt.

### 📦 Exports (Step 5)
- **Production Pack (.txt)** — one file with *everything*: Suno song prompt, all character prompts, the full scene shot list (image + video prompts), and the YouTube kit. Great for working offline or sharing.
- **Captions (.srt)** — timed subtitle file built from your scenes (≈5 sec each). Import it straight into CapCut or YouTube for karaoke-style captions.

*(These were modeled on common features in open-source AI video tools like ViMax, YumCut, and faceless-video generators — kept to what works in a free, no-server app.)*

---

## ▶️ Run it on your computer

Just open `index.html` in any browser — that's it. (Double-click the file.)

Or serve it locally:

```bash
# from the RhymeStudio folder
npx serve .
# then open the URL it prints
```

---

## 🌐 Put it online for free (GitHub Pages)

Once this is on GitHub, anyone can open it at a real web address.

1. **Create a repo** on GitHub named `rhyme-studio` (keep it Public).
2. **Push this folder** (commands below).
3. On GitHub: **Settings → Pages → Build and deployment → Source: "Deploy from a branch" → Branch: `main` / `/ (root)` → Save**.
4. Wait ~1 minute. Your site is live at:
   `https://YOUR-USERNAME.github.io/rhyme-studio/`

### Push commands

```bash
git remote add origin https://github.com/YOUR-USERNAME/rhyme-studio.git
git branch -M main
git push -u origin main
```

---

## 🎨 Tips for a consistent CoComelon look

- Keep the **same "Art style"** text (Step 2) in every prompt — that's what makes characters look the same across shots.
- Generate a character **once**, then in image tools upload that picture as a reference for new scenes.
- Keep clips **short (3–5s)** and cut them to the **beat** of the song.
- Big, bouncy **word captions** (karaoke style) keep toddlers watching.

---

*Built with Rhyme Studio · 100% free tools · your data stays in your browser.*
