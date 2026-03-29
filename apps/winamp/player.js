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
  var bar = document.getElementById('winamp-seek');
  if (bar) bar.value = Math.max(0, Math.min(1000, Math.floor(pct * 1000)));
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
  var items = document.querySelectorAll('#winamp-playlist-list .wa-pl-item');
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
    var dur = track.end - track.start;
    var m = Math.floor(dur / 60);
    var s = dur % 60;
    var timeStr = m + ':' + (s < 10 ? '0' : '') + s;
    html += '<div class="wa-pl-item' + (i === 0 ? ' active' : '') + '" data-index="' + i + '">' +
      '<span class="wa-pl-num">' + (i + 1) + '.</span>' +
      '<span class="wa-pl-name">' + track.title + '</span>' +
      '<span class="wa-pl-dur">' + timeStr + '</span>' +
      '</div>';
  });
  return html;
}

// Mini spectrum visualizer for the display area
function startWinampVis() {
  var canvas = document.getElementById('winamp-vis');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var W = canvas.width, H = canvas.height;
  var bars = 20;
  var barW = Math.floor(W / bars);
  var heights = [];
  for (var i = 0; i < bars; i++) heights[i] = Math.random() * H * 0.3;

  // Spectrum colors — fire gradient like real Winamp (bottom=green, top=red/orange)
  var colors = [
    '#18A800', '#29BE10', '#5BDE29', '#8DE229',
    '#C6DA18', '#D6B210', '#D69000', '#D66E00',
    '#D64E00', '#EF3110'
  ];

  function draw() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    for (var i = 0; i < bars; i++) {
      // Animate heights
      var target = (Math.sin(Date.now() * 0.003 + i * 0.5) + 1) * 0.35 * H +
                   (Math.sin(Date.now() * 0.007 + i * 1.2) + 1) * 0.15 * H;
      heights[i] += (target - heights[i]) * 0.15;
      var h = Math.max(1, Math.floor(heights[i]));
      // Draw bar segments
      var segments = Math.ceil(h / 2);
      for (var s = 0; s < segments; s++) {
        var y = H - 1 - s * 2;
        var colorIdx = Math.min(colors.length - 1, Math.floor(s / segments * colors.length));
        ctx.fillStyle = colors[colorIdx];
        ctx.fillRect(i * barW + 1, y, barW - 2, 1);
      }
    }
    canvas._rafId = requestAnimationFrame(draw);
  }
  draw();
}
