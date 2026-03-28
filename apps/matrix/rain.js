window.startMatrixRain = function(canvas) {
  var ctx = canvas.getContext('2d');
  var W = canvas.width = canvas.parentElement.clientWidth;
  var H = canvas.height = canvas.parentElement.clientHeight;
  var fontSize = 14;
  var cols = Math.floor(W / fontSize);
  var drops = [];
  for (var i = 0; i < cols; i++) drops[i] = Math.random() * -100;

  // Character set: half-width katakana + digits
  var chars = '';
  for (var c = 0xFF66; c <= 0xFF9D; c++) chars += String.fromCharCode(c);
  chars += '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  function draw() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#0F0';
    ctx.font = fontSize + 'px monospace';

    for (var i = 0; i < drops.length; i++) {
      var ch = chars[Math.floor(Math.random() * chars.length)];
      var x = i * fontSize;
      var y = drops[i] * fontSize;

      // Head character: bright white-green
      ctx.fillStyle = '#CCFFCC';
      ctx.fillText(ch, x, y);

      // Reset to green for next frame's trail
      ctx.fillStyle = '#00FF00';

      if (y > H && Math.random() > 0.975) {
        drops[i] = 0;
      }
      drops[i]++;
    }

    requestAnimationFrame(draw);
  }

  draw();
};
