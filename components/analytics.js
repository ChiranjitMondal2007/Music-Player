const Analytics = (() => {
  let data = JSON.parse(localStorage.getItem('auralis-analytics') || 'null') || {
    totalPlays: 0,
    listenTimeMs: 0,
    playCounts: {},
    genreCounts: {},
    dailyListening: {},
  };

  function save() {
    localStorage.setItem('auralis-analytics', JSON.stringify(data));
  }

  function recordPlay(song) {
    data.totalPlays++;
    data.playCounts[song.id] = (data.playCounts[song.id] || 0) + 1;
    data.genreCounts[song.genre] = (data.genreCounts[song.genre] || 0) + 1;
    save();
  }

  function addListenTime(ms) {
    data.listenTimeMs += ms;
    const today = new Date().toISOString().slice(0, 10);
    data.dailyListening[today] = (data.dailyListening[today] || 0) + ms;
    save();
  }

  function getMostPlayed(songs) {
    let maxId = null, maxCount = 0;
    for (const [id, count] of Object.entries(data.playCounts)) {
      if (count > maxCount) {
        maxCount = count;
        maxId = parseInt(id);
      }
    }
    return songs.find(s => s.id === maxId) || null;
  }

  function getFavoriteGenre() {
    let maxGenre = null, maxCount = 0;
    for (const [genre, count] of Object.entries(data.genreCounts)) {
      if (count > maxCount) {
        maxCount = count;
        maxGenre = genre;
      }
    }
    return maxGenre;
  }

  function getListenTimeFormatted() {
    const mins = Math.floor(data.listenTimeMs / 60000);
    if (mins < 60) return mins + 'm';
    const hrs = Math.floor(mins / 60);
    return hrs + 'h ' + (mins % 60) + 'm';
  }

  function getDailyData() {
    const days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      days.push({
        label: dayNames[d.getDay()],
        value: data.dailyListening[key] || 0,
      });
    }
    return days;
  }

  function getPlayCount(songId) {
    return data.playCounts[songId] || 0;
  }

  function getStats() {
    return {
      totalPlays: data.totalPlays,
      listenTime: getListenTimeFormatted(),
      listenTimeMs: data.listenTimeMs,
      favoriteGenre: getFavoriteGenre(),
    };
  }

  return {
    recordPlay, addListenTime, getMostPlayed, getFavoriteGenre,
    getListenTimeFormatted, getDailyData, getPlayCount, getStats, save,
  };
})();
