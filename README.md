# 🎵 Auralis - Premium Music Player

Auralis is a sleek, premium, Spotify-inspired web music player packed with advanced features like a real-time visualizer, an interactive equalizer, synchronized lyrics, custom theme presets, sleep timer, local music uploading, and analytics tracking. Built using modern UI standards, it features glassmorphism, responsive grids, and subtle micro-animations for an elevated user experience.

---

## ✨ Key Features

- 🎧 **High Fidelity Playback**: Standard controls (play, pause, next, previous, shuffle, repeat, seek, volume, and speed control up to 2x).
- 📊 **Real-time Audio Visualizer**: Uses the Web Audio API to render real-time waveforms and frequency bars in 3 distinct modes:
  - **Bars**: Classic responsive graphic equalizer bars.
  - **Circular**: A pulsing radial ring visualizer.
  - **Wave**: Smooth oscilloscope waveform lines.
- 🎛️ **8-Band Equalizer**: Tweak frequencies or choose from presets like Bass Boost, Treble Boost, Vocal Boost, Rock, Pop, Classical, and Jazz.
- 🎤 **Synchronized Lyrics**: Live lyrics panel highlighting and scrolling automatically to match the current playback time.
- 🎨 **Theme Customizer**: 6 premium handcrafted theme palettes (Dark, Light, Spotify Green, Neon Purple, Cyberpunk, and Ocean Blue).
- 🕒 **Smart Sleep Timer**: Set a timer (15, 30, 45, 60 minutes or custom) to automatically pause music when the countdown ends.
- 📂 **Local Music Upload**: Drag and drop or browse local MP3 files to immediately append them to the active playlist queue.
- 📈 **Analytics Dashboard**: Tracks listening history, total plays, listening time, and calculates your favorite genre and most played track.
- 📱 **Responsive & PWA Ready**: Supports collapsible sidebar navigation, responsive layout adaptation for mobile, keyboard shortcuts, and offline service worker compatibility.
- 📐 **Mini Player Mode**: Collapses the main player into a compact floating layout.

---

## 🛠️ Technology Stack

- **Structure**: Semantic HTML5
- **Styling**: Vanilla CSS3 (Custom Variables, Flexbox/Grid layouts, Glassmorphism, animations)
- **Logic**: Vanilla ES6+ Javascript
- **Audio Processing**: Web Audio API (`AudioContext`, `BiquadFilterNode`, `AnalyserNode`, `GainNode`)
- **Graphics**: HTML5 Canvas API (for visualizer rendering & particle background)

---

## 🎹 Keyboard Shortcuts

Quickly control your playback from anywhere on the page:

| Key | Action |
| --- | --- |
| `Spacebar` | Play / Pause |
| `Arrow Left` | Previous Song |
| `Arrow Right` | Next Song |
| `Arrow Up` | Volume Up (+5%) |
| `Arrow Down` | Volume Down (-5%) |
| `M` | Mute / Unmute |
| `S` | Toggle Shuffle |
| `R` | Cycle Repeat Mode |
| `?` | Toggle Shortcuts Hint |

---

## 📁 File Structure

```text
music-player/
├── index.html          # Main HTML structure & layouts
├── style.css           # Global stylesheets, layouts, animations & variables
├── script.js          # Core app controller and UI binding logic
├── manifest.json       # PWA metadata configuration
├── sw.js               # Service Worker for PWA setup
├── components/
│   ├── theme.js        # Theme manager configuration and application
│   ├── player.js       # Core audio engine (Web Audio API pipeline & playback control)
│   ├── playlist.js     # Playlist states, favorites, queue, & localStorage saving
│   ├── visualizer.js   # Canvas drawing algorithms for waveforms and bars
│   ├── equalizer.js    # BiquadFilter configurations and custom range inputs
│   └── analytics.js    # Listening statistics tracker
└── assets/
    ├── data/
    │   └── songs.json  # Meta data configuration for songs
    ├── covers/         # Album artwork illustrations
    └── lyrics/         # Timed lyric files (.txt LRC-format)
```

---

## 🚀 Getting Started

To run the application locally:

### Option A: VS Code Live Server (Recommended)
1. Open this folder in VS Code.
2. Right-click `index.html` and click **Open with Live Server**.

### Option B: Local Node Server
You can launch a local server using `http-server` (requires Node.js):
```bash
# Run using npx directly
npx http-server -p 8080
```
Open `http://localhost:8080` in your web browser.

> **Note**: For security reasons, the browser blocks Web Audio API (`MediaElementAudioSourceNode`) from reading raw audio signals if the pages are loaded via the `file://` protocol. Running a local HTTP server is required to allow the visualizer, equalizer, and player to route audio correctly.

---

## 📝 License

This project is open-source. Feel free to clone, modify, and build upon this music player experience!
