(() => {
  'use strict';

  let allSongs = [];
  let listenInterval = null;

  // ─── Initialization ─────────────────────────────────────────────
  async function init() {
    ThemeManager.init();
    await loadSongs();
    Player.setSongs(allSongs);
    Playlist.setQueue([...allSongs]);
    setupUI();
    setupEventListeners();
    Player.restoreState();
    setupKeyboardShortcuts();
    setupParticles();
    setupFloatingNotes();
    Visualizer.init(document.getElementById('visualizer-canvas'));
    Equalizer.init(document.getElementById('eq-sliders'));
    updateAnalyticsView();
    updateFavoritesCount();
    updateGreeting();
    updateSidebarStats();

    setTimeout(() => {
      document.getElementById('loading-screen').classList.add('hidden');
      document.getElementById('app').classList.add('loaded');
    }, 1500);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  async function loadSongs() {
    try {
      const res = await fetch('assets/data/songs.json');
      const data = await res.json();
      const userSongs = Playlist.getUserSongs();
      allSongs = [...data, ...userSongs];
    } catch (e) {
      allSongs = Playlist.getUserSongs();
    }
  }

  // ─── UI Setup ─────────────────────────────────────────────────
  function setupUI() {
    renderSongGrid(allSongs);
    renderPlaylist(allSongs);
  }

  function renderSongGrid(songs, container) {
    const grid = container || document.getElementById('song-grid');
    grid.innerHTML = songs.map((song, i) => `
      <div class="song-card" data-id="${song.id}" data-index="${allSongs.indexOf(song)}">
        <div class="song-card-cover">
          <img src="${song.cover}" alt="${song.title}" loading="lazy">
          <div class="song-card-play"><i class="fas fa-play"></i></div>
        </div>
        <div class="song-card-fav">
          <button class="btn-icon ${Playlist.isFavorite(song.id) ? 'favorited' : ''}" data-fav="${song.id}">
            <i class="${Playlist.isFavorite(song.id) ? 'fas' : 'far'} fa-heart"></i>
          </button>
        </div>
        <div class="song-card-title">${song.title}</div>
        <div class="song-card-artist">${song.artist}</div>
        <div class="song-card-meta">
          <span>${song.genre}</span>
          <span>${formatTime(song.duration)}</span>
        </div>
      </div>
    `).join('');

    grid.querySelectorAll('.song-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('[data-fav]')) return;
        const idx = parseInt(card.dataset.index);
        Player.play(idx);
      });
    });

    grid.querySelectorAll('[data-fav]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.fav);
        const fav = Playlist.toggleFavorite(id);
        btn.classList.toggle('favorited', fav);
        btn.querySelector('i').className = fav ? 'fas fa-heart' : 'far fa-heart';
        updateFavoritesCount();
        toast(fav ? 'Added to favorites' : 'Removed from favorites', 'success');
      });
    });
  }

  function renderPlaylist(songs) {
    const container = document.getElementById('playlist-container');
    container.innerHTML = songs.map((song, i) => `
      <div class="playlist-item" data-index="${i}" draggable="true">
        <span class="playlist-item-num">${i + 1}</span>
        <img class="playlist-item-cover" src="${song.cover}" alt="" loading="lazy">
        <div class="playlist-item-info">
          <div class="playlist-item-title">${song.title}</div>
          <div class="playlist-item-artist">${song.artist}</div>
        </div>
        <span class="playlist-item-duration">${formatTime(song.duration)}</span>
        <div class="playlist-item-actions">
          <button class="btn-icon" title="Remove" data-remove="${i}"><i class="fas fa-times"></i></button>
          <span class="playlist-item-drag"><i class="fas fa-grip-vertical"></i></span>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.playlist-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('[data-remove]') || e.target.closest('.playlist-item-drag')) return;
        Player.play(parseInt(item.dataset.index));
      });

      item.addEventListener('dragstart', (e) => {
        item.classList.add('dragging');
        e.dataTransfer.setData('text/plain', item.dataset.index);
      });
      item.addEventListener('dragend', () => item.classList.remove('dragging'));
      item.addEventListener('dragover', (e) => e.preventDefault());
      item.addEventListener('drop', (e) => {
        e.preventDefault();
        const from = parseInt(e.dataTransfer.getData('text/plain'));
        const to = parseInt(item.dataset.index);
        if (from !== to) {
          const arr = [...allSongs];
          const [moved] = arr.splice(from, 1);
          arr.splice(to, 0, moved);
          allSongs = arr;
          Player.setSongs(allSongs);
          Playlist.setQueue(allSongs);
          renderPlaylist(allSongs);
        }
      });
    });

    container.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.remove);
        allSongs.splice(idx, 1);
        Player.setSongs(allSongs);
        Playlist.setQueue(allSongs);
        renderPlaylist(allSongs);
        renderSongGrid(allSongs);
        updateSidebarStats();
      });
    });
  }

  // ─── Event Listeners ──────────────────────────────────────────
  function setupEventListeners() {
    // Player controls
    document.getElementById('btn-play').addEventListener('click', () => Player.togglePlay());
    document.getElementById('btn-prev').addEventListener('click', () => Player.prev());
    document.getElementById('btn-next').addEventListener('click', () => Player.next());
    document.getElementById('btn-seek-back').addEventListener('click', () => Player.seekBackward());
    document.getElementById('btn-seek-fwd').addEventListener('click', () => Player.seekForward());
    document.getElementById('btn-mute').addEventListener('click', () => {
      Player.mute();
      updateVolumeUI();
    });

    document.getElementById('btn-shuffle').addEventListener('click', () => {
      const on = Player.toggleShuffle();
      document.getElementById('btn-shuffle').classList.toggle('active', on);
      toast(on ? 'Shuffle on' : 'Shuffle off', 'info');
    });

    document.getElementById('btn-repeat').addEventListener('click', () => {
      const mode = Player.toggleRepeat();
      const btn = document.getElementById('btn-repeat');
      btn.classList.toggle('active', mode !== 'none');
      btn.querySelector('i').className = mode === 'one' ? 'fas fa-redo-alt' : 'fas fa-redo-alt';
      btn.title = mode === 'none' ? 'Repeat (R)' : mode === 'one' ? 'Repeat One' : 'Repeat All';
      toast(`Repeat: ${mode}`, 'info');
    });

    document.getElementById('btn-speed').addEventListener('click', () => {
      const speed = Player.cycleSpeed();
      document.getElementById('btn-speed').textContent = speed + 'x';
    });

    // Volume
    const volumeSlider = document.getElementById('volume-slider');
    volumeSlider.addEventListener('input', () => {
      Player.setVolume(volumeSlider.value / 100);
      updateVolumeUI();
    });

    // Progress bar
    const progressBar = document.getElementById('progress-bar');
    let isDragging = false;
    progressBar.addEventListener('mousedown', (e) => { isDragging = true; seekFromEvent(e); });
    document.addEventListener('mousemove', (e) => { if (isDragging) seekFromEvent(e); });
    document.addEventListener('mouseup', () => { isDragging = false; });
    progressBar.addEventListener('click', seekFromEvent);

    function seekFromEvent(e) {
      const rect = progressBar.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const state = Player.getState();
      if (state.duration) Player.seekTo(pct * state.duration);
    }

    // Favorite in now-playing
    document.getElementById('np-fav').addEventListener('click', () => {
      const state = Player.getState();
      if (!state.currentSong) return;
      const fav = Playlist.toggleFavorite(state.currentSong.id);
      updateNowPlayingFav(fav);
      updateFavoritesCount();
      toast(fav ? 'Added to favorites' : 'Removed from favorites', 'success');
    });

    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        switchView(item.dataset.view);
      });
    });

    // Sidebar toggle
    document.getElementById('sidebar-toggle').addEventListener('click', () => {
      const sidebar = document.getElementById('sidebar');
      sidebar.classList.toggle('open');
      sidebar.classList.toggle('collapsed');
    });

    // Filter chips
    document.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const filter = chip.dataset.filter;
        const filtered = filter === 'all' ? allSongs : allSongs.filter(s => s.genre === filter);
        renderSongGrid(filtered);
      });
    });

    // Sort
    document.getElementById('sort-select').addEventListener('change', (e) => {
      const sorted = [...allSongs];
      switch (e.target.value) {
        case 'title': sorted.sort((a, b) => a.title.localeCompare(b.title)); break;
        case 'artist': sorted.sort((a, b) => a.artist.localeCompare(b.artist)); break;
        case 'duration': sorted.sort((a, b) => a.duration - b.duration); break;
        case 'genre': sorted.sort((a, b) => a.genre.localeCompare(b.genre)); break;
      }
      renderSongGrid(sorted);
    });

    // Search
    const searchInput = document.getElementById('search-input');
    const searchSuggestions = document.getElementById('search-suggestions');
    const searchClear = document.getElementById('search-clear');

    searchInput.addEventListener('input', () => {
      const q = searchInput.value.toLowerCase().trim();
      searchClear.classList.toggle('hidden', !q);
      if (!q) {
        searchSuggestions.classList.add('hidden');
        return;
      }
      const results = allSongs.filter(s =>
        s.title.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q) ||
        s.album.toLowerCase().includes(q) ||
        s.genre.toLowerCase().includes(q)
      ).slice(0, 6);

      if (results.length) {
        searchSuggestions.innerHTML = results.map(s => `
          <div class="search-suggestion-item" data-id="${s.id}">
            <img src="${s.cover}" alt="">
            <div>
              <div style="font-weight:600;font-size:0.85rem">${s.title}</div>
              <div style="font-size:0.75rem;color:var(--text-secondary)">${s.artist} • ${s.genre}</div>
            </div>
          </div>
        `).join('');
        searchSuggestions.classList.remove('hidden');

        searchSuggestions.querySelectorAll('.search-suggestion-item').forEach(item => {
          item.addEventListener('click', () => {
            const id = parseInt(item.dataset.id);
            const idx = allSongs.findIndex(s => s.id === id);
            if (idx >= 0) Player.play(idx);
            searchSuggestions.classList.add('hidden');
            searchInput.value = '';
            searchClear.classList.add('hidden');
          });
        });
      } else {
        searchSuggestions.innerHTML = '<div style="padding:12px;text-align:center;color:var(--text-tertiary)">No results found</div>';
        searchSuggestions.classList.remove('hidden');
      }
    });

    searchClear.addEventListener('click', () => {
      searchInput.value = '';
      searchSuggestions.classList.add('hidden');
      searchClear.classList.add('hidden');
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-box')) searchSuggestions.classList.add('hidden');
    });

    // Modals
    document.getElementById('btn-upload').addEventListener('click', () => openModal('upload-modal'));
    document.getElementById('btn-sleep-timer').addEventListener('click', () => openModal('sleep-modal'));
    document.getElementById('btn-theme').addEventListener('click', () => openModal('theme-modal'));

    document.querySelectorAll('.modal-close').forEach(btn => {
      btn.addEventListener('click', () => closeModal(btn.dataset.modal));
    });
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', () => {
        overlay.closest('.modal').classList.add('hidden');
      });
    });

    // Upload
    setupUpload();

    // Sleep Timer
    setupSleepTimer();

    // Playlist buttons
    document.getElementById('btn-play-all').addEventListener('click', () => Player.play(0));
    document.getElementById('btn-shuffle-all').addEventListener('click', () => {
      if (!Player.getState().shuffle) Player.toggleShuffle();
      document.getElementById('btn-shuffle').classList.add('active');
      Player.play(Math.floor(Math.random() * allSongs.length));
    });
    document.getElementById('btn-clear-queue').addEventListener('click', () => {
      toast('Queue cleared', 'info');
    });

    // Queue panel
    document.getElementById('btn-queue-toggle').addEventListener('click', () => {
      const panel = document.getElementById('queue-panel');
      panel.classList.toggle('visible');
      renderQueue();
    });
    document.getElementById('queue-close').addEventListener('click', () => {
      document.getElementById('queue-panel').classList.remove('visible');
    });

    // Lyrics toggle
    document.getElementById('btn-lyrics-toggle').addEventListener('click', () => switchView('lyrics'));

    // Mood cards
    document.querySelectorAll('.mood-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.mood-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        const mood = card.dataset.mood;
        const filtered = allSongs.filter(s => s.mood === mood);
        const resultsSection = document.getElementById('mood-results');
        const songsContainer = document.getElementById('mood-songs');
        document.getElementById('mood-results-title').textContent = `Songs for ${mood}`;
        resultsSection.classList.remove('hidden');
        renderSongGrid(filtered, songsContainer);
      });
    });

    // Visualizer modes
    document.querySelectorAll('.vis-mode[data-vis]').forEach(btn => {
      btn.addEventListener('click', () => Visualizer.setMode(btn.dataset.vis));
    });
    document.getElementById('btn-vis-fullscreen').addEventListener('click', toggleVisualizerFullscreen);

    // Mini player
    document.getElementById('btn-mini-player').addEventListener('click', toggleMiniPlayer);
    document.getElementById('mini-play').addEventListener('click', () => Player.togglePlay());
    document.getElementById('mini-prev').addEventListener('click', () => Player.prev());
    document.getElementById('mini-next').addEventListener('click', () => Player.next());
    document.getElementById('mini-expand').addEventListener('click', toggleMiniPlayer);

    // Fullscreen
    document.getElementById('btn-fullscreen').addEventListener('click', () => {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen();
      else document.exitFullscreen();
    });

    // Player callbacks
    Player.on('onPlay', onPlay);
    Player.on('onPause', onPause);
    Player.on('onSongChange', onSongChange);
    Player.on('onTimeUpdate', onTimeUpdate);

    // Listen time tracking
    listenInterval = setInterval(() => {
      if (Player.getState().isPlaying) {
        Analytics.addListenTime(1000);
      }
    }, 1000);
  }

  // ─── Player Callbacks ─────────────────────────────────────────
  function onPlay({ song, index }) {
    document.getElementById('btn-play').innerHTML = '<i class="fas fa-pause"></i>';
    document.getElementById('mini-play').innerHTML = '<i class="fas fa-pause"></i>';
    document.getElementById('vinyl-overlay').classList.add('spinning');
    Visualizer.start();
    highlightActivePlaylistItem(index);

    if (song) {
      Analytics.recordPlay(song);
      Playlist.addToRecent(song);
    }
  }

  function onPause() {
    document.getElementById('btn-play').innerHTML = '<i class="fas fa-play"></i>';
    document.getElementById('mini-play').innerHTML = '<i class="fas fa-play"></i>';
    document.getElementById('vinyl-overlay').classList.remove('spinning');
  }

  function onSongChange({ song, index }) {
    if (!song) return;
    document.getElementById('np-title').textContent = song.title;
    document.getElementById('np-artist').textContent = song.artist;
    document.getElementById('np-cover').src = song.cover;
    document.getElementById('mini-title').textContent = song.title;
    document.getElementById('mini-artist').textContent = song.artist;
    document.getElementById('mini-cover').src = song.cover;

    updateNowPlayingFav(Playlist.isFavorite(song.id));
    highlightActivePlaylistItem(index);
    highlightActiveSongCard(song.id);
    loadLyrics(song);

    document.title = `${song.title} - ${song.artist} | Auralis`;
  }

  function onTimeUpdate({ currentTime, duration, buffered }) {
    if (!duration) return;
    const pct = (currentTime / duration) * 100;
    document.getElementById('progress-fill').style.width = pct + '%';
    document.getElementById('progress-thumb').style.left = pct + '%';
    document.getElementById('mini-progress-fill').style.width = pct + '%';
    document.getElementById('np-current').textContent = formatTime(currentTime);
    document.getElementById('np-remaining').textContent = '-' + formatTime(duration - currentTime);

    if (buffered && buffered.length > 0) {
      const bufPct = (buffered.end(buffered.length - 1) / duration) * 100;
      document.getElementById('progress-buffered').style.width = bufPct + '%';
    }

    updateLyricsHighlight(currentTime);
  }

  // ─── Keyboard Shortcuts ───────────────────────────────────────
  function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          Player.togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          Player.prev();
          break;
        case 'ArrowRight':
          e.preventDefault();
          Player.next();
          break;
        case 'ArrowUp':
          e.preventDefault();
          Player.setVolume(Player.getVolume() + 0.05);
          updateVolumeSlider();
          break;
        case 'ArrowDown':
          e.preventDefault();
          Player.setVolume(Player.getVolume() - 0.05);
          updateVolumeSlider();
          break;
        case 'KeyM':
          Player.mute();
          updateVolumeUI();
          break;
        case 'KeyS':
          document.getElementById('btn-shuffle').click();
          break;
        case 'KeyR':
          document.getElementById('btn-repeat').click();
          break;
      }
    });
  }

  // ─── UI Helpers ───────────────────────────────────────────────
  function switchView(view) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const target = document.getElementById('view-' + view);
    if (target) target.classList.add('active');
    const navBtn = document.querySelector(`[data-view="${view}"]`);
    if (navBtn) navBtn.classList.add('active');

    if (view === 'visualizer') Visualizer.start();
    if (view === 'analytics') updateAnalyticsView();
    if (view === 'favorites') renderFavoritesView();
    if (view === 'recent') renderRecentView();

    document.getElementById('sidebar').classList.remove('open');
  }

  function highlightActivePlaylistItem(index) {
    document.querySelectorAll('.playlist-item').forEach((el, i) => {
      el.classList.toggle('active', i === index);
    });
    const active = document.querySelector('.playlist-item.active');
    if (active) active.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function highlightActiveSongCard(songId) {
    document.querySelectorAll('.song-card').forEach(card => {
      card.classList.toggle('playing', parseInt(card.dataset.id) === songId);
    });
  }

  function updateNowPlayingFav(isFav) {
    const btn = document.querySelector('#np-fav .btn-icon') || document.getElementById('np-fav');
    if (isFav) {
      btn.classList.add('favorited');
      btn.innerHTML = '<i class="fas fa-heart"></i>';
    } else {
      btn.classList.remove('favorited');
      btn.innerHTML = '<i class="far fa-heart"></i>';
    }
  }

  function updateVolumeUI() {
    const muted = Player.isMuted();
    const vol = Player.getVolume();
    const icon = muted || vol === 0 ? 'fa-volume-mute' : vol < 0.5 ? 'fa-volume-down' : 'fa-volume-up';
    document.getElementById('btn-mute').innerHTML = `<i class="fas ${icon}"></i>`;
  }

  function updateVolumeSlider() {
    document.getElementById('volume-slider').value = Player.getVolume() * 100;
    updateVolumeUI();
  }

  function updateFavoritesCount() {
    const count = Playlist.getFavorites().length;
    document.getElementById('fav-count').textContent = count;
    document.getElementById('fav-subtitle').textContent = count + ' songs';
  }

  function updateGreeting() {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening';
    document.getElementById('greeting-time').textContent = greeting;
  }

  function updateSidebarStats() {
    document.getElementById('sidebar-song-count').textContent = allSongs.length + ' songs';
    const totalDur = allSongs.reduce((sum, s) => sum + (s.duration || 0), 0);
    document.getElementById('sidebar-playlist-duration').textContent = formatTime(totalDur);
  }

  function updateAnalyticsView() {
    const stats = Analytics.getStats();
    const songs = Player.getSongs();
    document.getElementById('stat-total-plays').textContent = stats.totalPlays;
    document.getElementById('stat-listen-time').textContent = stats.listenTime;
    document.getElementById('stat-fav-count').textContent = Playlist.getFavorites().length;
    document.getElementById('stat-total-songs').textContent = allSongs.length;
    document.getElementById('stat-fav-genre').textContent = stats.favoriteGenre || '-';

    const mostPlayed = Analytics.getMostPlayed(songs);
    document.getElementById('stat-most-played').textContent = mostPlayed ? mostPlayed.title : '-';

    const dailyData = Analytics.getDailyData();
    const maxVal = Math.max(...dailyData.map(d => d.value), 1);
    const chart = document.getElementById('daily-chart');
    chart.innerHTML = dailyData.map(d => {
      const h = Math.max(4, (d.value / maxVal) * 100);
      return `<div class="chart-bar" style="height:${h}%" data-label="${d.label}"></div>`;
    }).join('');
  }

  function renderFavoritesView() {
    const favIds = Playlist.getFavorites();
    const favSongs = allSongs.filter(s => favIds.includes(s.id));
    const grid = document.getElementById('favorites-grid');
    if (favSongs.length === 0) {
      grid.innerHTML = '<div class="empty-state"><i class="fas fa-heart-broken"></i><p>No favorites yet</p><span>Click the heart icon on any song to add it here</span></div>';
      return;
    }
    renderSongGrid(favSongs, grid);
  }

  function renderRecentView() {
    const recentData = Playlist.getRecent();
    const list = document.getElementById('recent-list');
    if (recentData.length === 0) {
      list.innerHTML = '<div class="empty-state"><i class="fas fa-history"></i><p>No listening history yet</p><span>Start playing music to see your history here</span></div>';
      return;
    }
    list.innerHTML = recentData.slice(0, 20).map(r => {
      const song = allSongs.find(s => s.id === r.id);
      if (!song) return '';
      const ago = timeAgo(r.timestamp);
      return `
        <div class="recent-item" data-index="${allSongs.indexOf(song)}">
          <img class="recent-item-cover" src="${song.cover}" alt="">
          <div class="recent-item-info">
            <div class="recent-item-title">${song.title}</div>
            <div class="recent-item-artist">${song.artist}</div>
          </div>
          <span class="recent-item-time">${ago}</span>
        </div>
      `;
    }).join('');

    list.querySelectorAll('.recent-item').forEach(item => {
      item.addEventListener('click', () => {
        Player.play(parseInt(item.dataset.index));
      });
    });
  }

  function renderQueue() {
    const queueList = document.getElementById('queue-list');
    const state = Player.getState();
    const upcoming = allSongs.slice(state.currentIndex + 1);
    if (upcoming.length === 0) {
      queueList.innerHTML = '<div class="empty-state" style="padding:20px"><p>Queue is empty</p></div>';
      return;
    }
    queueList.innerHTML = upcoming.slice(0, 15).map((song, i) => `
      <div class="playlist-item" data-index="${state.currentIndex + 1 + i}">
        <img class="playlist-item-cover" src="${song.cover}" alt="">
        <div class="playlist-item-info">
          <div class="playlist-item-title">${song.title}</div>
          <div class="playlist-item-artist">${song.artist}</div>
        </div>
      </div>
    `).join('');
    queueList.querySelectorAll('.playlist-item').forEach(item => {
      item.addEventListener('click', () => Player.play(parseInt(item.dataset.index)));
    });
  }

  // ─── Lyrics ───────────────────────────────────────────────────
  let currentLyrics = [];

  async function loadLyrics(song) {
    document.getElementById('lyrics-song-title').textContent = song.title;
    document.getElementById('lyrics-song-artist').textContent = song.artist;
    const body = document.getElementById('lyrics-body');

    try {
      const res = await fetch(song.lyrics);
      const text = await res.text();
      currentLyrics = parseLyrics(text);
      body.innerHTML = currentLyrics.map((line, i) =>
        `<div class="lyrics-line" data-time="${line.time}" data-index="${i}">${line.text || '♪'}</div>`
      ).join('');
    } catch (e) {
      currentLyrics = [];
      body.innerHTML = '<div class="empty-state"><i class="fas fa-microphone-alt"></i><p>No lyrics available</p></div>';
    }
  }

  function parseLyrics(text) {
    const lines = text.split('\n');
    return lines.map(line => {
      const match = line.match(/\[(\d{2}):(\d{2})\.(\d{2})\]\s*(.*)/);
      if (match) {
        const time = parseInt(match[1]) * 60 + parseInt(match[2]) + parseInt(match[3]) / 100;
        return { time, text: match[4] };
      }
      return null;
    }).filter(Boolean);
  }

  function updateLyricsHighlight(currentTime) {
    if (currentLyrics.length === 0) return;
    let activeIdx = 0;
    for (let i = 0; i < currentLyrics.length; i++) {
      if (currentLyrics[i].time <= currentTime) activeIdx = i;
    }
    document.querySelectorAll('.lyrics-line').forEach((el, i) => {
      el.classList.toggle('active', i === activeIdx);
    });
    const activeLine = document.querySelector('.lyrics-line.active');
    if (activeLine) activeLine.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // ─── Upload System ────────────────────────────────────────────
  function setupUpload() {
    const zone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('file-input');

    zone.addEventListener('click', () => fileInput.click());
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('dragover');
      handleFiles(e.dataTransfer.files);
    });
    fileInput.addEventListener('change', () => handleFiles(fileInput.files));
  }

  function handleFiles(files) {
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('audio/')) return;
      const url = URL.createObjectURL(file);
      const song = {
        id: Date.now() + Math.random(),
        title: file.name.replace(/\.[^.]+$/, ''),
        artist: 'Unknown Artist',
        album: 'Uploaded',
        genre: 'Other',
        mood: 'chill',
        duration: 0,
        src: url,
        cover: 'assets/covers/cover1.svg',
        lyrics: '',
        isLocal: true,
      };

      const tempAudio = new Audio(url);
      tempAudio.addEventListener('loadedmetadata', () => {
        song.duration = Math.floor(tempAudio.duration);
        Playlist.addUserSong(song);
        allSongs.push(song);
        Player.setSongs(allSongs);
        renderSongGrid(allSongs);
        renderPlaylist(allSongs);
        updateSidebarStats();
        toast(`Added "${song.title}"`, 'success');
      });
    });
    closeModal('upload-modal');
  }

  // ─── Sleep Timer ──────────────────────────────────────────────
  function setupSleepTimer() {
    document.querySelectorAll('.sleep-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const min = parseInt(btn.dataset.minutes);
        Player.setSleepTimer(min);
        showSleepActive();
        toast(`Sleep timer set for ${min} minutes`, 'info');
      });
    });

    document.getElementById('sleep-custom-btn').addEventListener('click', () => {
      const val = parseInt(document.getElementById('sleep-custom-input').value);
      if (val > 0) {
        Player.setSleepTimer(val);
        showSleepActive();
        toast(`Sleep timer set for ${val} minutes`, 'info');
      }
    });

    document.getElementById('sleep-cancel').addEventListener('click', () => {
      Player.clearSleepTimer();
      document.getElementById('sleep-active').classList.add('hidden');
      toast('Sleep timer cancelled', 'info');
    });
  }

  function showSleepActive() {
    document.getElementById('sleep-active').classList.remove('hidden');
    updateSleepDisplay();
  }

  function updateSleepDisplay() {
    const remaining = Player.getSleepRemaining();
    if (remaining === null) return;
    const mins = Math.ceil(remaining / 60000);
    document.getElementById('sleep-remaining').textContent = mins + ' min';
    if (remaining > 0) setTimeout(updateSleepDisplay, 10000);
  }

  // ─── Mini Player ──────────────────────────────────────────────
  let miniPlayerActive = false;

  function toggleMiniPlayer() {
    miniPlayerActive = !miniPlayerActive;
    document.getElementById('mini-player').classList.toggle('hidden', !miniPlayerActive);
    document.getElementById('now-playing-bar').style.display = miniPlayerActive ? 'none' : '';
  }

  // ─── Visualizer Fullscreen ────────────────────────────────────
  function toggleVisualizerFullscreen() {
    const container = document.getElementById('visualizer-container');
    container.classList.toggle('visualizer-fullscreen');
    Visualizer.resize();
  }

  // ─── Particles & Floating Notes ──────────────────────────────
  function setupParticles() {
    const canvas = document.getElementById('particle-canvas');
    const ctx = canvas.getContext('2d');
    let particles = [];

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.5 + 0.1,
      });
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const primary = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = primary;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      requestAnimationFrame(animate);
    }
    animate();
  }

  function setupFloatingNotes() {
    const container = document.getElementById('floating-notes');
    const notes = ['♪', '♫', '♬', '♩', '🎵', '🎶'];
    for (let i = 0; i < 8; i++) {
      const note = document.createElement('span');
      note.className = 'floating-note';
      note.textContent = notes[i % notes.length];
      note.style.left = Math.random() * 100 + '%';
      note.style.animationDelay = Math.random() * 8 + 's';
      note.style.animationDuration = (6 + Math.random() * 4) + 's';
      container.appendChild(note);
    }
  }

  // ─── Utilities ────────────────────────────────────────────────
  function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const s = Math.floor(seconds);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m + ':' + (sec < 10 ? '0' : '') + sec;
  }

  function timeAgo(ts) {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return mins + 'm ago';
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + 'h ago';
    return Math.floor(hrs / 24) + 'd ago';
  }

  function openModal(id) {
    document.getElementById(id).classList.remove('hidden');
  }

  function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
  }

  function toast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i><span>${message}</span>`;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }

  // ─── Start ────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', init);
})();
