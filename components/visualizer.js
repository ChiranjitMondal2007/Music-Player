const Visualizer = (() => {
  let canvas, ctx;
  let mode = 'bars';
  let animId = null;
  let isActive = false;

  function init(canvasEl) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
  }

  function resize() {
    if (!canvas) return;
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
  }

  function setMode(m) {
    mode = m;
    document.querySelectorAll('.vis-mode').forEach(el => {
      el.classList.toggle('active', el.dataset.vis === m);
    });
  }

  function start() {
    if (isActive) return;
    isActive = true;
    draw();
  }

  function stop() {
    isActive = false;
    if (animId) cancelAnimationFrame(animId);
  }

  function draw() {
    if (!isActive) return;
    animId = requestAnimationFrame(draw);

    const analyser = Player.getAnalyser();
    if (!analyser) {
      drawIdle();
      return;
    }

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    const w = canvas.width / window.devicePixelRatio;
    const h = canvas.height / window.devicePixelRatio;
    ctx.clearRect(0, 0, w, h);

    if (mode === 'bars') drawBars(dataArray, bufferLength, w, h);
    else if (mode === 'circular') drawCircular(dataArray, bufferLength, w, h);
    else if (mode === 'wave') drawWave(analyser, w, h);
  }

  function drawIdle() {
    const w = canvas.width / window.devicePixelRatio;
    const h = canvas.height / window.devicePixelRatio;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-tertiary');
    ctx.font = '16px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Play a song to see the visualizer', w / 2, h / 2);
  }

  function drawBars(data, len, w, h) {
    const barCount = 64;
    const step = Math.floor(len / barCount);
    const barW = (w / barCount) * 0.7;
    const gap = (w / barCount) * 0.3;
    const primary = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();

    for (let i = 0; i < barCount; i++) {
      const val = data[i * step] / 255;
      const barH = val * h * 0.8;
      const x = i * (barW + gap) + gap / 2;
      const y = h - barH;

      const gradient = ctx.createLinearGradient(x, y, x, h);
      gradient.addColorStop(0, primary);
      gradient.addColorStop(1, primary + '33');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(x, y, barW, barH, [4, 4, 0, 0]);
      ctx.fill();
    }
  }

  function drawCircular(data, len, w, h) {
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) * 0.25;
    const barCount = 128;
    const step = Math.floor(len / barCount);
    const primary = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();

    ctx.save();
    ctx.translate(cx, cy);

    for (let i = 0; i < barCount; i++) {
      const val = data[i * step] / 255;
      const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2;
      const barH = val * radius * 1.5 + 2;

      ctx.save();
      ctx.rotate(angle);
      const gradient = ctx.createLinearGradient(0, radius, 0, radius + barH);
      gradient.addColorStop(0, primary);
      gradient.addColorStop(1, primary + '22');
      ctx.fillStyle = gradient;
      ctx.fillRect(-1.5, radius, 3, barH);
      ctx.restore();
    }

    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = primary + '22';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.1, 0, Math.PI * 2);
    ctx.fillStyle = primary;
    ctx.fill();

    ctx.restore();
  }

  function drawWave(analyser, w, h) {
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteTimeDomainData(dataArray);
    const primary = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();

    ctx.lineWidth = 2;
    ctx.strokeStyle = primary;
    ctx.beginPath();

    const sliceWidth = w / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * h) / 2;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      x += sliceWidth;
    }

    ctx.lineTo(w, h / 2);
    ctx.stroke();

    ctx.strokeStyle = primary + '44';
    ctx.lineWidth = 1;
    ctx.beginPath();
    x = 0;
    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * h) / 2 + 10;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      x += sliceWidth;
    }
    ctx.stroke();
  }

  return { init, setMode, start, stop, resize, draw };
})();
