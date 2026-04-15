const canvas = document.getElementById("pixel-rain");
const ctx = canvas.getContext("2d", { alpha: true });

const mobileQuery = window.matchMedia("(max-width: 900px)");
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

let drops = [];
let animationId = null;
let isRunning = false;
let lastFrameTime = 0;
let colorCache = new Map();

function getDropCount() {
  if (reducedMotionQuery.matches) return 0;
  return mobileQuery.matches ? 36 : 120;
}

function getPixelSize() {
  return mobileQuery.matches ? 3 : 2;
}

function getDropColors(len, pixelSize) {
  const key = `${len}-${pixelSize}`;
  if (colorCache.has(key)) return colorCache.get(key);

  const colors = [];
  for (let j = 0; j < len; j += pixelSize) {
    const t = j / len;
    const r = Math.floor(90 + t * 165);
    const g = Math.floor(t * 20);
    const b = Math.floor(t * 20);
    colors.push(`rgb(${r},${g},${b})`);
  }

  colorCache.set(key, colors);
  return colors;
}

function resizeCanvas() {
  const wrap = canvas.parentElement;
  const newWidth = wrap.clientWidth;
  const newHeight = wrap.clientHeight;

  if (canvas.width === newWidth && canvas.height === newHeight) return;

  canvas.width = newWidth;
  canvas.height = newHeight;
  createDrops();
}

function createDrops() {
  const dropCount = getDropCount();
  const pixelSize = getPixelSize();
  drops = [];
  colorCache = new Map();

  for (let i = 0; i < dropCount; i++) {
    const len = (Math.floor(Math.random() * 16) + 12) * pixelSize;

    getDropColors(len, pixelSize);

    drops.push({
      x: Math.floor((Math.random() * canvas.width) / pixelSize) * pixelSize,
      y: Math.floor((Math.random() * canvas.height) / pixelSize) * pixelSize,
      len,
      speed: (Math.floor(Math.random() * 4) + 2) * pixelSize
    });
  }
}

function stopRain() {
  if (animationId) cancelAnimationFrame(animationId);
  animationId = null;
  isRunning = false;
  if (isRunning) ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawPixelRain(now = 0) {
  if (!isRunning) return;

  const targetFps = mobileQuery.matches ? 24 : 60;
  const frameInterval = 1000 / targetFps;

  if (now - lastFrameTime < frameInterval) {
    animationId = requestAnimationFrame(drawPixelRain);
    return;
  }
  lastFrameTime = now;

  const pixelSize = getPixelSize();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.globalAlpha = mobileQuery.matches ? 0.26 : 0.4;

  for (let i = 0; i < drops.length; i++) {
    const d = drops[i];

    const colors = getDropColors(d.len, pixelSize);

    for (let j = 0, k = 0; j < d.len; j += pixelSize, k++) {
      ctx.fillStyle = colors[k];
      ctx.fillRect(d.x, d.y + j, pixelSize, pixelSize);
    }

    d.y += d.speed;

    if (d.y + d.len > canvas.height) {
      const newLen = (Math.floor(Math.random() * 16) + 12) * pixelSize;

      getDropColors(newLen, pixelSize);

      d.x = Math.floor((Math.random() * canvas.width) / pixelSize) * pixelSize;
      d.y = -newLen;
      d.len = newLen;
      d.speed = (Math.floor(Math.random() * 4) + 2) * pixelSize;
    }
  }

  animationId = requestAnimationFrame(drawPixelRain);
}

function startRain(shouldResize = false) {
  if (reducedMotionQuery.matches || document.hidden) {
    stopRain();
    return;
  }

  if (shouldResize) resizeCanvas();

  if (isRunning) return;
  isRunning = true;
  lastFrameTime = 0;
  animationId = requestAnimationFrame(drawPixelRain);
}

window.addEventListener("resize", resizeCanvas, { passive: true });
document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopRain();
  else startRain();
});
mobileQuery.addEventListener?.("change", startRain);
reducedMotionQuery.addEventListener?.("change", startRain);

resizeCanvas();
startRain();
