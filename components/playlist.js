const Playlist = (() => {
  let favorites = JSON.parse(localStorage.getItem('auralis-favorites') || '[]');
  let recentPlayed = JSON.parse(localStorage.getItem('auralis-recent') || '[]');
  let queue = [];
  let userSongs = JSON.parse(localStorage.getItem('auralis-user-songs') || '[]');

  function getFavorites() { return favorites; }
  function getRecent() { return recentPlayed; }
  function getQueue() { return queue; }

  function isFavorite(songId) {
    return favorites.includes(songId);
  }

  function toggleFavorite(songId) {
    const idx = favorites.indexOf(songId);
    if (idx >= 0) {
      favorites.splice(idx, 1);
    } else {
      favorites.push(songId);
    }
    localStorage.setItem('auralis-favorites', JSON.stringify(favorites));
    return isFavorite(songId);
  }

  function addToRecent(song) {
    recentPlayed = recentPlayed.filter(r => r.id !== song.id);
    recentPlayed.unshift({ id: song.id, timestamp: Date.now() });
    if (recentPlayed.length > 50) recentPlayed = recentPlayed.slice(0, 50);
    localStorage.setItem('auralis-recent', JSON.stringify(recentPlayed));
  }

  function setQueue(songList) {
    queue = [...songList];
  }

  function addToQueue(song) {
    queue.push(song);
  }

  function removeFromQueue(index) {
    queue.splice(index, 1);
  }

  function reorderQueue(fromIdx, toIdx) {
    const [item] = queue.splice(fromIdx, 1);
    queue.splice(toIdx, 0, item);
  }

  function clearQueue() {
    queue = [];
  }

  function addUserSong(songData) {
    userSongs.push(songData);
    localStorage.setItem('auralis-user-songs', JSON.stringify(userSongs));
    return songData;
  }

  function getUserSongs() { return userSongs; }

  function removeUserSong(id) {
    userSongs = userSongs.filter(s => s.id !== id);
    localStorage.setItem('auralis-user-songs', JSON.stringify(userSongs));
  }

  function getPlaylistStats(songs) {
    const totalDuration = songs.reduce((sum, s) => sum + (s.duration || 0), 0);
    const genres = {};
    songs.forEach(s => { genres[s.genre] = (genres[s.genre] || 0) + 1; });
    return {
      count: songs.length,
      totalDuration,
      genres,
    };
  }

  return {
    getFavorites, getRecent, getQueue, isFavorite, toggleFavorite,
    addToRecent, setQueue, addToQueue, removeFromQueue, reorderQueue,
    clearQueue, addUserSong, getUserSongs, removeUserSong, getPlaylistStats,
  };
})();
