const Player = (() => {
  let audio = new Audio();
  audio.crossOrigin = 'anonymous';
  let songs = [];
  let currentIndex = -1;
  let isPlaying = false;
  let repeatMode = 'none'; // none, one, all
  let shuffleOn = false;
  let shuffleHistory = [];
  let playbackSpeed = 1;
  const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
  let sleepTimer = null;
  let sleepEnd = null;
  let audioContext = null;
  let sourceNode = null;
  let analyserNode = null;
  let gainNode = null;
  let eqFilters = [];
  let isAudioContextSetup = false;

  const callbacks = {
    onPlay: [],
    onPause: [],
    onSongChange: [],
    onTimeUpdate: [],
    onEnded: [],
    onVolumeChange: [],
  };

  function on(event, cb) {
    if (callbacks[event]) callbacks[event].push(cb);
  }

  function emit(event, data) {
    (callbacks[event] || []).forEach(cb => cb(data));
  }

  function setupAudioContext() {
    if (isAudioContextSetup) return;
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      sourceNode = audioContext.createMediaElementSource(audio);
      analyserNode = audioContext.createAnalyser();
      analyserNode.fftSize = 2048;
      gainNode = audioContext.createGain();

      const frequencies = [60, 170, 310, 600, 1000, 3000, 6000, 12000];
      eqFilters = frequencies.map((freq, i) => {
        const filter = audioContext.createBiquadFilter();
        filter.type = i === 0 ? 'lowshelf' : i === frequencies.length - 1 ? 'highshelf' : 'peaking';
        filter.frequency.value = freq;
        filter.gain.value = 0;
        filter.Q.value = 1;
        return filter;
      });

      sourceNode.connect(eqFilters[0]);
      for (let i = 0; i < eqFilters.length - 1; i++) {
        eqFilters[i].connect(eqFilters[i + 1]);
      }
      eqFilters[eqFilters.length - 1].connect(analyserNode);
      analyserNode.connect(gainNode);
      gainNode.connect(audioContext.destination);

      isAudioContextSetup = true;
    } catch (e) {
      console.warn('Web Audio API not supported:', e);
    }
  }

  function setSongs(songList) {
    songs = songList;
  }

  function getSongs() { return songs; }

  function load(index) {
    if (index < 0 || index >= songs.length) return;
    currentIndex = index;
    const song = songs[index];
    
    if (song.src && song.src.startsWith('blob:')) {
      audio.removeAttribute('crossOrigin');
    } else {
      audio.crossOrigin = 'anonymous';
    }

    audio.src = song.src;
    audio.load();
    emit('onSongChange', { song, index });
  }

  async function play(index) {
    setupAudioContext();
    if (audioContext && audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    if (index !== undefined && index !== currentIndex) {
      load(index);
    } else if (currentIndex === -1 && songs.length > 0) {
      load(0);
    }

    try {
      await audio.play();
      isPlaying = true;
      emit('onPlay', { song: songs[currentIndex], index: currentIndex });
    } catch (e) {
      console.warn('Playback failed:', e);
    }
  }

  function pause() {
    audio.pause();
    isPlaying = false;
    emit('onPause', {});
  }

  function stop() {
    audio.pause();
    audio.currentTime = 0;
    isPlaying = false;
    emit('onPause', {});
  }

  function togglePlay() {
    if (isPlaying) pause();
    else play();
  }

  function next() {
    if (songs.length === 0) return;
    if (shuffleOn) {
      const available = songs.map((_, i) => i).filter(i => i !== currentIndex);
      if (available.length === 0) return;
      const rand = available[Math.floor(Math.random() * available.length)];
      shuffleHistory.push(currentIndex);
      play(rand);
    } else {
      const nextIdx = (currentIndex + 1) % songs.length;
      play(nextIdx);
    }
  }

  function prev() {
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    if (shuffleOn && shuffleHistory.length > 0) {
      play(shuffleHistory.pop());
    } else {
      const prevIdx = (currentIndex - 1 + songs.length) % songs.length;
      play(prevIdx);
    }
  }

  function seekTo(time) {
    if (!isNaN(audio.duration)) {
      audio.currentTime = Math.max(0, Math.min(time, audio.duration));
    }
  }

  function seekForward(sec = 10) {
    seekTo(audio.currentTime + sec);
  }

  function seekBackward(sec = 10) {
    seekTo(audio.currentTime - sec);
  }

  function setVolume(val) {
    const v = Math.max(0, Math.min(1, val));
    audio.volume = v;
    emit('onVolumeChange', v);
  }

  function getVolume() { return audio.volume; }

  function mute() {
    audio.muted = !audio.muted;
    emit('onVolumeChange', audio.muted ? 0 : audio.volume);
  }

  function isMuted() { return audio.muted; }

  function toggleShuffle() {
    shuffleOn = !shuffleOn;
    shuffleHistory = [];
    return shuffleOn;
  }

  function toggleRepeat() {
    const modes = ['none', 'all', 'one'];
    repeatMode = modes[(modes.indexOf(repeatMode) + 1) % modes.length];
    return repeatMode;
  }

  function cycleSpeed() {
    const idx = speeds.indexOf(playbackSpeed);
    playbackSpeed = speeds[(idx + 1) % speeds.length];
    audio.playbackRate = playbackSpeed;
    return playbackSpeed;
  }

  function getState() {
    return {
      isPlaying,
      currentIndex,
      currentSong: songs[currentIndex] || null,
      currentTime: audio.currentTime,
      duration: audio.duration || 0,
      volume: audio.volume,
      muted: audio.muted,
      shuffle: shuffleOn,
      repeat: repeatMode,
      speed: playbackSpeed,
    };
  }

  function getAnalyser() { return analyserNode; }
  function getAudioContext() { return audioContext; }
  function getEqFilters() { return eqFilters; }
  function getAudioElement() { return audio; }

  function setSleepTimer(minutes) {
    clearSleepTimer();
    const ms = minutes * 60 * 1000;
    sleepEnd = Date.now() + ms;
    sleepTimer = setTimeout(() => {
      pause();
      sleepEnd = null;
      sleepTimer = null;
    }, ms);
  }

  function clearSleepTimer() {
    if (sleepTimer) clearTimeout(sleepTimer);
    sleepTimer = null;
    sleepEnd = null;
  }

  function getSleepRemaining() {
    if (!sleepEnd) return null;
    return Math.max(0, sleepEnd - Date.now());
  }

  audio.addEventListener('timeupdate', () => {
    emit('onTimeUpdate', {
      currentTime: audio.currentTime,
      duration: audio.duration || 0,
      buffered: audio.buffered,
    });
  });

  audio.addEventListener('ended', () => {
    emit('onEnded', {});
    if (repeatMode === 'one') {
      audio.currentTime = 0;
      audio.play();
    } else if (repeatMode === 'all' || currentIndex < songs.length - 1) {
      next();
    } else {
      isPlaying = false;
      emit('onPause', {});
    }
  });

  function saveState() {
    const state = {
      index: currentIndex,
      time: audio.currentTime,
      volume: audio.volume,
      shuffle: shuffleOn,
      repeat: repeatMode,
      speed: playbackSpeed,
    };
    localStorage.setItem('auralis-player-state', JSON.stringify(state));
  }

  function restoreState() {
    try {
      const saved = JSON.parse(localStorage.getItem('auralis-player-state'));
      if (saved && songs.length > 0) {
        if (saved.volume !== undefined) setVolume(saved.volume);
        if (saved.shuffle) shuffleOn = saved.shuffle;
        if (saved.repeat) repeatMode = saved.repeat;
        if (saved.speed) {
          playbackSpeed = saved.speed;
          audio.playbackRate = playbackSpeed;
        }
        if (saved.index >= 0 && saved.index < songs.length) {
          load(saved.index);
          if (saved.time) audio.currentTime = saved.time;
        }
      }
    } catch (e) {}
  }

  setInterval(saveState, 5000);

  return {
    setSongs, getSongs, load, play, pause, stop, togglePlay,
    next, prev, seekTo, seekForward, seekBackward,
    setVolume, getVolume, mute, isMuted,
    toggleShuffle, toggleRepeat, cycleSpeed,
    getState, getAnalyser, getAudioContext, getEqFilters, getAudioElement,
    setSleepTimer, clearSleepTimer, getSleepRemaining,
    saveState, restoreState, on, setupAudioContext,
  };
})();
