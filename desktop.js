;(function() {
  'use strict';

  /* ============================================================
     desktop.js — Window management for Win98 portfolio
     ============================================================ */

  // --- Constants ---
  var TASKBAR_HEIGHT = 28;
  var MIN_WIN_SIZE = { w: 300, h: 200 };
  var INITIAL_VISITOR_COUNT = 3;
  var DBLCLICK_DELAY = 300;
  var Z_NORMALIZE_THRESHOLD = 1000;

  // --- Project Data ---
  var PROJECTS = [
    {
      id: 'always-draft',
      title: 'Always dRaft',
      description: 'Blog',
      tech: [],
      url: null,
      type: 'construction',
      screenshot: null,
      updated: '2026-03-26',
      icon: 'img/icons/blog.png'
    },
    {
      id: 'claude-battery',
      title: 'Claude Battery',
      description: 'AI tool',
      tech: [],
      url: 'http://claudebattery.com/',
      type: 'link',
      screenshot: null,
      updated: '2026-03-26',
      icon: 'img/icons/battery.png'
    },
    {
      id: 'avails-click',
      title: 'Avails Click',
      description: 'Coming soon',
      tech: [],
      url: null,
      type: 'construction',
      screenshot: null,
      updated: '2026-03-26',
      icon: 'img/icons/calendar.png'
    },
    {
      id: 'linkedin',
      title: 'LinkedIn',
      description: 'Professional profile',
      tech: [],
      url: 'https://www.linkedin.com/in/mitchribar/',
      type: 'link',
      screenshot: null,
      updated: '2026-03-26',
      icon: 'img/icons/linkedin.png'
    },
    {
      id: 'obsidian-game',
      title: 'Obsidian Game',
      description: 'Game project',
      tech: [],
      url: null,
      type: 'construction',
      screenshot: null,
      updated: '2026-03-26',
      icon: 'img/icons/game.png'
    },
    {
      id: 'microgram',
      title: 'Microgram',
      description: 'Coming soon',
      tech: [],
      url: null,
      type: 'construction',
      screenshot: null,
      updated: '2026-03-27',
      icon: 'img/icons/microgram.png'
    },
    {
      id: 'prototypist',
      title: 'Prototypist',
      description: 'Coming soon',
      tech: [],
      url: null,
      type: 'construction',
      screenshot: null,
      updated: '2026-03-27',
      icon: 'img/icons/prototypist.png'
    },
    {
      id: 'cavaro',
      title: 'Cavaro',
      description: 'Stealth mode',
      tech: [],
      url: null,
      type: 'cavaro',
      screenshot: null,
      updated: '2026-03-27',
      icon: 'img/icons/cavaro.png'
    },
    {
      id: 'snowball-dodge',
      title: 'Snowball Dodge',
      description: 'Coming soon',
      tech: [],
      url: null,
      type: 'construction',
      screenshot: null,
      updated: '2026-03-28',
      icon: 'img/icons/snowball.png'
    }
  ];

  // Non-project windows (hand-authored in HTML)
  var SYSTEM_WINDOWS = ['about', 'guestbook', 'contact', 'my-computer', 'recycle-bin', 'visitor-counter', 'clock', 'shutdown'];

  // All valid window IDs (for hash routing whitelist)
  var VALID_WINDOWS = new Set();

  // --- State ---
  var windows = new Map(); // id -> { state, prevRect, el, taskbarBtn }
  var zCounter = 10;
  var activeWindowId = null;
  var cascadeIndex = 0;
  var clickTimeouts = new Map(); // iconId -> timeout

  // --- DOM References (cached at init) ---
  var elDesktop, elIconGrid, elTaskbar, elTaskbarButtons;
  var elStartMenu, elStartButton, elSystemTray;
  var elClock, elVisitorCounter, elAnnouncer;
  var elMobileProjects;

  // --- Announcer ---
  function announce(message) {
    if (!elAnnouncer) return;
    elAnnouncer.textContent = '';
    requestAnimationFrame(function() {
      elAnnouncer.textContent = message;
    });
  }

  // --- Z-Index ---
  function bringToFront(windowId) {
    var win = windows.get(windowId);
    if (!win || !win.el) return;

    zCounter++;
    win.el.style.zIndex = zCounter;

    // Normalize if counter gets too high
    if (zCounter > Z_NORMALIZE_THRESHOLD) {
      normalizeZIndex();
    }

    // Update active/inactive visual states
    if (activeWindowId && activeWindowId !== windowId) {
      var prev = windows.get(activeWindowId);
      if (prev && prev.el) {
        var prevBar = prev.el.querySelector('.title-bar');
        if (prevBar) prevBar.classList.add('inactive');
      }
      // Update taskbar button
      if (prev && prev.taskbarBtn) {
        prev.taskbarBtn.setAttribute('aria-pressed', 'false');
      }
    }

    var bar = win.el.querySelector('.title-bar');
    if (bar) bar.classList.remove('inactive');
    if (win.taskbarBtn) {
      win.taskbarBtn.setAttribute('aria-pressed', 'true');
    }

    activeWindowId = windowId;
  }

  function normalizeZIndex() {
    var openWindows = [];
    windows.forEach(function(win, id) {
      if (win.state === 'open' || win.state === 'maximized') {
        openWindows.push({ id: id, z: parseInt(win.el.style.zIndex) || 0 });
      }
    });
    openWindows.sort(function(a, b) { return a.z - b.z; });
    openWindows.forEach(function(item, i) {
      var win = windows.get(item.id);
      win.el.style.zIndex = 10 + i;
    });
    zCounter = 10 + openWindows.length;
  }

  // --- Window Operations ---
  function openWindow(id) {
    var win = windows.get(id);
    if (!win) return;

    if (win.state === 'open' || win.state === 'maximized') {
      bringToFront(id);
      win.el.focus();
      return;
    }

    if (win.state === 'minimized') {
      restoreWindow(id);
      return;
    }

    // Position window (cascade from top-left, wrap at 10)
    var offset = 30 + (cascadeIndex * 22);
    cascadeIndex = (cascadeIndex + 1) % 10;
    win.el.style.left = offset + 'px';
    win.el.style.top = offset + 'px';
    win.el.style.width = '500px';
    win.el.style.transform = '';

    win.state = 'open';
    win.el.setAttribute('data-state', 'open');
    bringToFront(id);
    win.el.focus();

    // Create taskbar button
    createTaskbarButton(id, win);

    // Update hash
    updateHash(id);

    announce(getTitleText(win.el) + ' opened');
  }

  function closeWindow(id) {
    var win = windows.get(id);
    if (!win || win.state === 'closed') return;

    // Cavaro self-destruct: save dismissal and remove icon
    if (id === 'window-cavaro') {
      localStorage.setItem('cavaro-dismissed', Date.now());
      var cavaroIcon = elIconGrid.querySelector('[data-window-id="window-cavaro"]');
      if (cavaroIcon) cavaroIcon.remove();
    }

    // Stop analogue clock if closing the clock window
    if (id === 'window-clock') stopAnalogueClock();

    win.state = 'closed';
    win.el.setAttribute('data-state', 'closed');
    win.el.style.transform = '';
    // Reset any fixed positioning from system tray popups
    win.el.style.position = '';
    win.el.style.right = '';
    win.el.style.bottom = '';

    // Remove taskbar button
    if (win.taskbarBtn) {
      win.taskbarBtn.remove();
      win.taskbarBtn = null;
    }

    // Focus next window or desktop
    if (activeWindowId === id) {
      activeWindowId = null;
      focusNextWindow();
    }

    updateHash(activeWindowId);
    announce(getTitleText(win.el) + ' closed');
  }

  function minimizeWindow(id) {
    var win = windows.get(id);
    if (!win || win.state !== 'open' && win.state !== 'maximized') return;

    // Save position before minimize
    if (win.state === 'open') {
      win.prevRect = getWindowRect(win.el);
    }

    win.state = 'minimized';
    win.el.setAttribute('data-state', 'minimized');
    win.el.style.display = 'none';

    // Update taskbar button
    if (win.taskbarBtn) {
      win.taskbarBtn.setAttribute('aria-pressed', 'false');
    }

    if (activeWindowId === id) {
      activeWindowId = null;
      focusNextWindow();
    }

    announce(getTitleText(win.el) + ' minimized');
  }

  function restoreWindow(id) {
    var win = windows.get(id);
    if (!win) return;

    if (win.state === 'minimized') {
      win.state = 'open';
      win.el.setAttribute('data-state', 'open');
      win.el.style.display = '';

      if (win.prevRect) {
        win.el.style.left = win.prevRect.x + 'px';
        win.el.style.top = win.prevRect.y + 'px';
        win.el.style.width = win.prevRect.w + 'px';
        win.el.style.height = win.prevRect.h + 'px';
      }

      bringToFront(id);
      win.el.focus();
      announce(getTitleText(win.el) + ' restored');
    }
  }

  function toggleMaximize(id) {
    var win = windows.get(id);
    if (!win) return;

    if (win.state === 'maximized') {
      // Restore
      win.state = 'open';
      win.el.setAttribute('data-state', 'open');
      if (win.prevRect) {
        win.el.style.left = win.prevRect.x + 'px';
        win.el.style.top = win.prevRect.y + 'px';
        win.el.style.width = win.prevRect.w + 'px';
        win.el.style.height = win.prevRect.h + 'px';
      }
      announce(getTitleText(win.el) + ' restored');
    } else if (win.state === 'open') {
      // Save current rect then maximize
      win.prevRect = getWindowRect(win.el);
      win.state = 'maximized';
      win.el.setAttribute('data-state', 'maximized');
      announce(getTitleText(win.el) + ' maximized');
    }

    bringToFront(id);
  }

  function focusNextWindow() {
    var highest = null;
    var highestZ = -1;
    windows.forEach(function(win, id) {
      if ((win.state === 'open' || win.state === 'maximized') && win.el) {
        var z = parseInt(win.el.style.zIndex) || 0;
        if (z > highestZ) {
          highestZ = z;
          highest = id;
        }
      }
    });
    if (highest) {
      bringToFront(highest);
    }
  }

  // --- Taskbar Buttons ---
  function createTaskbarButton(id, win) {
    if (win.taskbarBtn) return;

    var btn = document.createElement('button');
    btn.className = 'taskbar-window-btn';
    btn.setAttribute('data-window-id', id);
    btn.setAttribute('aria-pressed', 'true');
    btn.textContent = getTitleText(win.el);
    elTaskbarButtons.appendChild(btn);
    win.taskbarBtn = btn;
  }

  // --- Drag System ---
  var dragState = {
    active: false,
    windowId: null,
    offsetX: 0,
    offsetY: 0,
    pendingX: 0,
    pendingY: 0,
    startX: 0,
    startY: 0,
    rafId: null,
    suppressClick: false
  };

  // --- Resize System ---
  var RESIZE_ZONE = 8; // px from edge to trigger resize
  var resizeState = {
    active: false,
    windowId: null,
    edge: null,    // 'n','ne','e','se','s','sw','w','nw'
    startRect: null, // { x, y, w, h }
    startX: 0,
    startY: 0,
    rafId: null
  };

  function getResizeEdge(e, winEl) {
    var rect = winEl.getBoundingClientRect();
    var z = getZoom();
    var x = e.clientX;
    var y = e.clientY;
    var nearL = x - rect.left < RESIZE_ZONE;
    var nearR = rect.right - x < RESIZE_ZONE;
    var nearT = y - rect.top < RESIZE_ZONE;
    var nearB = rect.bottom - y < RESIZE_ZONE;

    if (nearT && nearL) return 'nw';
    if (nearT && nearR) return 'ne';
    if (nearB && nearL) return 'sw';
    if (nearB && nearR) return 'se';
    if (nearT) return 'n';
    if (nearB) return 's';
    if (nearL) return 'w';
    if (nearR) return 'e';
    return null;
  }

  var EDGE_CURSORS = {
    n: 'n-resize', ne: 'ne-resize', e: 'e-resize', se: 'se-resize',
    s: 's-resize', sw: 'sw-resize', w: 'w-resize', nw: 'nw-resize'
  };

  function onResizeStart(e, windowId, edge) {
    var win = windows.get(windowId);
    if (!win || win.state === 'maximized') return;
    if (win.el.getAttribute('data-no-resize') === 'true') return;

    var z = getZoom();
    resizeState.active = true;
    resizeState.windowId = windowId;
    resizeState.edge = edge;
    resizeState.startX = e.clientX;
    resizeState.startY = e.clientY;
    resizeState.startRect = {
      x: parseInt(win.el.style.left) || 0,
      y: parseInt(win.el.style.top) || 0,
      w: win.el.offsetWidth / z,
      h: win.el.offsetHeight / z
    };

    // Disable pointer events on iframes during resize
    win.el.querySelectorAll('iframe').forEach(function(iframe) {
      iframe.style.pointerEvents = 'none';
    });

    e.target.setPointerCapture(e.pointerId);
    bringToFront(windowId);
  }

  function onResizeMove(e) {
    if (!resizeState.active) return;
    if (!e.target.hasPointerCapture(e.pointerId)) return;

    var z = getZoom();
    var dx = (e.clientX - resizeState.startX) / z;
    var dy = (e.clientY - resizeState.startY) / z;
    var sr = resizeState.startRect;
    var edge = resizeState.edge;

    var newX = sr.x, newY = sr.y, newW = sr.w, newH = sr.h;

    // East
    if (edge === 'e' || edge === 'ne' || edge === 'se') {
      newW = Math.max(MIN_WIN_SIZE.w, sr.w + dx);
    }
    // West
    if (edge === 'w' || edge === 'nw' || edge === 'sw') {
      var proposedW = sr.w - dx;
      if (proposedW >= MIN_WIN_SIZE.w) {
        newW = proposedW;
        newX = sr.x + dx;
      } else {
        newW = MIN_WIN_SIZE.w;
        newX = sr.x + (sr.w - MIN_WIN_SIZE.w);
      }
    }
    // South
    if (edge === 's' || edge === 'se' || edge === 'sw') {
      newH = Math.max(MIN_WIN_SIZE.h, sr.h + dy);
    }
    // North
    if (edge === 'n' || edge === 'ne' || edge === 'nw') {
      var proposedH = sr.h - dy;
      if (proposedH >= MIN_WIN_SIZE.h) {
        newH = proposedH;
        newY = sr.y + dy;
      } else {
        newH = MIN_WIN_SIZE.h;
        newY = sr.y + (sr.h - MIN_WIN_SIZE.h);
      }
    }

    if (!resizeState.rafId) {
      resizeState.rafId = requestAnimationFrame(function() {
        resizeState.rafId = null;
        var win = windows.get(resizeState.windowId);
        if (win && win.el) {
          win.el.style.left = newX + 'px';
          win.el.style.top = newY + 'px';
          win.el.style.width = newW + 'px';
          win.el.style.height = newH + 'px';
        }
      });
    }
  }

  function onResizeEnd(e) {
    if (!resizeState.active) return;
    var win = windows.get(resizeState.windowId);

    if (resizeState.rafId) {
      cancelAnimationFrame(resizeState.rafId);
      resizeState.rafId = null;
    }

    // Re-enable iframe pointer events
    if (win && win.el) {
      win.el.querySelectorAll('iframe').forEach(function(iframe) {
        iframe.style.pointerEvents = '';
      });
    }

    e.target.releasePointerCapture(e.pointerId);
    resizeState.active = false;
    resizeState.windowId = null;
    resizeState.edge = null;
  }

  function onDragStart(e, windowId) {
    var win = windows.get(windowId);
    if (!win || win.state === 'maximized') return;
    if (isMobile()) return;

    var rect = win.el.getBoundingClientRect();
    dragState.windowId = windowId;
    dragState.offsetX = e.clientX - rect.left;
    dragState.offsetY = e.clientY - rect.top;
    dragState.startX = e.clientX;
    dragState.startY = e.clientY;
    dragState.active = false;

    e.target.setPointerCapture(e.pointerId);
    bringToFront(windowId);
  }

  function onDragMove(e) {
    if (!dragState.windowId) return;
    if (!e.target.hasPointerCapture(e.pointerId)) return;

    var dx = e.clientX - dragState.startX;
    var dy = e.clientY - dragState.startY;

    // Drag threshold: 3px
    if (!dragState.active && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
      dragState.active = true;
      var win = windows.get(dragState.windowId);
      if (win) win.el.style.willChange = 'transform';
    }

    if (!dragState.active) return;

    var x = e.clientX - dragState.offsetX;
    var y = e.clientY - dragState.offsetY;

    // Constrain to viewport
    x = Math.max(0, Math.min(x, window.innerWidth - 100));
    y = Math.max(0, Math.min(y, window.innerHeight - TASKBAR_HEIGHT - 30));

    dragState.pendingX = x;
    dragState.pendingY = y;

    if (!dragState.rafId) {
      dragState.rafId = requestAnimationFrame(function() {
        dragState.rafId = null;
        var z = getZoom();
        var win = windows.get(dragState.windowId);
        if (win && win.el) {
          win.el.style.left = (dragState.pendingX / z) + 'px';
          win.el.style.top = (dragState.pendingY / z) + 'px';
        }
      });
    }
  }

  function onDragEnd(e) {
    if (!dragState.windowId) return;

    var win = windows.get(dragState.windowId);

    if (dragState.rafId) {
      cancelAnimationFrame(dragState.rafId);
      dragState.rafId = null;
    }

    if (dragState.active && win && win.el) {
      // Apply final position synchronously
      var z = getZoom();
      win.el.style.left = (dragState.pendingX / z) + 'px';
      win.el.style.top = (dragState.pendingY / z) + 'px';
      win.el.style.willChange = '';
      dragState.suppressClick = true;
    }

    e.target.releasePointerCapture(e.pointerId);
    dragState.windowId = null;
    dragState.active = false;
  }

  // Suppress click after drag (capture phase)
  document.addEventListener('click', function(e) {
    if (dragState.suppressClick) {
      dragState.suppressClick = false;
      e.stopPropagation();
    }
  }, true);

  // --- Hash Routing ---
  var isHandlingHash = false;

  function updateHash(windowId) {
    if (isHandlingHash) return;
    if (windowId) {
      window.location.hash = '#' + windowId;
    } else {
      // Remove hash without scrolling
      history.replaceState(null, '', window.location.pathname);
    }
  }

  function applyHashState() {
    var hash = window.location.hash.slice(1);
    if (hash && VALID_WINDOWS.has(hash)) {
      isHandlingHash = true;
      openWindow(hash);
      isHandlingHash = false;
    }
  }

  var hashDebounce = null;
  window.addEventListener('hashchange', function() {
    if (hashDebounce) clearTimeout(hashDebounce);
    hashDebounce = setTimeout(function() {
      hashDebounce = null;
      applyHashState();
    }, 100);
  });

  // --- Start Menu ---
  function handleGlobalClick(e) {
    var startBtn = document.getElementById('start-button');
    var menu = document.getElementById('start-menu');

    if (startBtn && startBtn.contains(e.target)) {
      menu.classList.toggle('open');
      var isOpen = menu.classList.contains('open');
      startBtn.setAttribute('aria-expanded', isOpen);
      if (isOpen) {
        var firstItem = menu.querySelector('[role="menuitem"]');
        if (firstItem) firstItem.focus();
      }
      return;
    }

    if (menu && !menu.contains(e.target)) {
      menu.classList.remove('open');
      if (startBtn) startBtn.setAttribute('aria-expanded', 'false');
      closeAllSubmenus();
    }
  }

  // --- Clock (Sydney, Australia timezone) ---
  var TIMEZONE = 'Australia/Sydney';

  function getSydneyTime() {
    return new Date(new Date().toLocaleString('en-US', { timeZone: TIMEZONE }));
  }

  function formatTime12h(date) {
    var h = date.getHours();
    var m = date.getMinutes();
    var ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    m = m < 10 ? '0' + m : m;
    return h + ':' + m + ' ' + ampm;
  }

  function startClock() {
    function tick() {
      if (!elClock) return;
      var syd = getSydneyTime();
      elClock.textContent = formatTime12h(syd);

      // Schedule next tick at start of next minute
      var now = new Date();
      var msUntilNext = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
      setTimeout(tick, msUntilNext);
    }
    tick();
  }

  // --- Analogue Clock ---
  var analogueClockInterval = null;

  function startAnalogueClock() {
    var canvas = document.getElementById('analogue-clock');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var w = canvas.width;
    var h = canvas.height;
    var cx = w / 2;
    var cy = h / 2;
    var r = Math.min(cx, cy) - 8;

    function draw() {
      var syd = getSydneyTime();
      var hrs = syd.getHours() % 12;
      var mins = syd.getMinutes();
      var secs = syd.getSeconds();

      ctx.clearRect(0, 0, w, h);

      // Clock face
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Hour markers
      for (var i = 0; i < 12; i++) {
        var angle = (i * Math.PI / 6) - Math.PI / 2;
        var inner = r - 10;
        var outer = r - 2;
        ctx.beginPath();
        ctx.moveTo(cx + inner * Math.cos(angle), cy + inner * Math.sin(angle));
        ctx.lineTo(cx + outer * Math.cos(angle), cy + outer * Math.sin(angle));
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Hour numbers
      ctx.fillStyle = '#000';
      ctx.font = '11px "Pixelated MS Sans Serif", Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (var n = 1; n <= 12; n++) {
        var na = (n * Math.PI / 6) - Math.PI / 2;
        ctx.fillText(n, cx + (r - 20) * Math.cos(na), cy + (r - 20) * Math.sin(na));
      }

      // Hour hand
      var hAngle = ((hrs + mins / 60) * Math.PI / 6) - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + (r * 0.5) * Math.cos(hAngle), cy + (r * 0.5) * Math.sin(hAngle));
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Minute hand
      var mAngle = ((mins + secs / 60) * Math.PI / 30) - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + (r * 0.7) * Math.cos(mAngle), cy + (r * 0.7) * Math.sin(mAngle));
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Second hand
      var sAngle = (secs * Math.PI / 30) - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + (r * 0.75) * Math.cos(sAngle), cy + (r * 0.75) * Math.sin(sAngle));
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Center dot
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#000';
      ctx.fill();

      // Update digital readout
      var digitalEl = document.getElementById('clock-digital-time');
      if (digitalEl) digitalEl.textContent = formatTime12h(syd) + ':' + (secs < 10 ? '0' : '') + secs;
      var dateEl = document.getElementById('clock-date');
      if (dateEl) dateEl.textContent = syd.toLocaleDateString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

      // Update timezone offset display
      var tzOffsetEl = document.getElementById('clock-timezone-offset');
      if (tzOffsetEl) {
        var isDST = syd.toLocaleString('en-US', { timeZone: TIMEZONE, timeZoneName: 'short' }).includes('DT');
        tzOffsetEl.textContent = isDST ? 'AEDT (UTC+11:00)' : 'AEST (UTC+10:00)';
      }
    }

    draw();
    analogueClockInterval = setInterval(draw, 1000);
  }

  function stopAnalogueClock() {
    if (analogueClockInterval) {
      clearInterval(analogueClockInterval);
      analogueClockInterval = null;
    }
  }

  // --- Visitor Counter ---
  function initVisitorCounter() {
    if (!elVisitorCounter) return;

    var count = parseInt(localStorage.getItem('visitor-count')) || INITIAL_VISITOR_COUNT;

    // Increment once per session
    if (!sessionStorage.getItem('counted')) {
      count++;
      sessionStorage.setItem('counted', '1');
      localStorage.setItem('visitor-count', count);
    }

    elVisitorCounter.textContent = count.toLocaleString();

    // Update the counter display in the popup too
    var counterDisplay = document.getElementById('counter-display');
    if (counterDisplay) counterDisplay.textContent = count.toLocaleString();
  }

  // --- System Tray Click Handlers ---
  function setupSystemTrayClicks() {
    if (elVisitorCounter) {
      elVisitorCounter.style.cursor = 'default';
      elVisitorCounter.addEventListener('click', function(e) {
        e.stopPropagation();
        var win = windows.get('window-visitor-counter');
        if (win && (win.state === 'open' || win.state === 'maximized')) {
          closeWindow('window-visitor-counter');
        } else {
          // Position near the system tray
          openWindow('window-visitor-counter');
          if (win && win.el) {
            win.el.style.left = 'auto';
            win.el.style.right = '80px';
            win.el.style.top = 'auto';
            win.el.style.bottom = (TASKBAR_HEIGHT + 4) + 'px';
            win.el.style.position = 'fixed';
          }
        }
      });
    }

    if (elClock) {
      elClock.style.cursor = 'default';
      elClock.addEventListener('click', function(e) {
        e.stopPropagation();
        var win = windows.get('window-clock');
        if (win && (win.state === 'open' || win.state === 'maximized')) {
          closeWindow('window-clock');
          stopAnalogueClock();
        } else {
          openWindow('window-clock');
          startAnalogueClock();
          if (win && win.el) {
            win.el.style.left = 'auto';
            win.el.style.right = '4px';
            win.el.style.top = 'auto';
            win.el.style.bottom = (TASKBAR_HEIGHT + 4) + 'px';
            win.el.style.position = 'fixed';
          }
        }
      });
    }
  }

  // --- Icon Drag (rearrange desktop icons) ---
  var iconDragState = {
    active: false,
    iconEl: null,
    offsetX: 0,
    offsetY: 0,
    startX: 0,
    startY: 0,
    moved: false,
    rafId: null
  };

  function layoutIcons() {
    var icons = elIconGrid.querySelectorAll('.desktop-icon');
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem('icon-positions')); } catch(e) {}

    var cellW = 80;
    var cellH = 90;
    var padding = 8;
    var gridHeight = elIconGrid.clientHeight || (window.innerHeight - TASKBAR_HEIGHT);
    var cols = Math.max(1, Math.floor(gridHeight / cellH));

    icons.forEach(function(icon, i) {
      var id = icon.getAttribute('data-window-id') || ('icon-' + i);
      if (saved && saved[id]) {
        icon.style.left = saved[id].x + 'px';
        icon.style.top = saved[id].y + 'px';
      } else {
        // Column-first layout (top to bottom, then next column)
        var col = Math.floor(i / cols);
        var row = i % cols;
        icon.style.left = (padding + col * cellW) + 'px';
        icon.style.top = (padding + row * cellH) + 'px';
      }
    });
  }

  function saveIconPositions() {
    var icons = elIconGrid.querySelectorAll('.desktop-icon');
    var positions = {};
    icons.forEach(function(icon, i) {
      var id = icon.getAttribute('data-window-id') || ('icon-' + i);
      positions[id] = {
        x: parseInt(icon.style.left) || 0,
        y: parseInt(icon.style.top) || 0
      };
    });
    localStorage.setItem('icon-positions', JSON.stringify(positions));
  }

  function setupIconDrag() {
    elIconGrid.addEventListener('pointerdown', function(e) {
      var icon = e.target.closest('.desktop-icon');
      if (!icon) return;

      var z = getZoom();
      var rect = icon.getBoundingClientRect();
      iconDragState.iconEl = icon;
      iconDragState.offsetX = e.clientX - rect.left;
      iconDragState.offsetY = e.clientY - rect.top;
      iconDragState.startX = e.clientX;
      iconDragState.startY = e.clientY;
      iconDragState.moved = false;
      iconDragState.active = true;

      icon.setPointerCapture(e.pointerId);
    });

    elIconGrid.addEventListener('pointermove', function(e) {
      if (!iconDragState.active || !iconDragState.iconEl) return;
      if (!iconDragState.iconEl.hasPointerCapture(e.pointerId)) return;

      var dx = e.clientX - iconDragState.startX;
      var dy = e.clientY - iconDragState.startY;

      // 5px threshold before starting drag (so clicks still work)
      if (!iconDragState.moved && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
        iconDragState.moved = true;
        iconDragState.iconEl.style.zIndex = '10';
        iconDragState.iconEl.style.opacity = '0.7';
      }

      if (!iconDragState.moved) return;

      var z = getZoom();
      var x = (e.clientX - iconDragState.offsetX) / z;
      var y = (e.clientY - iconDragState.offsetY) / z;

      // Constrain to grid bounds
      x = Math.max(0, x);
      y = Math.max(0, y);

      if (!iconDragState.rafId) {
        iconDragState.rafId = requestAnimationFrame(function() {
          iconDragState.rafId = null;
          if (iconDragState.iconEl) {
            iconDragState.iconEl.style.left = x + 'px';
            iconDragState.iconEl.style.top = y + 'px';
          }
        });
      }
    });

    elIconGrid.addEventListener('pointerup', function(e) {
      if (!iconDragState.active) return;

      if (iconDragState.rafId) {
        cancelAnimationFrame(iconDragState.rafId);
        iconDragState.rafId = null;
      }

      if (iconDragState.iconEl) {
        iconDragState.iconEl.style.zIndex = '';
        iconDragState.iconEl.style.opacity = '';
        iconDragState.iconEl.releasePointerCapture(e.pointerId);
      }

      if (iconDragState.moved) {
        saveIconPositions();
        // Suppress the click that would follow
        dragState.suppressClick = true;
        iconDragState.iconEl = null;
        iconDragState.active = false;
        iconDragState.moved = false;
        return;
      }

      iconDragState.iconEl = null;
      iconDragState.active = false;
      iconDragState.moved = false;
    });
  }

  // --- Desktop Icon Events ---
  function handleIconClick(iconEl, windowId) {
    var existing = clickTimeouts.get(windowId);
    if (existing) {
      // Second click — double-click
      clearTimeout(existing);
      clickTimeouts.delete(windowId);

      // Check if this is an external link project
      var linkUrl = iconEl.getAttribute('data-url');
      if (linkUrl) {
        window.open(linkUrl, '_blank', 'noopener');
      } else {
        openWindow(windowId);
      }
    } else {
      // First click — wait for potential double-click
      var timeout = setTimeout(function() {
        clickTimeouts.delete(windowId);
        selectIcon(iconEl);
      }, DBLCLICK_DELAY);
      clickTimeouts.set(windowId, timeout);
    }
  }

  function selectIcon(iconEl) {
    // Deselect all
    var icons = elIconGrid.querySelectorAll('.desktop-icon');
    icons.forEach(function(ic) { ic.setAttribute('data-selected', 'false'); });
    iconEl.setAttribute('data-selected', 'true');
  }

  // --- Event Delegation ---
  function setupEventDelegation() {
    // Desktop clicks (icons and windows)
    elDesktop.addEventListener('click', function(e) {
      // Icon click
      var icon = e.target.closest('.desktop-icon');
      if (icon) {
        var windowId = icon.getAttribute('data-window-id');
        if (windowId) handleIconClick(icon, windowId);
        return;
      }

      // Explicit close buttons (data-close-window)
      var explicitClose = e.target.closest('[data-close-window]');
      if (explicitClose) {
        closeWindow(explicitClose.getAttribute('data-close-window'));
        return;
      }

      // Window controls
      var closeBtn = e.target.closest('[aria-label="Close"]');
      if (closeBtn) {
        var winEl = closeBtn.closest('.window');
        if (winEl) closeWindow(winEl.id);
        return;
      }

      var minBtn = e.target.closest('[aria-label="Minimize"]');
      if (minBtn) {
        var winEl2 = minBtn.closest('.window');
        if (winEl2) minimizeWindow(winEl2.id);
        return;
      }

      var maxBtn = e.target.closest('[aria-label="Maximize"]');
      if (maxBtn) {
        var winEl3 = maxBtn.closest('.window');
        if (winEl3) toggleMaximize(winEl3.id);
        return;
      }

      // Click on window — bring to front
      var winClicked = e.target.closest('.window');
      if (winClicked && windows.has(winClicked.id)) {
        bringToFront(winClicked.id);
      }
    });

    // Title bar drag + window resize (pointer events on desktop)
    elDesktop.addEventListener('pointerdown', function(e) {
      // Check for resize first (edge/corner of a window)
      var winEl = e.target.closest('.window');
      if (winEl && windows.has(winEl.id)) {
        var edge = getResizeEdge(e, winEl);
        if (edge && !e.target.closest('.title-bar') && !e.target.closest('.window-body') && !e.target.closest('.status-bar')) {
          onResizeStart(e, winEl.id, edge);
          return;
        }
      }

      // Title bar drag
      var titleBar = e.target.closest('.title-bar');
      if (!titleBar) return;
      if (e.target.closest('button')) return;

      if (winEl && windows.has(winEl.id)) {
        onDragStart(e, winEl.id);
      }
    });

    elDesktop.addEventListener('pointermove', function(e) {
      // Handle active resize
      if (resizeState.active) {
        onResizeMove(e);
        return;
      }
      // Handle active drag
      if (dragState.windowId) {
        onDragMove(e);
        return;
      }
      // Cursor hint: show resize cursor when near window edge
      var winEl = e.target.closest('.window');
      if (winEl && windows.has(winEl.id)) {
        var win = windows.get(winEl.id);
        if (win.state !== 'maximized') {
          var edge = getResizeEdge(e, winEl);
          if (edge) {
            winEl.style.cursor = EDGE_CURSORS[edge];
            return;
          }
        }
        winEl.style.cursor = '';
      }
    });

    elDesktop.addEventListener('pointerup', function(e) {
      if (resizeState.active) {
        onResizeEnd(e);
        return;
      }
      onDragEnd(e);
    });

    // Taskbar clicks
    elTaskbar.addEventListener('click', function(e) {
      var btn = e.target.closest('[data-window-id]');
      if (!btn) return;

      var id = btn.getAttribute('data-window-id');
      var win = windows.get(id);
      if (!win) return;

      if (win.state === 'minimized') {
        restoreWindow(id);
      } else if (win.state === 'open' || win.state === 'maximized') {
        if (activeWindowId === id) {
          minimizeWindow(id);
        } else {
          bringToFront(id);
          win.el.focus();
        }
      }
    });

    // Start menu item clicks
    elStartMenu.addEventListener('click', function(e) {
      var item = e.target.closest('[data-window], [data-action], [data-app]');
      if (!item) return;

      // Don't close menu if clicking a has-submenu parent
      if (item.closest('.has-submenu') && item.getAttribute('aria-haspopup')) return;

      var windowId = item.getAttribute('data-window');
      var action = item.getAttribute('data-action');
      var app = item.getAttribute('data-app');

      if (windowId) {
        openWindow(windowId);
      } else if (action === 'shutdown') {
        openWindow('window-shutdown');
      } else if (app === 'winamp') {
        launchWebamp();
      } else if (app === 'paint') {
        launchPaint();
      } else if (app === 'minesweeper') {
        launchMinesweeper();
      } else if (app === 'calculator') {
        launchCalculator();
      } else if (app === 'help') {
        launchHelpBook();
      }

      elStartMenu.classList.remove('open');
      elStartButton.setAttribute('aria-expanded', 'false');
      closeAllSubmenus();
    });

    // Quick launch clicks
    document.getElementById('quick-launch').addEventListener('click', function(e) {
      var btn = e.target.closest('[data-window], [data-action]');
      if (!btn) return;
      var windowId = btn.getAttribute('data-window');
      var action = btn.getAttribute('data-action');
      if (windowId) openWindow(windowId);
      else if (action === 'show-desktop') showDesktop();
    });

    // Shutdown OK button
    var shutdownOk = document.getElementById('shutdown-ok');
    if (shutdownOk) shutdownOk.addEventListener('click', handleShutdown);

    // Global click for start menu
    document.addEventListener('click', handleGlobalClick);

    // Keyboard
    document.addEventListener('keydown', function(e) {
      // Escape closes start menu first, then topmost window
      if (e.key === 'Escape') {
        if (elStartMenu.classList.contains('open')) {
          elStartMenu.classList.remove('open');
          elStartButton.setAttribute('aria-expanded', 'false');
          elStartButton.focus();
          return;
        }
        if (activeWindowId) {
          closeWindow(activeWindowId);
          return;
        }
      }

      // Enter on focused icon opens it
      if (e.key === 'Enter') {
        var icon = document.activeElement;
        if (icon && icon.classList.contains('desktop-icon')) {
          var wid = icon.getAttribute('data-window-id');
          if (wid) openWindow(wid);
          e.preventDefault();
          return;
        }
      }

      // Space on focused icon selects it
      if (e.key === ' ') {
        var icon2 = document.activeElement;
        if (icon2 && icon2.classList.contains('desktop-icon')) {
          selectIcon(icon2);
          e.preventDefault();
          return;
        }
      }

      // Ctrl+F6 to switch windows
      if (e.key === 'F6' && e.ctrlKey) {
        e.preventDefault();
        var openIds = [];
        windows.forEach(function(w, id) {
          if (w.state === 'open' || w.state === 'maximized') openIds.push(id);
        });
        if (openIds.length < 2) return;

        var idx = openIds.indexOf(activeWindowId);
        var dir = e.shiftKey ? -1 : 1;
        var next = (idx + dir + openIds.length) % openIds.length;
        bringToFront(openIds[next]);
        var nextWin = windows.get(openIds[next]);
        if (nextWin && nextWin.el) nextWin.el.focus();
        announce(getTitleText(nextWin.el) + ' activated');
      }
    });

    // Start menu keyboard navigation
    elStartMenu.addEventListener('keydown', function(e) {
      var items = Array.from(elStartMenu.querySelectorAll('[role="menuitem"]'));
      var currentIdx = items.indexOf(document.activeElement);

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        var next = currentIdx < items.length - 1 ? currentIdx + 1 : 0;
        items[next].focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        var prev = currentIdx > 0 ? currentIdx - 1 : items.length - 1;
        items[prev].focus();
      } else if (e.key === 'Home') {
        e.preventDefault();
        items[0].focus();
      } else if (e.key === 'End') {
        e.preventDefault();
        items[items.length - 1].focus();
      }
    });

    // Arrow key navigation for icon grid
    elIconGrid.addEventListener('keydown', function(e) {
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;

      var icons = Array.from(elIconGrid.querySelectorAll('.desktop-icon'));
      var currentIdx = icons.indexOf(document.activeElement);
      if (currentIdx === -1) return;

      var cols = getIconColumns();
      var nextIdx = currentIdx;

      switch (e.key) {
        case 'ArrowDown':
          nextIdx = Math.min(currentIdx + 1, icons.length - 1);
          break;
        case 'ArrowUp':
          nextIdx = Math.max(currentIdx - 1, 0);
          break;
        case 'ArrowRight':
          nextIdx = Math.min(currentIdx + cols, icons.length - 1);
          break;
        case 'ArrowLeft':
          nextIdx = Math.max(currentIdx - cols, 0);
          break;
        case 'Home':
          nextIdx = e.ctrlKey ? 0 : currentIdx - (currentIdx % cols);
          break;
        case 'End':
          nextIdx = e.ctrlKey ? icons.length - 1 : Math.min(currentIdx - (currentIdx % cols) + cols - 1, icons.length - 1);
          break;
      }

      e.preventDefault();
      icons[currentIdx].setAttribute('tabindex', '-1');
      icons[nextIdx].setAttribute('tabindex', '0');
      icons[nextIdx].focus();
    });
  }

  // --- Helpers ---
  function getWindowRect(el) {
    return {
      x: parseInt(el.style.left) || 0,
      y: parseInt(el.style.top) || 0,
      w: parseInt(el.style.width) || 500,
      h: parseInt(el.style.height) || 400
    };
  }

  function getTitleText(el) {
    var t = el.querySelector('.title-bar-text');
    return t ? t.textContent : '';
  }

  function isMobile() {
    return window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  }

  function getIconColumns() {
    var gridHeight = elIconGrid.clientHeight;
    return Math.max(1, Math.floor(gridHeight / 80));
  }

  // --- Generate Desktop Icons + Project Windows ---
  function generateProjects() {
    var template = document.getElementById('project-window-template');
    var startMenuProjects = document.getElementById('start-menu-projects');

    // System icons FIRST (My Computer, Recycle Bin, About Me, etc.)
    var systemIcons = [
      { id: 'window-my-computer', title: 'My Computer', icon: 'img/icons/mycomputer.png' },
      { id: 'window-recycle-bin', title: 'Recycle Bin', icon: 'img/icons/recyclebin.png' },
      { id: 'window-about', title: 'About Me', icon: 'img/icons/notepad.png' },
      { id: 'window-guestbook', title: 'Guestbook', icon: 'img/icons/guestbook.png' },
      { id: 'window-contact', title: 'E-Mail', icon: 'img/icons/contact.png' }
    ];

    systemIcons.forEach(function(sys, i) {
      var icon = document.createElement('div');
      icon.className = 'desktop-icon';
      icon.setAttribute('role', 'gridcell');
      icon.setAttribute('tabindex', i === 0 ? '0' : '-1');
      icon.setAttribute('data-window-id', sys.id);
      icon.setAttribute('data-selected', 'false');
      icon.setAttribute('aria-label', 'Open ' + sys.title);

      var img = document.createElement('img');
      img.src = sys.icon;
      img.alt = '';
      img.setAttribute('aria-hidden', 'true');
      img.width = 48;
      img.height = 48;
      icon.appendChild(img);

      var label = document.createElement('span');
      label.className = 'desktop-icon-label';
      label.textContent = sys.title;
      icon.appendChild(label);

      elIconGrid.appendChild(icon);
    });

    // Then project icons
    PROJECTS.forEach(function(project, i) {
      var id = 'window-' + project.id;

      if (project.type === 'construction') {
        // Create an "Under Construction" window
        VALID_WINDOWS.add(id);
        var conWin = document.createElement('div');
        conWin.id = id;
        conWin.className = 'window';
        conWin.setAttribute('data-state', 'closed');
        conWin.setAttribute('role', 'dialog');
        conWin.setAttribute('tabindex', '-1');
        conWin.style.width = '350px';
        conWin.innerHTML =
          '<div class="title-bar">' +
            '<div class="title-bar-text">Under Construction - Coming Soon</div>' +
            '<div class="title-bar-controls" role="toolbar" aria-label="Window controls">' +
              '<button aria-label="Minimize"></button>' +
              '<button aria-label="Maximize"></button>' +
              '<button aria-label="Close"></button>' +
            '</div>' +
          '</div>' +
          '<div class="window-body" role="document" style="text-align:center;padding:16px;">' +
            '<p style="font-family:\'Pixelated MS Sans Serif\',Arial;font-size:11px;margin-bottom:12px;">' + project.title + ' is coming soon!</p>' +
            '<img src="img/under-construction.gif" alt="Under Construction" style="max-width:100px;margin:0 auto;display:block;image-rendering:pixelated;">' +
          '</div>';
        elDesktop.appendChild(conWin);
        windows.set(id, { state: 'closed', prevRect: null, el: conWin, taskbarBtn: null });
      } else if (project.type === 'cavaro') {
        // Check if Cavaro was dismissed and 48h hasn't passed
        var dismissed = parseInt(localStorage.getItem('cavaro-dismissed')) || 0;
        var hoursSince = (Date.now() - dismissed) / (1000 * 60 * 60);
        if (dismissed > 0 && hoursSince < 48) {
          // Skip creating the icon — Cavaro is hidden
          // Still create the icon placeholder but hide it later
        }

        VALID_WINDOWS.add(id);
        var cavaroWin = document.createElement('div');
        cavaroWin.id = id;
        cavaroWin.className = 'window';
        cavaroWin.setAttribute('data-state', 'closed');
        cavaroWin.setAttribute('role', 'dialog');
        cavaroWin.setAttribute('tabindex', '-1');
        cavaroWin.style.width = '450px';
        cavaroWin.innerHTML =
          '<div class="title-bar">' +
            '<div class="title-bar-text">cavaro.txt - Notepad</div>' +
            '<div class="title-bar-controls" role="toolbar" aria-label="Window controls">' +
              '<button aria-label="Minimize"></button>' +
              '<button aria-label="Maximize"></button>' +
              '<button aria-label="Close"></button>' +
            '</div>' +
          '</div>' +
          '<div class="notepad-menu-bar" aria-hidden="true">' +
            '<span>File</span><span>Edit</span><span>Format</span><span>Help</span>' +
          '</div>' +
          '<div class="window-body" role="document">' +
            '<div class="notepad-content" style="min-height:250px;">Isn\'t it ironic that there\'s no real "Relationship" in CRM? Everything is transactional. Hardly anything has changed with customer relationship and lifecycle technology, and frankly the big players and new agentic startups are just doing the same legacy thing, now faster.\n\nThis transactional thinking is stuck in the 1990s.\n\nWe are in stealth mode developing the foundational tech to fix this problem (and take the fight to the big guys). BTW, this isn\'t an LLM wrapper - LLMs will ultimately wrap Cavaro.\n\nAre you experienced with causal inference at scale? Are you a marketing lifecycle expert? Are you a full stack SWE who\'s got the battle scars to prove it? Are you sick and tired of wallpapering over major industry issues driven by vendors hard-selling you on a new tool every week? If you\'re any of those (or just curious), I\'d love to talk.\n\nEmail me to learn more using the E-Mail icon or at mitch@ribar.ai\n\nThis message will self-destruct in 3 seconds...</div>' +
          '</div>' +
          '<div class="status-bar"><p class="status-bar-field">Ln 1, Col 1</p></div>';
        elDesktop.appendChild(cavaroWin);
        windows.set(id, { state: 'closed', prevRect: null, el: cavaroWin, taskbarBtn: null });
      } else if (project.type === 'link') {
        // External link — no window, just open URL on double-click
        // We'll handle this in the icon click handler
      } else {
        // Standard project window from template
        VALID_WINDOWS.add(id);
        var clone = template.content.cloneNode(true);
        var winEl = clone.querySelector('.window');
        winEl.id = id;
        winEl.setAttribute('aria-labelledby', 'title-' + project.id);
        var titleText = clone.querySelector('.title-bar-text');
        titleText.id = 'title-' + project.id;
        titleText.textContent = project.title;
        var desc = clone.querySelector('.project-description');
        desc.textContent = project.description;
        var techStack = clone.querySelector('.tech-stack');
        project.tech.forEach(function(t) {
          var pill = document.createElement('span');
          pill.className = 'tech-pill';
          pill.textContent = t;
          techStack.appendChild(pill);
        });
        var links = clone.querySelector('.project-links');
        if (project.url) {
          var a = document.createElement('a');
          a.href = project.url;
          a.target = '_blank';
          a.rel = 'noopener';
          a.textContent = 'Visit';
          links.appendChild(a);
        }

        var screenshot = clone.querySelector('.project-screenshot');
        if (project.screenshot) {
          screenshot.src = project.screenshot;
          screenshot.alt = project.title + ' screenshot';
          screenshot.width = 640;
          screenshot.height = 400;
        } else {
          screenshot.remove();
        }

        var statusField = clone.querySelector('.status-bar-field');
        statusField.textContent = 'Last updated: ' + project.updated;

        elDesktop.appendChild(clone);
        var el = document.getElementById(id);
        windows.set(id, { state: 'closed', prevRect: null, el: el, taskbarBtn: null });
      }

      // Create desktop icon (for ALL project types)
      var icon = document.createElement('div');
      icon.className = 'desktop-icon';
      icon.setAttribute('role', 'gridcell');
      icon.setAttribute('tabindex', '-1');
      icon.setAttribute('data-window-id', id);
      icon.setAttribute('data-selected', 'false');
      icon.setAttribute('aria-label', 'Open ' + project.title);

      // For link-type projects, store the URL on the icon for direct opening
      if (project.type === 'link' && project.url) {
        icon.setAttribute('data-url', project.url);
      }

      var img = document.createElement('img');
      img.src = project.icon || 'img/icons/project-default.png';
      img.alt = '';
      img.setAttribute('aria-hidden', 'true');
      img.width = 48;
      img.height = 48;
      icon.appendChild(img);

      var label = document.createElement('span');
      label.className = 'desktop-icon-label';
      label.textContent = project.title;
      icon.appendChild(label);

      elIconGrid.appendChild(icon);

      // Hide Cavaro icon if dismissed within 48h
      if (project.type === 'cavaro') {
        var dismissed = parseInt(localStorage.getItem('cavaro-dismissed')) || 0;
        var hoursSince = (Date.now() - dismissed) / (1000 * 60 * 60);
        if (dismissed > 0 && hoursSince < 48) {
          icon.style.display = 'none';
        }
      }

      // DOS terminal file entry
      var dosFileList = document.getElementById('dos-file-list');
      if (dosFileList) {
        var dosName = project.title.toUpperCase().replace(/\s+/g, '').substring(0, 8);
        var dosExt = project.type === 'link' ? 'URL' : 'EXE';
        var size = String(Math.floor(Math.random() * 9000 + 1024)).padStart(9, ' ');
        var entry = document.createElement('a');
        entry.className = 'dos-file-entry';
        entry.href = project.url || '#';
        entry.target = '_blank';
        entry.rel = 'noopener';
        entry.textContent = dosName.padEnd(12, ' ') + dosExt + size + '  ' + project.updated;
        dosFileList.appendChild(entry);
      }
    });

  }

  // --- Register System Windows ---
  function registerSystemWindows() {
    SYSTEM_WINDOWS.forEach(function(name) {
      var id = 'window-' + name;
      VALID_WINDOWS.add(id);
      var el = document.getElementById(id);
      if (el) {
        windows.set(id, { state: 'closed', prevRect: null, el: el, taskbarBtn: null });
      }
    });
  }

  // --- System Properties Tab Switching ---
  function initMyComputer() {
    var tablist = document.querySelector('#window-my-computer menu[role="tablist"]');
    if (!tablist) return;
    var tabs = tablist.querySelectorAll('[role="tab"]');
    tabs.forEach(function(tab) {
      tab.addEventListener('click', function() {
        tabs.forEach(function(t) { t.setAttribute('aria-selected', 'false'); });
        tab.setAttribute('aria-selected', 'true');
        var panels = document.querySelectorAll('#window-my-computer .sysprop-panel');
        panels.forEach(function(p) { p.style.display = 'none'; });
        var target = document.getElementById(tab.getAttribute('aria-controls'));
        if (target) target.style.display = 'block';
      });
    });
  }

  // --- Contact Form ---
  function initContactForm() {
    var form = document.getElementById('contact-form');
    if (form) {
      form.addEventListener('submit', function(e) {
        e.preventDefault();

        // Run HTML5 validation (required fields, email format)
        if (!form.checkValidity()) {
          form.reportValidity();
          return;
        }

        var sendBtn = form.querySelector('button[type="submit"]');
        if (sendBtn) {
          sendBtn.textContent = 'Sending...';
          sendBtn.disabled = true;
        }

        // Build JSON body — Formspree recommends JSON for AJAX
        var data = {
          email: form.querySelector('[name="email"]').value,
          _subject: form.querySelector('[name="_subject"]').value,
          message: form.querySelector('[name="message"]').value
        };

        fetch(form.action, {
          method: 'POST',
          body: JSON.stringify(data),
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }).then(function(response) {
          if (response.ok) {
            if (sendBtn) sendBtn.textContent = 'Message Sent!';
            setTimeout(function() {
              closeWindow('window-contact');
              form.reset();
              if (sendBtn) { sendBtn.textContent = 'Send'; sendBtn.disabled = false; }
            }, 1500);
          } else {
            response.json().then(function(body) {
              var msg = (body.errors && body.errors.length) ? body.errors[0].message : 'Send Failed';
              if (sendBtn) { sendBtn.textContent = msg; sendBtn.disabled = false; }
            }).catch(function() {
              if (sendBtn) { sendBtn.textContent = 'Send Failed - Try Again'; sendBtn.disabled = false; }
            });
          }
        }).catch(function() {
          if (sendBtn) { sendBtn.textContent = 'Send Failed - Try Again'; sendBtn.disabled = false; }
        });
      });
    }
  }

  // --- Context Menus ---
  var elCtxDesktop, elCtxTitlebar, elCtxTaskbar;
  var ctxTargetWindowId = null;

  function getZoom() {
    var z = parseFloat(getComputedStyle(document.body).zoom);
    return isNaN(z) ? 1 : z;
  }

  function showContextMenu(menuEl, x, y) {
    hideAllContextMenus();
    // Divide by zoom factor since CSS position uses unzoomed coordinates
    var z = getZoom();
    menuEl.style.left = (x / z) + 'px';
    menuEl.style.top = (y / z) + 'px';
    menuEl.classList.add('open');
    var firstItem = menuEl.querySelector('[role="menuitem"]');
    if (firstItem) firstItem.focus();
  }

  function hideAllContextMenus() {
    if (elCtxDesktop) elCtxDesktop.classList.remove('open');
    if (elCtxTitlebar) elCtxTitlebar.classList.remove('open');
    if (elCtxTaskbar) elCtxTaskbar.classList.remove('open');
    ctxTargetWindowId = null;
  }

  function setupContextMenus() {
    elCtxDesktop = document.getElementById('context-menu-desktop');
    elCtxTitlebar = document.getElementById('context-menu-titlebar');
    elCtxTaskbar = document.getElementById('context-menu-taskbar');

    // Right-click on desktop
    elDesktop.addEventListener('contextmenu', function(e) {
      e.preventDefault();
      // Title bar right-click
      var titleBar = e.target.closest('.title-bar');
      if (titleBar) {
        var winEl = titleBar.closest('.window');
        if (winEl && windows.has(winEl.id)) {
          ctxTargetWindowId = winEl.id;
          showContextMenu(elCtxTitlebar, e.clientX, e.clientY);
        }
        return;
      }
      // Desktop right-click (not on a window)
      if (!e.target.closest('.window')) {
        showContextMenu(elCtxDesktop, e.clientX, e.clientY);
      }
    });

    // Right-click on taskbar
    document.getElementById('taskbar').addEventListener('contextmenu', function(e) {
      e.preventDefault();
      if (!e.target.closest('#start-button') && !e.target.closest('#start-menu')) {
        if (elCtxTaskbar) showContextMenu(elCtxTaskbar, e.clientX, e.clientY);
      }
    });

    // Close context menus on any click
    document.addEventListener('click', function() {
      hideAllContextMenus();
    });

    // Context menu actions
    document.addEventListener('click', function(e) {
      var action = e.target.closest('[data-action]');
      if (!action) return;
      var act = action.getAttribute('data-action');

      switch (act) {
        case 'refresh': location.reload(); break;
        case 'properties': openWindow('window-my-computer'); break;
        case 'arrange-icons':
          localStorage.removeItem('icon-positions');
          layoutIcons();
          break;
        case 'ctx-minimize':
          if (ctxTargetWindowId) minimizeWindow(ctxTargetWindowId);
          break;
        case 'ctx-maximize':
          if (ctxTargetWindowId) toggleMaximize(ctxTargetWindowId);
          break;
        case 'ctx-close':
          if (ctxTargetWindowId) closeWindow(ctxTargetWindowId);
          break;
        case 'cascade-windows':
          var idx = 0;
          windows.forEach(function(win, id) {
            if (win.state === 'open' || win.state === 'maximized') {
              var offset = 30 + (idx * 22);
              win.el.style.top = offset + 'px';
              win.el.style.left = offset + 'px';
              bringToFront(id);
              idx++;
            }
          });
          break;
        case 'show-desktop':
          showDesktop();
          break;
      }
      hideAllContextMenus();
    });

    // Keyboard in context menus
    [elCtxDesktop, elCtxTitlebar, elCtxTaskbar].forEach(function(menu) {
      if (!menu) return;
      menu.addEventListener('keydown', function(e) {
        var items = Array.from(menu.querySelectorAll('[role="menuitem"]'));
        var idx = items.indexOf(document.activeElement);
        if (e.key === 'ArrowDown') { e.preventDefault(); items[(idx + 1) % items.length].focus(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); items[(idx - 1 + items.length) % items.length].focus(); }
        else if (e.key === 'Escape') { hideAllContextMenus(); }
      });
    });
  }

  // --- Selection Rectangle ---
  var selectionState = { active: false, startX: 0, startY: 0, rafId: null };
  var elSelectionRect;

  function setupSelectionRect() {
    elSelectionRect = document.getElementById('selection-rect');
    if (!elSelectionRect) return;

    elDesktop.addEventListener('pointerdown', function(e) {
      // Only start selection on empty desktop space (not on icons, windows, taskbar)
      if (e.target !== elDesktop && e.target !== elIconGrid) return;
      if (e.button !== 0) return;

      var rect = elDesktop.getBoundingClientRect();
      selectionState.active = true;
      selectionState.startX = e.clientX - rect.left;
      selectionState.startY = e.clientY - rect.top;

      elSelectionRect.style.left = selectionState.startX + 'px';
      elSelectionRect.style.top = selectionState.startY + 'px';
      elSelectionRect.style.width = '0';
      elSelectionRect.style.height = '0';
      elSelectionRect.style.display = 'block';
    });

    elDesktop.addEventListener('pointermove', function(e) {
      if (!selectionState.active) return;
      // Don't interfere with window drag
      if (dragState.windowId) { selectionState.active = false; elSelectionRect.style.display = 'none'; return; }

      var rect = elDesktop.getBoundingClientRect();
      var curX = e.clientX - rect.left;
      var curY = e.clientY - rect.top;

      var x = Math.min(selectionState.startX, curX);
      var y = Math.min(selectionState.startY, curY);
      var w = Math.abs(curX - selectionState.startX);
      var h = Math.abs(curY - selectionState.startY);

      elSelectionRect.style.left = x + 'px';
      elSelectionRect.style.top = y + 'px';
      elSelectionRect.style.width = w + 'px';
      elSelectionRect.style.height = h + 'px';
    });

    elDesktop.addEventListener('pointerup', function(e) {
      if (!selectionState.active) return;
      selectionState.active = false;

      // Check which icons intersect the selection rect
      var selRect = elSelectionRect.getBoundingClientRect();
      if (selRect.width > 5 || selRect.height > 5) {
        var icons = elIconGrid.querySelectorAll('.desktop-icon');
        icons.forEach(function(ic) {
          ic.setAttribute('data-selected', 'false');
        });
        icons.forEach(function(ic) {
          var icRect = ic.getBoundingClientRect();
          if (icRect.right > selRect.left && icRect.left < selRect.right &&
              icRect.bottom > selRect.top && icRect.top < selRect.bottom) {
            ic.setAttribute('data-selected', 'true');
          }
        });
      }

      elSelectionRect.style.display = 'none';
    });
  }

  // --- Cascading Submenus ---
  var submenuTimeout = null;

  function openSubmenu(li) {
    var parent = li.parentElement;
    if (parent) {
      parent.querySelectorAll(':scope > .has-submenu.submenu-open').forEach(function(sib) {
        if (sib !== li) closeSubmenu(sib);
      });
    }
    li.classList.add('submenu-open');
    var trigger = li.querySelector(':scope > [aria-haspopup]');
    if (trigger) trigger.setAttribute('aria-expanded', 'true');
  }

  function closeSubmenu(li) {
    li.classList.remove('submenu-open');
    var trigger = li.querySelector(':scope > [aria-haspopup]');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
    li.querySelectorAll('.submenu-open').forEach(function(nested) {
      nested.classList.remove('submenu-open');
      var t = nested.querySelector(':scope > [aria-haspopup]');
      if (t) t.setAttribute('aria-expanded', 'false');
    });
  }

  function closeAllSubmenus() {
    document.querySelectorAll('.has-submenu.submenu-open').forEach(function(li) {
      closeSubmenu(li);
    });
  }

  function initSubmenus() {
    document.querySelectorAll('.has-submenu').forEach(function(li) {
      li.addEventListener('mouseenter', function() {
        clearTimeout(submenuTimeout);
        var target = li;
        submenuTimeout = setTimeout(function() { openSubmenu(target); }, 350);
      });
      li.addEventListener('mouseleave', function() {
        clearTimeout(submenuTimeout);
        var target = li;
        submenuTimeout = setTimeout(function() { closeSubmenu(target); }, 200);
      });
    });
  }

  // --- Shut Down ---
  function handleShutdown() {
    var option = document.querySelector('input[name="shutdown-option"]:checked');
    if (!option) return;

    closeWindow('window-shutdown');
    elStartMenu.classList.remove('open');
    elStartButton.setAttribute('aria-expanded', 'false');

    if (option.id === 'sd-shutdown') {
      // Show "safe to turn off" screen
      var overlay = document.createElement('div');
      overlay.id = 'shutdown-overlay';
      overlay.innerHTML = '<div>It\'s now safe to turn off<br>your computer.</div>';
      document.body.appendChild(overlay);
      setTimeout(function() {
        sessionStorage.removeItem('booted');
        location.reload();
      }, 3000);
    } else if (option.id === 'sd-restart' || option.id === 'sd-dos') {
      sessionStorage.removeItem('booted');
      localStorage.removeItem('cavaro-dismissed');
      location.reload();
    }
  }

  // --- Quick Launch: Show Desktop ---
  function showDesktop() {
    windows.forEach(function(win, id) {
      if (win.state === 'open' || win.state === 'maximized') {
        minimizeWindow(id);
      }
    });
  }

  // --- Embedded App Launchers ---

  var webampInstance = null;

  function launchWebamp() {
    try {
      if (webampInstance) return;

      // Try the global first (UMD bundle)
      if (typeof window.Webamp !== 'undefined') {
        initWebamp(window.Webamp);
        return;
      }

      // Fallback: try dynamic ESM import
      import('https://unpkg.com/webamp@1.5.0/built/webamp.bundle.min.js').then(function(mod) {
        var WebampClass = mod.default || mod;
        initWebamp(WebampClass);
      }).catch(function() {
        alert('Winamp could not load. Try refreshing the page.');
      });
    } catch (e) {
      alert('Winamp could not load.');
    }
  }

  function initWebamp(WebampClass) {
    var container = document.getElementById('webamp-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'webamp-container';
      container.style.cssText = 'position:fixed;top:0;left:0;z-index:9000;';
      document.body.appendChild(container);
    }

    webampInstance = new WebampClass({
      windowLayout: { main: { position: { top: 100, left: 300 } } },
      zIndex: 9000
    });
    webampInstance.renderWhenReady(container).then(function() {
      announce('Winamp opened');
    }).catch(function(err) {
      console.error('Webamp render error:', err);
      announce('Winamp failed to render');
      webampInstance = null;
    });
    webampInstance.onClose(function() {
      webampInstance.dispose();
      webampInstance = null;
      container.innerHTML = '';
    });
  }

  function createAppWindow(id, title, bodyHtml, opts) {
    opts = opts || {};
    var existing = document.getElementById(id);
    if (existing) {
      openWindow(id);
      return;
    }

    var win = document.createElement('div');
    win.id = id;
    win.className = 'window';
    win.setAttribute('data-state', 'closed');
    win.setAttribute('role', 'dialog');
    win.setAttribute('aria-labelledby', 'title-' + id.replace('window-', ''));
    win.setAttribute('tabindex', '-1');
    if (opts.width) win.style.width = opts.width;
    if (opts.height) win.style.height = opts.height;
    if (opts.noResize) win.setAttribute('data-no-resize', 'true');

    var controls = opts.noResize
      ? '<button aria-label="Close"></button>'
      : '<button aria-label="Minimize"></button><button aria-label="Maximize"></button><button aria-label="Close"></button>';

    var bodyStyle = opts.bodyStyle ? ' style="' + opts.bodyStyle + '"' : '';

    win.innerHTML =
      '<div class="title-bar">' +
        '<img src="img/icons/project-sm.png" class="title-bar-icon" alt="" aria-hidden="true">' +
        '<div class="title-bar-text" id="title-' + id.replace('window-', '') + '">' + title + '</div>' +
        '<div class="title-bar-controls" role="toolbar" aria-label="Window controls">' +
          controls +
        '</div>' +
      '</div>' +
      '<div class="window-body" role="document"' + bodyStyle + '>' + bodyHtml + '</div>';

    elDesktop.appendChild(win);
    VALID_WINDOWS.add(id);
    windows.set(id, { state: 'closed', prevRect: null, el: win, taskbarBtn: null });
    openWindow(id);
  }

  function launchPaint() {
    createAppWindow('window-paint', 'untitled - Paint',
      '<iframe src="https://jspaint.app" style="width:100%;height:100%;border:none;flex:1;"></iframe>',
      { width: '640px', height: '480px', bodyStyle: 'display:flex;flex-direction:column;padding:0;overflow:hidden;' });
  }

  function launchMinesweeper() {
    createAppWindow('window-minesweeper', 'Minesweeper',
      '<iframe src="apps/minesweeper/index.html" style="width:100%;height:100%;border:none;" scrolling="no"></iframe>',
      { width: '242px', height: '310px', noResize: true, bodyStyle: 'padding:0;overflow:hidden;' });
  }

  function launchHelpBook() {
    var page = 0;
    var pages = window.BOOK_PAGES || [];
    var total = pages.length;

    function navHtml() {
      return '<div style="display:flex;align-items:center;justify-content:space-between;' +
        'padding:6px 12px;border-top:1px solid #808080;background:var(--win98-silver);' +
        'font-family:\'Pixelated MS Sans Serif\',Arial;font-size:11px;">' +
        '<button id="help-prev" style="min-width:70px;"' + (page === 0 ? ' disabled' : '') +
          '>\u25C0 Previous</button>' +
        '<span>Page ' + (page + 1) + ' of ' + total + '</span>' +
        '<button id="help-next" style="min-width:70px;"' + (page === total - 1 ? ' disabled' : '') +
          '>Next \u25B6</button>' +
        '</div>';
    }

    function render() {
      var win = document.getElementById('window-help-book');
      if (!win) return;
      var body = win.querySelector('.window-body');
      body.innerHTML =
        '<div id="help-page" style="flex:1;overflow-y:auto;padding:20px 24px;' +
          'font-family:Georgia,\'Times New Roman\',serif;font-size:13px;' +
          'background:#fff;text-align:center;">' +
          pages[page] +
        '</div>' +
        navHtml();

      var prev = body.querySelector('#help-prev');
      var next = body.querySelector('#help-next');
      if (prev) prev.addEventListener('click', function() { if (page > 0) { page--; render(); } });
      if (next) next.addEventListener('click', function() { if (page < total - 1) { page++; render(); } });
    }

    var bodyContent =
      '<div id="help-page" style="flex:1;overflow-y:auto;padding:20px 24px;' +
        'font-family:Georgia,\'Times New Roman\',serif;font-size:13px;' +
        'background:#fff;text-align:center;">' +
        pages[0] +
      '</div>' +
      navHtml();

    createAppWindow('window-help-book', 'The Way of Code - Help', bodyContent, {
      width: '400px',
      height: '600px',
      bodyStyle: 'display:flex;flex-direction:column;padding:0;overflow:hidden;'
    });

    // Attach navigation after window is created
    var win = document.getElementById('window-help-book');
    if (win) {
      var prev = win.querySelector('#help-prev');
      var next = win.querySelector('#help-next');
      if (prev) prev.addEventListener('click', function() { if (page > 0) { page--; render(); } });
      if (next) next.addEventListener('click', function() { if (page < total - 1) { page++; render(); } });
    }
  }

  function launchCalculator() {
    createAppWindow('window-calculator', 'Calculator',
      '<iframe src="apps/calculator/index.html" style="width:100%;height:100%;border:none;" scrolling="no"></iframe>',
      { width: '175px', height: '240px', noResize: true, bodyStyle: 'padding:0;overflow:hidden;background:#c0c0c0;' });
  }

  // --- Init ---
  function init() {
    // Cache DOM references
    elDesktop = document.getElementById('desktop');
    elIconGrid = document.getElementById('icon-grid');
    elTaskbar = document.getElementById('taskbar');
    elTaskbarButtons = document.getElementById('taskbar-buttons');
    elStartMenu = document.getElementById('start-menu');
    elStartButton = document.getElementById('start-button');
    elClock = document.getElementById('clock');
    elVisitorCounter = document.getElementById('visitor-counter');
    elAnnouncer = document.getElementById('window-announcer');
    // elMobileProjects removed — using DOS terminal view instead

    // Register system windows first
    registerSystemWindows();

    // Generate projects from data
    generateProjects();

    // Setup all event listeners
    setupEventDelegation();

    // Start system tray
    startClock();
    initVisitorCounter();
    initContactForm();
    initMyComputer();
    setupSystemTrayClicks();
    setupContextMenus();
    setupSelectionRect();
    initSubmenus();
    layoutIcons();
    setupIconDrag();

    // Apply hash on load
    applyHashState();
  }

  document.addEventListener('DOMContentLoaded', init);

})();
