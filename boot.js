;(function() {
  'use strict';

  // Skip boot if: already booted this session, reduced motion, or hash deep link
  var skipBoot = sessionStorage.getItem('booted') ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    window.location.hash;

  if (skipBoot) return;

  // Create boot overlay
  var overlay = document.createElement('div');
  overlay.id = 'boot-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:99999;background:#000;color:#c0c0c0;font-family:"Lucida Console","Courier New",monospace;font-size:13px;cursor:pointer;display:flex;flex-direction:column;justify-content:center;align-items:center;';
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

  function nextStage() {
    stage++;

    if (stage === 1) {
      // POST screen
      overlay.innerHTML = '<div style="align-self:flex-start;padding:40px;width:100%;"><div style="color:#fff;font-size:16px;font-weight:bold;margin-bottom:20px;">Portfolio 98 BIOS v4.20</div><div>Memory Test: 640K OK</div><div style="margin-top:8px;">Detecting Primary IDE Master... Portfolio HD</div><div style="margin-top:8px;">Detecting Primary IDE Slave... None</div><div style="margin-top:20px;color:#808080;">Press any key to skip...</div></div>';
      timer = setTimeout(nextStage, 1200);
    } else if (stage === 2) {
      // Windows logo
      overlay.innerHTML = '<div style="text-align:center;"><div style="font-size:48px;margin-bottom:8px;">&#9632;</div><div style="color:#fff;font-size:18px;font-weight:bold;letter-spacing:4px;">Portfolio 98</div><div style="color:#808080;font-size:11px;margin-top:12px;">Starting...</div><div style="margin-top:20px;width:200px;height:16px;border:1px solid #808080;"><div id="boot-progress" style="height:100%;width:0%;background:#000080;transition:width 0.8s linear;"></div></div></div>';
      // Animate progress bar
      requestAnimationFrame(function() {
        var bar = document.getElementById('boot-progress');
        if (bar) bar.style.width = '100%';
      });
      timer = setTimeout(nextStage, 1000);
    } else {
      // Done — reveal desktop
      completeBoot();
    }
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
