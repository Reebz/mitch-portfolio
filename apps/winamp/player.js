/* ============================================================
   Winamp 2 Player — YouTube IFrame API backend
   ============================================================ */

// Playlist data — 30 placeholder tracks
var WINAMP_PLAYLIST = [];
for (var i = 1; i <= 30; i++) {
  WINAMP_PLAYLIST.push({
    title: 'Artist ' + i + ' - Track ' + String.fromCharCode(64 + ((i - 1) % 26) + 1),
    videoId: 'dQw4w9WgXcQ', // placeholder — all point to same video
    start: 0,
    end: 60
  });
}

var winampPlayer = null;
var winampCurrentTrack = 0;
var winampSeekInterval = null;
var winampReady = false;

window.onWinampAPIReady = function() {
  // Called when YouTube API is ready — just set a flag
  winampReady = true;
};

function initWinampPlayer(containerId) {
  winampPlayer = new YT.Player(containerId, {
    height: '200',
    width: '200',
    videoId: WINAMP_PLAYLIST[0].videoId,
    playerVars: {
      start: WINAMP_PLAYLIST[0].start,
      end: WINAMP_PLAYLIST[0].end,
      controls: 0,
      disablekb: 1,
      modestbranding: 1
    },
    events: {
      onReady: function() { winampReady = true; },
      onStateChange: function(e) {
        if (e.data === YT.PlayerState.ENDED) {
          winampNext();
        }
        updateWinampUI();
      }
    }
  });
}

function winampPlay() {
  if (winampPlayer && winampReady) {
    winampPlayer.playVideo();
    startSeekUpdate();
  }
}

function winampPause() {
  if (winampPlayer) winampPlayer.pauseVideo();
  stopSeekUpdate();
}

function winampStop() {
  if (winampPlayer) {
    winampPlayer.stopVideo();
    stopSeekUpdate();
    updateTimeDisplay(0, 0);
  }
}

function winampNext() {
  winampCurrentTrack = (winampCurrentTrack + 1) % WINAMP_PLAYLIST.length;
  winampLoadTrack(winampCurrentTrack);
}

function winampPrev() {
  winampCurrentTrack = (winampCurrentTrack - 1 + WINAMP_PLAYLIST.length) % WINAMP_PLAYLIST.length;
  winampLoadTrack(winampCurrentTrack);
}

function winampLoadTrack(index) {
  var track = WINAMP_PLAYLIST[index];
  winampCurrentTrack = index;
  if (winampPlayer && winampReady) {
    winampPlayer.loadVideoById({
      videoId: track.videoId,
      startSeconds: track.start,
      endSeconds: track.end
    });
    startSeekUpdate();
  }
  updateWinampUI();
  highlightPlaylistTrack(index);
}

function startSeekUpdate() {
  stopSeekUpdate();
  winampSeekInterval = setInterval(function() {
    if (winampPlayer && winampPlayer.getCurrentTime) {
      var track = WINAMP_PLAYLIST[winampCurrentTrack];
      var current = winampPlayer.getCurrentTime() - track.start;
      var duration = track.end - track.start;
      updateTimeDisplay(current, duration);
      updateSeekbar(current / duration);
    }
  }, 500);
}

function stopSeekUpdate() {
  if (winampSeekInterval) { clearInterval(winampSeekInterval); winampSeekInterval = null; }
}

function updateTimeDisplay(current, duration) {
  var el = document.getElementById('winamp-time');
  if (!el) return;
  var m = Math.floor(current / 60);
  var s = Math.floor(current % 60);
  el.textContent = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
}

function updateSeekbar(pct) {
  var bar = document.getElementById('winamp-seek-fill');
  if (bar) bar.style.width = Math.max(0, Math.min(100, pct * 100)) + '%';
}

function updateWinampUI() {
  var titleEl = document.getElementById('winamp-title');
  if (titleEl) titleEl.textContent = (winampCurrentTrack + 1) + '. ' + WINAMP_PLAYLIST[winampCurrentTrack].title;
  // Update play state indicator
  var stateEl = document.getElementById('winamp-play-state');
  if (stateEl && winampPlayer && winampPlayer.getPlayerState) {
    var s = winampPlayer.getPlayerState();
    if (s === 1) stateEl.innerHTML = '&#9654;';       // playing
    else if (s === 2) stateEl.innerHTML = '&#9646;&#9646;'; // paused
    else if (s === 0 || s === -1) stateEl.innerHTML = '&#9632;'; // stopped/unstarted
  }
}

function highlightPlaylistTrack(index) {
  var items = document.querySelectorAll('#winamp-playlist-list .winamp-pl-item');
  items.forEach(function(item, i) {
    item.classList.toggle('active', i === index);
  });
  // Auto-scroll active track into view
  if (items[index]) {
    items[index].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

function buildPlaylistHTML() {
  var html = '';
  WINAMP_PLAYLIST.forEach(function(track, i) {
    html += '<div class="winamp-pl-item' + (i === 0 ? ' active' : '') + '" data-index="' + i + '">' +
      (i + 1) + '. ' + track.title + '</div>';
  });
  return html;
}
