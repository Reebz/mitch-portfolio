;(function() {
  'use strict';

  // Skip boot on touch devices, reduced motion, hash deep links, or repeat visits
  if (sessionStorage.getItem('booted') ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      window.matchMedia('(hover: none) and (pointer: coarse)').matches ||
      window.location.hash) return;

  // --- BIOS Color Attributes (CGA 16-color palette) ---
  var C = {
    BLACK:   '#000000', BLUE:    '#0000AA', GREEN:   '#00AA00', CYAN:    '#00AAAA',
    RED:     '#AA0000', MAGENTA: '#AA00AA', BROWN:   '#AA5500', LGRAY:   '#AAAAAA',
    DGRAY:   '#555555', LBLUE:   '#5555FF', LGREEN:  '#55FF55', LCYAN:   '#55FFFF',
    LRED:    '#FF5555', LMAGENTA:'#FF55FF', YELLOW:  '#FFFF55', WHITE:   '#FFFFFF'
  };

  // --- DOS Beep ---
  function dosBeep() {
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = 1000;
      gain.gain.value = 0.06;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {}
  }

  // --- Create overlay ---
  var overlay = document.createElement('div');
  overlay.id = 'boot-overlay';
  overlay.style.cssText =
    'position:fixed;top:0;left:0;width:100%;height:100%;z-index:99999;' +
    'background:' + C.BLUE + ';color:' + C.LGRAY + ';' +
    'font-family:"Perfect DOS VGA 437","Lucida Console","Courier New",monospace;' +
    'font-size:16px;line-height:1.4;cursor:default;overflow:hidden;padding:0;margin:0;';
  overlay.setAttribute('role', 'status');
  overlay.setAttribute('aria-label', 'System startup');
  document.body.appendChild(overlay);

  // Hide desktop
  var desktop = document.getElementById('desktop');
  var taskbar = document.getElementById('taskbar');
  var startMenu = document.getElementById('start-menu');
  if (desktop) desktop.style.visibility = 'hidden';
  if (taskbar) taskbar.style.visibility = 'hidden';
  if (startMenu) startMenu.style.visibility = 'hidden';

  var stage = 0;
  var timer;
  var postLines;
  var lineIndex;
  var outputEl;

  // --- Helpers ---
  function span(text, color) {
    return '<span style="color:' + color + '">' + text + '</span>';
  }

  function addLine(text, color) {
    if (!outputEl) return;
    var div = document.createElement('div');
    if (color) {
      div.innerHTML = text; // already has spans
    } else {
      div.textContent = text;
    }
    if (color === true) {
      div.innerHTML = text;
    }
    outputEl.appendChild(div);
  }

  // --- Stages ---
  function nextStage() {
    stage++;

    if (stage === 1) {
      // =============== POST SCREEN ===============
      overlay.style.background = C.BLUE;
      overlay.innerHTML =
        '<div style="position:relative;padding:16px 24px;height:100%;box-sizing:border-box;">' +
          // Energy Star logo top-right
          '<div style="position:absolute;top:12px;right:24px;text-align:center;">' +
            '<div style="color:' + C.LGREEN + ';font-size:12px;white-space:pre;line-height:1.2;">' +
              '  ___________\n' +
              ' /           \\\n' +
              '|  ' + span('energy', C.YELLOW) + '    |\n' +
              '|    ' + span('\\u2605', C.YELLOW) + '       |\n' +
              '|   ' + span('STAR', C.YELLOW) + '     |\n' +
              ' \\___________/' +
            '</div>' +
            '<div style="color:' + C.LGREEN + ';font-size:10px;margin-top:2px;">EPA POLLUTION</div>' +
            '<div style="color:' + C.LGREEN + ';font-size:10px;">PREVENTER</div>' +
          '</div>' +
          '<div id="post-output" style="max-width:calc(100% - 180px);"></div>' +
        '</div>';

      outputEl = document.getElementById('post-output');

      // POST lines with typewriter timing
      postLines = [
        { html: span('Award Modular BIOS v4.51PG', C.WHITE) + ', An Energy Star Ally', delay: 300 },
        { html: 'Copyright (C) 1984-98, Award Software, Inc.', delay: 400 },
        { html: '', delay: 200 },
        { html: span('PENTIUM II CPU at 233 MHz', C.WHITE) + '         , Host Bus  66MHz', delay: 500 },
        { html: 'Memory Test :   ' + span('32768K OK', C.WHITE), delay: 700 },
        { html: '', delay: 200 },
        { html: 'Award Plug and Play BIOS Extension v1.0A', delay: 300 },
        { html: 'Copyright (C) 1998, Award Software, Inc.', delay: 300 },
        { html: '  Detecting IDE Primary Master   ... ' + span('QUANTUM FIREBALL 4.3GB', C.WHITE), delay: 400 },
        { html: '  Detecting IDE Primary Slave    ... ' + span('CREATIVE 24X CD-ROM', C.WHITE), delay: 400 },
        { html: '  Detecting IDE Secondary Master ... None', delay: 300 },
        { html: '  Detecting IDE Secondary Slave  ... None', delay: 300 },
        { html: '', delay: 200 },
        { html: 'PCI device listing:', delay: 300 },
        { html: '  3Dfx Interactive - ' + span('Creative Labs 3D Blaster Voodoo2 8MB', C.WHITE), delay: 400 },
        { html: '  Creative Labs ' + span('Sound Blaster 16', C.WHITE) + ' at IRQ 5', delay: 400 },
        { html: '', delay: 300 },
        { html: '', delay: 200 },
        { html: 'Press ' + span('F1', C.WHITE) + ' to continue, ' + span('DEL', C.WHITE) + ' to enter SETUP', delay: 0 }
      ];
      lineIndex = 0;
      typeNextLine();
      return;

    } else if (stage === 2) {
      // =============== POST BEEP + BLACK SCREEN ===============
      dosBeep();
      overlay.innerHTML = '';
      overlay.style.background = C.BLACK;
      timer = setTimeout(nextStage, 600);

    } else if (stage === 3) {
      // =============== WINDOWS 98 LOGO ===============
      overlay.style.background = C.BLACK;
      overlay.innerHTML =
        '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;">' +
          '<div style="margin-bottom:20px;">' +
            '<span style="display:inline-block;width:16px;height:16px;background:#FF0000;margin:2px;"></span>' +
            '<span style="display:inline-block;width:16px;height:16px;background:#00AA00;margin:2px;"></span>' +
            '<span style="display:inline-block;width:16px;height:16px;background:#0000FF;margin:2px;"></span>' +
            '<span style="display:inline-block;width:16px;height:16px;background:#FFFF00;margin:2px;"></span>' +
          '</div>' +
          '<div style="color:' + C.WHITE + ';font-size:22px;font-weight:bold;letter-spacing:6px;font-family:\'Pixelated MS Sans Serif\',Arial,sans-serif;">Portfolio 98</div>' +
          '<div style="color:' + C.LGRAY + ';font-size:11px;margin-top:12px;font-family:\'Pixelated MS Sans Serif\',Arial,sans-serif;">Starting Portfolio 98...</div>' +
          '<div style="margin-top:28px;width:220px;height:18px;border:1px solid ' + C.DGRAY + ';background:' + C.BLACK + ';">' +
            '<div id="boot-progress" style="height:100%;width:0%;background:' + C.BLUE + ';transition:width 1.8s linear;"></div>' +
          '</div>' +
        '</div>';
      requestAnimationFrame(function() {
        var bar = document.getElementById('boot-progress');
        if (bar) bar.style.width = '100%';
      });
      timer = setTimeout(nextStage, 2200);

    } else {
      completeBoot();
    }
  }

  function typeNextLine() {
    if (stage !== 1) return;
    if (lineIndex >= postLines.length) {
      timer = setTimeout(nextStage, 1000);
      return;
    }

    var line = postLines[lineIndex];
    if (outputEl) {
      var div = document.createElement('div');
      if (line.html) {
        div.innerHTML = line.html;
      } else {
        div.innerHTML = '&nbsp;';
      }
      outputEl.appendChild(div);
    }
    lineIndex++;
    timer = setTimeout(typeNextLine, line.delay);
  }

  function completeBoot() {
    clearTimeout(timer);
    sessionStorage.setItem('booted', '1');
    overlay.style.transition = 'opacity 0.4s';
    overlay.style.opacity = '0';
    if (desktop) desktop.style.visibility = '';
    if (taskbar) taskbar.style.visibility = '';
    if (startMenu) startMenu.style.visibility = '';
    setTimeout(function() { overlay.remove(); }, 400);
  }

  // Skip on click or keypress
  overlay.addEventListener('click', completeBoot);
  document.addEventListener('keydown', function onKey() {
    if (document.getElementById('boot-overlay')) {
      completeBoot();
      document.removeEventListener('keydown', onKey);
    }
  });

  nextStage();
})();
