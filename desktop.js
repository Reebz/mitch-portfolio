;(function() {
  'use strict';

  /* ============================================================
     desktop.js — Window management for Win98 portfolio
     ============================================================ */

  // --- Constants ---
  var TASKBAR_HEIGHT = 28;
  var MIN_WIN_SIZE = { w: 300, h: 200 };
  var INITIAL_VISITOR_COUNT = 12847;
  var DBLCLICK_DELAY = 300;
  var Z_NORMALIZE_THRESHOLD = 1000;

  // --- Project Data ---
  var PROJECTS = [
    {
      id: 'project-1',
      title: 'Project One',
      description: 'A placeholder project. Replace with real content.',
      tech: ['JavaScript', 'HTML', 'CSS'],
      github: 'https://github.com/Reebz',
      demo: null,
      screenshot: null,
      updated: '2026-03-24',
      icon: null
    },
    {
      id: 'project-2',
      title: 'Project Two',
      description: 'Another placeholder project. Replace with real content.',
      tech: ['Python', 'AI'],
      github: 'https://github.com/Reebz',
      demo: null,
      screenshot: null,
      updated: '2026-03-24',
      icon: null
    },
    {
      id: 'project-3',
      title: 'Project Three',
      description: 'Yet another placeholder. Replace with real content.',
      tech: ['TypeScript', 'Node.js'],
      github: 'https://github.com/Reebz',
      demo: null,
      screenshot: null,
      updated: '2026-03-24',
      icon: null
    }
  ];

  // Non-project windows (hand-authored in HTML)
  var SYSTEM_WINDOWS = ['about', 'guestbook', 'contact'];

  // All valid window IDs (for hash routing whitelist)
  var VALID_WINDOWS = new Set();

  // --- State ---
  var windows = new Map(); // id -> { state, prevRect, el, taskbarBtn }
  var zCounter = 10;
  var activeWindowId = null;
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

    // Position window (cascade from top-left)
    var openCount = 0;
    windows.forEach(function(w) {
      if (w.state === 'open' || w.state === 'maximized') openCount++;
    });
    var offset = 30 + (openCount * 25);
    win.el.style.left = offset + 'px';
    win.el.style.top = offset + 'px';
    win.el.style.width = '500px';
    win.el.style.height = '400px';
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

    win.state = 'closed';
    win.el.setAttribute('data-state', 'closed');
    win.el.style.transform = '';

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
        var win = windows.get(dragState.windowId);
        if (win && win.el) {
          win.el.style.left = dragState.pendingX + 'px';
          win.el.style.top = dragState.pendingY + 'px';
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
      win.el.style.left = dragState.pendingX + 'px';
      win.el.style.top = dragState.pendingY + 'px';
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
      startBtn.setAttribute('aria-expanded', menu.classList.contains('open'));
      return;
    }

    if (menu && !menu.contains(e.target)) {
      menu.classList.remove('open');
      if (startBtn) startBtn.setAttribute('aria-expanded', 'false');
    }
  }

  // --- Clock ---
  function startClock() {
    function tick() {
      if (!elClock) return;
      var now = new Date();
      var h = now.getHours();
      var m = now.getMinutes();
      var ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      m = m < 10 ? '0' + m : m;
      elClock.textContent = h + ':' + m + ' ' + ampm;

      // Schedule next tick at start of next minute
      var msUntilNext = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
      setTimeout(tick, msUntilNext);
    }
    tick();
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
  }

  // --- Desktop Icon Events ---
  function handleIconClick(iconEl, windowId) {
    var existing = clickTimeouts.get(windowId);
    if (existing) {
      // Second click — double-click
      clearTimeout(existing);
      clickTimeouts.delete(windowId);
      openWindow(windowId);
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

    // Title bar drag (pointer events on desktop)
    elDesktop.addEventListener('pointerdown', function(e) {
      var titleBar = e.target.closest('.title-bar');
      if (!titleBar) return;
      // Don't drag if clicking a button
      if (e.target.closest('button')) return;

      var winEl = titleBar.closest('.window');
      if (winEl && windows.has(winEl.id)) {
        onDragStart(e, winEl.id);
      }
    });

    elDesktop.addEventListener('pointermove', onDragMove);
    elDesktop.addEventListener('pointerup', onDragEnd);

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
      var item = e.target.closest('[data-window]');
      if (!item) return;

      var windowId = item.getAttribute('data-window');
      openWindow(windowId);
      elStartMenu.classList.remove('open');
      elStartButton.setAttribute('aria-expanded', 'false');
    });

    // Global click for start menu
    document.addEventListener('click', handleGlobalClick);

    // Keyboard
    document.addEventListener('keydown', function(e) {
      // Escape closes topmost window
      if (e.key === 'Escape' && activeWindowId) {
        closeWindow(activeWindowId);
        return;
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
    return window.matchMedia('(pointer: coarse), (max-width: 768px)').matches;
  }

  function getIconColumns() {
    var gridHeight = elIconGrid.clientHeight;
    return Math.max(1, Math.floor(gridHeight / 80));
  }

  // --- Generate Project Windows + Icons ---
  function generateProjects() {
    var template = document.getElementById('project-window-template');
    var startMenuProjects = document.getElementById('start-menu-projects');

    PROJECTS.forEach(function(project, i) {
      var id = 'window-' + project.id;
      VALID_WINDOWS.add(id);

      // Clone template and fill
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
      if (project.github) {
        var a = document.createElement('a');
        a.href = project.github;
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = 'GitHub';
        links.appendChild(a);
      }
      if (project.demo) {
        var a2 = document.createElement('a');
        a2.href = project.demo;
        a2.target = '_blank';
        a2.rel = 'noopener';
        a2.textContent = 'Live Demo';
        links.appendChild(a2);
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

      // Register in state
      var el = document.getElementById(id);
      windows.set(id, { state: 'closed', prevRect: null, el: el, taskbarBtn: null });

      // Create desktop icon
      var icon = document.createElement('div');
      icon.className = 'desktop-icon';
      icon.setAttribute('role', 'gridcell');
      icon.setAttribute('tabindex', i === 0 ? '0' : '-1');
      icon.setAttribute('data-window-id', id);
      icon.setAttribute('data-selected', 'false');
      icon.setAttribute('aria-label', 'Open ' + project.title);

      var img = document.createElement('img');
      img.src = project.icon || 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><rect fill="#c0c0c0" width="48" height="48" rx="2"/><rect fill="#000080" x="4" y="4" width="40" height="8"/><rect fill="#fff" x="4" y="14" width="40" height="30"/><text x="24" y="33" text-anchor="middle" font-size="12" fill="#000">' + (project.title.charAt(0) || '?') + '</text></svg>');
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

      // Add to start menu
      var menuItem = document.createElement('button');
      menuItem.className = 'start-menu-item';
      menuItem.setAttribute('role', 'menuitem');
      menuItem.setAttribute('data-window', id);
      menuItem.textContent = project.title;
      var li = document.createElement('li');
      li.appendChild(menuItem);
      startMenuProjects.appendChild(li);

      // Mobile card
      if (elMobileProjects) {
        var card = document.createElement('div');
        card.className = 'mobile-project-card';
        card.innerHTML = '';
        var h3 = document.createElement('h3');
        h3.textContent = project.title;
        card.appendChild(h3);
        var p = document.createElement('p');
        p.textContent = project.description;
        card.appendChild(p);
        var techDiv = document.createElement('div');
        techDiv.className = 'tech-stack';
        project.tech.forEach(function(t) {
          var pill = document.createElement('span');
          pill.className = 'tech-pill';
          pill.textContent = t;
          techDiv.appendChild(pill);
        });
        card.appendChild(techDiv);
        if (project.github) {
          var link = document.createElement('a');
          link.href = project.github;
          link.target = '_blank';
          link.rel = 'noopener';
          link.textContent = 'GitHub';
          card.appendChild(link);
        }
        elMobileProjects.appendChild(card);
      }
    });

    // Add system icons to icon grid
    var systemIcons = [
      { id: 'window-about', title: 'About Me', letter: '?' },
      { id: 'window-guestbook', title: 'Guestbook', letter: 'G' },
      { id: 'window-contact', title: 'Contact', letter: '@' }
    ];

    systemIcons.forEach(function(sys) {
      var iconIdx = elIconGrid.children.length;
      var icon = document.createElement('div');
      icon.className = 'desktop-icon';
      icon.setAttribute('role', 'gridcell');
      icon.setAttribute('tabindex', '-1');
      icon.setAttribute('data-window-id', sys.id);
      icon.setAttribute('data-selected', 'false');
      icon.setAttribute('aria-label', 'Open ' + sys.title);

      var img = document.createElement('img');
      img.src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><rect fill="#c0c0c0" width="48" height="48" rx="2"/><rect fill="#000080" x="4" y="4" width="40" height="8"/><rect fill="#fff" x="4" y="14" width="40" height="30"/><text x="24" y="33" text-anchor="middle" font-size="16" fill="#000080">' + sys.letter + '</text></svg>');
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

  // --- Contact Email Obfuscation ---
  function initContactEmail() {
    var link = document.getElementById('contact-email');
    if (link) {
      // Replace with actual email when ready
      link.textContent = 'hello@example.com';
      link.href = 'mailto:hello@example.com';
    }
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
    elMobileProjects = document.getElementById('mobile-projects');

    // Register system windows first
    registerSystemWindows();

    // Generate projects from data
    generateProjects();

    // Setup all event listeners
    setupEventDelegation();

    // Start system tray
    startClock();
    initVisitorCounter();
    initContactEmail();

    // Apply hash on load
    applyHashState();
  }

  document.addEventListener('DOMContentLoaded', init);

})();
