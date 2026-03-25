;(function() {
  'use strict';

  // Skip boot on touch devices, reduced motion, hash deep links, or repeat visits
  var skipBoot = sessionStorage.getItem('booted') ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    window.matchMedia('(hover: none) and (pointer: coarse)').matches ||
    window.location.hash;

  if (skipBoot) return;

  // --- DOS beep via Web Audio API ---
  function dosBeep() {
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = 1000; // Classic POST beep frequency
      gain.gain.value = 0.08; // Quiet
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15); // Short beep
    } catch (e) { /* Audio not available, skip silently */ }
  }

  // Create boot overlay
  var overlay = document.createElement('div');
  overlay.id = 'boot-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:99999;background:#000;color:#c0c0c0;font-family:"Lucida Console","Courier New",monospace;font-size:13px;cursor:pointer;';
  overlay.setAttribute('role', 'status');
  overlay.setAttribute('aria-label', 'System startup');
  document.body.appendChild(overlay);

  // Hide desktop until boot completes
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

  function nextStage() {
    stage++;

    if (stage === 1) {
      // === BIOS POST Screen ===
      overlay.innerHTML =
        '<div style="padding:20px 40px;width:100%;line-height:1.6;">' +
          // Energy Star logo area (ASCII art style)
          '<div style="color:#00aa00;margin-bottom:16px;white-space:pre;font-size:11px;">' +
            '  ___________\n' +
            ' /  ENERGY   \\\n' +
            '|   ★ STAR    |\n' +
            ' \\___________/\n' +
          '</div>' +
          '<div style="color:#fff;font-size:14px;font-weight:bold;">Award Modular BIOS v4.51PG</div>' +
          '<div style="color:#fff;">Copyright (C) 1998 Award Software, Inc.</div>' +
          '<div style="margin-top:12px;" id="post-output"></div>' +
          '<div style="margin-top:16px;color:#808080;font-size:11px;">Press any key to skip...</div>' +
        '</div>';

      // Typewriter POST lines
      postLines = [
        { text: 'Intel Pentium II 233MHz Processor', color: '#fff', delay: 300 },
        { text: 'Memory Test: 32768K OK', color: '#fff', delay: 600 },
        { text: '', color: '', delay: 100 },
        { text: 'Award Plug and Play BIOS Extension v1.0A', color: '#fff', delay: 300 },
        { text: 'Detecting Primary IDE Master... QUANTUM FIREBALL 4.3GB', color: '#fff', delay: 400 },
        { text: 'Detecting Primary IDE Slave... CREATIVE CD-ROM 48X', color: '#fff', delay: 300 },
        { text: '', color: '', delay: 100 },
        { text: '3Dfx Voodoo2 8MB Detected', color: '#00aa00', delay: 300 },
        { text: 'SB16 Audio Blaster Detected at IRQ 5', color: '#fff', delay: 300 },
        { text: '', color: '', delay: 200 },
        { text: 'Press DEL to enter SETUP', color: '#808080', delay: 400 }
      ];
      lineIndex = 0;
      typeNextLine();
      return; // Don't set a timeout here — typeNextLine handles timing
    } else if (stage === 2) {
      // === POST beep ===
      dosBeep();
      // Brief black screen after beep
      overlay.innerHTML = '';
      timer = setTimeout(nextStage, 500);
    } else if (stage === 3) {
      // === Windows logo ===
      overlay.innerHTML =
        '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;">' +
          '<div style="margin-bottom:16px;">' +
            '<div style="display:inline-block;width:12px;height:12px;background:#ff0000;margin:2px;"></div>' +
            '<div style="display:inline-block;width:12px;height:12px;background:#00aa00;margin:2px;"></div>' +
            '<div style="display:inline-block;width:12px;height:12px;background:#0000ff;margin:2px;"></div>' +
            '<div style="display:inline-block;width:12px;height:12px;background:#ffcc00;margin:2px;"></div>' +
          '</div>' +
          '<div style="color:#fff;font-size:20px;font-weight:bold;letter-spacing:4px;">Portfolio 98</div>' +
          '<div style="color:#808080;font-size:11px;margin-top:12px;">Starting Portfolio 98...</div>' +
          '<div style="margin-top:24px;width:200px;height:16px;border:1px solid #808080;background:#000;">' +
            '<div id="boot-progress" style="height:100%;width:0%;background:#000080;transition:width 1.5s linear;"></div>' +
          '</div>' +
        '</div>';
      requestAnimationFrame(function() {
        var bar = document.getElementById('boot-progress');
        if (bar) bar.style.width = '100%';
      });
      timer = setTimeout(nextStage, 2000);
    } else {
      completeBoot();
    }
  }

  function typeNextLine() {
    if (stage !== 1) return; // Boot was skipped
    if (lineIndex >= postLines.length) {
      // All lines typed — move to next stage after a pause
      timer = setTimeout(nextStage, 800);
      return;
    }

    var line = postLines[lineIndex];
    var output = document.getElementById('post-output');
    if (output) {
      var div = document.createElement('div');
      if (line.text) {
        div.textContent = line.text;
        div.style.color = line.color;
      } else {
        div.innerHTML = '&nbsp;';
      }
      output.appendChild(div);
    }
    lineIndex++;
    timer = setTimeout(typeNextLine, line.delay);
  }

  function completeBoot() {
    clearTimeout(timer);
    sessionStorage.setItem('booted', '1');
    overlay.style.transition = 'opacity 0.3s';
    overlay.style.opacity = '0';
    if (desktop) desktop.style.visibility = '';
    if (taskbar) taskbar.style.visibility = '';
    if (startMenu) startMenu.style.visibility = '';
    setTimeout(function() {
      overlay.remove();
    }, 300);
  }

  // Skip on any click or keypress
  overlay.addEventListener('click', completeBoot);
  document.addEventListener('keydown', function onKey() {
    if (document.getElementById('boot-overlay')) {
      completeBoot();
      document.removeEventListener('keydown', onKey);
    }
  });

  // Start boot sequence
  nextStage();
})();
