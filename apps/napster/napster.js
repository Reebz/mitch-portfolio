/* === Napster v2.0 BETA 7 — placeholder data & builders === */

var NAPSTER_TRACKS = [];
for (var i = 1; i <= 30; i++) {
  var users = ['cooldude99','grunge_kid','mp3_queen','napster_fan','music_pirate','dial_up_joe',
               'cable_surfer','dsl_dude','punk_rocker','rave_master'];
  var connections = ['56K','56K','Cable','DSL','Cable','56K','T1','DSL','Cable','T3'];
  var sizes = ['3.2','4.1','3.8','5.2','4.5','3.6','4.8','3.4','4.2','3.9'];
  NAPSTER_TRACKS.push({
    artist: 'Artist ' + i,
    song: 'Track ' + String.fromCharCode(64 + ((i - 1) % 26) + 1),
    size: sizes[i % 10] + ' MB',
    bitrate: (i % 3 === 0) ? '192' : '128',
    user: users[i % 10],
    connection: connections[i % 10],
    url: 'https://www.youtube.com/results?search_query=Artist+' + i
  });
}

function buildNapsterSearchResults() {
  var html = '';
  NAPSTER_TRACKS.forEach(function(t) {
    html += '<tr class="napster-row" data-url="' + t.url + '">' +
      '<td>' + t.song + '</td>' +
      '<td>' + t.artist + '</td>' +
      '<td>' + t.size + '</td>' +
      '<td>' + t.bitrate + '</td>' +
      '<td>' + t.user + '</td>' +
      '<td>' + t.connection + '</td>' +
      '</tr>';
  });
  return html;
}

function buildNapsterTransfers() {
  var html = '';
  for (var i = 0; i < 4; i++) {
    var t = NAPSTER_TRACKS[i];
    var pct = [23, 67, 91, 45][i];
    var speed = ['4.2', '12.8', '1.1', '8.6'][i];
    var status = ['Downloading...', 'Downloading...', 'Downloading...', 'Remote Queued'][i];
    html += '<div class="napster-transfer">' +
      '<div class="napster-transfer-name">' + t.artist + ' - ' + t.song + '.mp3</div>' +
      '<div class="napster-transfer-bar"><div class="napster-transfer-fill" style="width:' + pct + '%"></div></div>' +
      '<div class="napster-transfer-info">' + speed + ' KB/s \u2014 ' + status + ' (' + pct + '%)</div>' +
      '</div>';
  }
  return html;
}
