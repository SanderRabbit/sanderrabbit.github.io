document.addEventListener("DOMContentLoaded", function () {
  const player = document.getElementById("winamp-player");
  const handle = document.getElementById("winamp-drag-handle");
  const minimizeBtn = document.getElementById("player-minimize");

  const miniPlayerButton = document.getElementById("mini-player-button");

  const audio = document.getElementById("bgm");
  audio.crossOrigin = "anonymous";
  const playBtn = document.getElementById("play-btn");
  const pauseBtn = document.getElementById("pause-btn");
  const stopBtn = document.getElementById("stop-btn");
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");
  const volume = document.getElementById("volume");

  const timeText = document.getElementById("track-time");
  const trackName = document.getElementById("track-name");
  const playlistEl = document.getElementById("playlist");

  const eqSliders = document.querySelectorAll(".eq-slider");
  const eqReset = document.getElementById("eq-reset");

  const visualizerCanvas = document.getElementById("visualizer");
  const visualizerCtx = visualizerCanvas.getContext("2d");

  const VIS_BAR_COUNT = 18;
  const VIS_HALF_COUNT = VIS_BAR_COUNT / 2;

  const tracks = [
    { title: "Inon Zur - The Brotherhood of Steel", src: "https://file.garden/Zllpn6gh4hF11fjI/Inon%20Zur%20-%20The%20Brotherhood%20of%20Steel.mp3" },
    { title: "Diablo II - Town", src: "https://file.garden/Zllpn6gh4hF11fjI/Diablo%20II%20-%20Town.mp3" },
    { title: "Kensuke Ushio - Sweet Dreams", src: "https://file.garden/Zllpn6gh4hF11fjI/Kensuke%20Ushio%20-%20Sweet%20Dreams.mp3" },
    { title: "Inon Zur - Industrial De-Evolution", src: "https://file.garden/Zllpn6gh4hF11fjI/Inon%20Zur%20-%20Industrial%20De-Evolution.mp3" },
    { title: "Jeremy Soule - Ancient Sorrow", src: "https://file.garden/Zllpn6gh4hF11fjI/Jeremy%20Soule%20-%20Ancient%20Sorrow.mp3" },
    { title: "Akira Yamaoka - Forest", src: "https://file.garden/Zllpn6gh4hF11fjI/Akira%20Yamaoka%20-%20Forest.mp3" },
    { title: "Gretel & Hansel", src: "https://file.garden/Zllpn6gh4hF11fjI/Gretel%20%26%20Hansel.mp3" }
  ];

  let currentTrack = Number(localStorage.getItem("currentTrack") || 0);
  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;
  let marqueeAnimationId = null;
  let marqueeBaseText = "";
  let marqueePosition = 0;
  let marqueeFrame = 0;
  let lastVisualizerBars = new Array(VIS_BAR_COUNT).fill(2);
  let visualizerPeaks = new Array(VIS_BAR_COUNT).fill(2);
  let visualizerAnimationId = null;
  let visualizerLastFrameTime = 0;
  let visualizerReleaseMode = false;
  let visualizerReleaseFrames = 0;

  const savedX = localStorage.getItem("playerX");
  const savedY = localStorage.getItem("playerY");
  const savedVolume = localStorage.getItem("bgmVolume");
  const savedMinimized = localStorage.getItem("playerMinimized");
  const savedTrackTime = localStorage.getItem("trackTime");

  const mobileQuery = window.matchMedia("(max-width: 900px)");

  function clampPlayerToViewport() {
    if (mobileQuery.matches) {
      player.style.left = "50%";
      player.style.top = "auto";
      return;
    }

    const currentLeft = player.style.left ? parseInt(player.style.left, 10) : player.offsetLeft;
    const currentTop = Number.parseInt(player.style.top || player.offsetTop, 10) || 100;
    const maxX = Math.max(0, window.innerWidth - player.offsetWidth);
    const maxY = Math.max(0, window.innerHeight - player.offsetHeight);

    player.style.left = Math.min(Math.max(0, currentLeft), maxX) + "px";
    player.style.top = Math.min(Math.max(0, currentTop), maxY) + "px";
  }

  if (!mobileQuery.matches && savedX !== null && savedY !== null) {
    player.style.left = savedX + "px";
    player.style.top = savedY + "px";
  }

  if (savedVolume !== null) {
    audio.volume = Number(savedVolume);
    volume.value = savedVolume;
  } else {
    audio.volume = 0.5;
  }

  if (savedMinimized === "true") {
    player.classList.add("minimized");
    miniPlayerButton.classList.add("show");
  }

  function formatTime(sec) {
    if (!isFinite(sec)) return "00:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  }

  function updateTime() {
    timeText.textContent = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;
  }

  function saveCurrentTime() {
    localStorage.setItem("trackTime", String(audio.currentTime || 0));
  }

  function renderPlaylist() {
    playlistEl.innerHTML = "";

    tracks.forEach((track, index) => {
      const li = document.createElement("li");
      li.textContent = `${String(index + 1).padStart(2, "0")}. ${track.title}`;

      if (index === currentTrack) {
        li.classList.add("active");
      }

      li.addEventListener("click", function () {
        loadTrack(index, true, 0);
      });

      playlistEl.appendChild(li);
    });
  }

  function updateMiniButtonText() {
    const title = tracks[currentTrack] ? tracks[currentTrack].title : "WINAMP";
    miniPlayerButton.textContent = `♫ ${title}`;
  }

  function stopTrackMarquee() {
    if (marqueeAnimationId !== null) {
      cancelAnimationFrame(marqueeAnimationId);
      marqueeAnimationId = null;
    }
  }

  function startTrackMarquee(text) {
    stopTrackMarquee();

    marqueeBaseText = text;
    trackName.textContent = text;

    const needsScroll = trackName.scrollWidth > trackName.clientWidth + 4;
    if (!needsScroll) return;

    const spacer = "     ✦     ";
    const marqueeText = text + spacer;
    marqueePosition = 0;
    marqueeFrame = 0;

    function animateMarquee() {
      marqueeFrame++;

      if (marqueeFrame % 10 === 0) {
        marqueePosition = (marqueePosition + 1) % marqueeText.length;
        const visibleText =
          marqueeText.slice(marqueePosition) + marqueeText.slice(0, marqueePosition);
        trackName.textContent = visibleText;
      }

      marqueeAnimationId = requestAnimationFrame(animateMarquee);
    }

    marqueeAnimationId = requestAnimationFrame(animateMarquee);
  }

  function updateTrackDisplay() {
    const label = `${String(currentTrack + 1).padStart(2, "0")}. ${tracks[currentTrack].title}`;
    startTrackMarquee(label);
    updateMiniButtonText();
  }

  function loadTrack(index, autoplay = false, startTime = 0) {
    currentTrack = index;
    localStorage.setItem("currentTrack", String(currentTrack));

    audio.src = tracks[currentTrack].src;
    audio.load();

    updateTrackDisplay();
    renderPlaylist();

    const onCanPlay = () => {
      audio.removeEventListener("canplay", onCanPlay);

      if (startTime > 0 && startTime < audio.duration) {
        audio.currentTime = startTime;
      } else {
        audio.currentTime = 0;
      }

      updateTime();

      if (autoplay) {
        audio.play().catch((err) => console.log("play failed:", err));
      }
    };

    audio.addEventListener("canplay", onCanPlay, { once: true });
  }

  function prevTrack(autoplay = true) {
    const nextIndex = (currentTrack - 1 + tracks.length) % tracks.length;
    loadTrack(nextIndex, autoplay, 0);
  }

  function nextTrack(autoplay = true) {
    const nextIndex = (currentTrack + 1) % tracks.length;
    loadTrack(nextIndex, autoplay, 0);
  }

  audio.addEventListener("timeupdate", function () {
    updateTime();
    saveCurrentTime();
  });

  audio.addEventListener("loadedmetadata", function () {
    updateTime();
    updateTrackDisplay();
  });

  audio.addEventListener("play", function () {
    resumeAudioContext();
    startVisualizer();
  });

  audio.addEventListener("pause", function () {
    stopVisualizer();
  });

  audio.addEventListener("ended", function () {
    stopVisualizer();
    nextTrack(true);
  });

  playBtn.addEventListener("click", function () {
    resumeAudioContext();
    audio.play().catch(() => {});
  });

  pauseBtn.addEventListener("click", function () {
    audio.pause();
  });

  stopBtn.addEventListener("click", function () {
    audio.pause();
    audio.currentTime = 0;
    updateTime();
    saveCurrentTime();
  });

  prevBtn.addEventListener("click", function () {
    resumeAudioContext();
    prevTrack(true);
  });

  nextBtn.addEventListener("click", function () {
    resumeAudioContext();
    nextTrack(true);
  });

  volume.addEventListener("input", function () {
    audio.volume = Number(volume.value);
    localStorage.setItem("bgmVolume", volume.value);
  });

  minimizeBtn.addEventListener("click", function () {
    player.classList.add("minimized");
    miniPlayerButton.classList.add("show");
    stopVisualizer();
    localStorage.setItem("playerMinimized", "true");
  });

  miniPlayerButton.addEventListener("click", function () {
    player.classList.remove("minimized");
    miniPlayerButton.classList.remove("show");
    if (!audio.paused) startVisualizer();
    localStorage.setItem("playerMinimized", "false");
  });

  handle.addEventListener("mousedown", function (e) {
    if (e.target.tagName === "BUTTON") return;

    isDragging = true;
    offsetX = e.clientX - player.offsetLeft;
    offsetY = e.clientY - player.offsetTop;
  });

  document.addEventListener("mousemove", function (e) {
    if (!isDragging || mobileQuery.matches) return;

    let newX = e.clientX - offsetX;
    let newY = e.clientY - offsetY;

    const maxX = window.innerWidth - player.offsetWidth;
    const maxY = window.innerHeight - player.offsetHeight;

    if (newX < 0) newX = 0;
    if (newY < 0) newY = 0;
    if (newX > maxX) newX = maxX;
    if (newY > maxY) newY = maxY;

    player.style.left = newX + "px";
    player.style.top = newY + "px";
  });

  document.addEventListener("mouseup", function () {
    if (!isDragging) return;

    isDragging = false;
    localStorage.setItem("playerX", String(parseInt(player.style.left, 10)));
    localStorage.setItem("playerY", String(parseInt(player.style.top, 10)));
  });

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const audioContext = new AudioContextClass();
  const source = audioContext.createMediaElementSource(audio);

  const eqBands = [
    { freq: 60, type: "lowshelf" },
    { freq: 170, type: "peaking" },
    { freq: 310, type: "peaking" },
    { freq: 600, type: "peaking" },
    { freq: 1000, type: "peaking" },
    { freq: 3000, type: "peaking" },
    { freq: 6000, type: "peaking" },
    { freq: 12000, type: "highshelf" }
  ];

  const filters = eqBands.map((band) => {
    const filter = audioContext.createBiquadFilter();
    filter.type = band.type;
    filter.frequency.value = band.freq;
    filter.gain.value = 0;
    filter.Q.value = 1;
    return filter;
  });

  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 64;
  analyser.smoothingTimeConstant = 0.8;

  source.connect(filters[0]);

  for (let i = 0; i < filters.length - 1; i++) {
    filters[i].connect(filters[i + 1]);
  }

  filters[filters.length - 1].connect(analyser);
  analyser.connect(audioContext.destination);

  function resumeAudioContext() {
    if (audioContext.state === "suspended") {
      audioContext.resume();
    }
  }

  eqSliders.forEach((slider, index) => {
    const saved = localStorage.getItem(`eq_${index}`);

    if (saved !== null) {
      slider.value = saved;
      filters[index].gain.value = Number(saved);
    }

    slider.addEventListener("input", function () {
      filters[index].gain.value = Number(slider.value);
      localStorage.setItem(`eq_${index}`, slider.value);
    });
  });

  eqReset.addEventListener("click", function () {
    eqSliders.forEach((slider, index) => {
      slider.value = 0;
      filters[index].gain.value = 0;
      localStorage.setItem(`eq_${index}`, "0");
    });
  });

  function drawVisualizerFrame(now = 0) {
    const width = visualizerCanvas.width;
    const height = visualizerCanvas.height;
    const barCount = VIS_BAR_COUNT;
    const halfCount = VIS_HALF_COUNT;
    const barWidth = 3;
    const gap = 1;
    const totalWidth = barCount * barWidth + (barCount - 1) * gap;
    const startX = Math.floor((width - totalWidth) / 2);

    const isActive =
    !audio.paused &&
    !audio.ended &&
    !player.classList.contains("minimized") &&
    !document.hidden;

  if (!isActive) {
    /* 재생 직후 멈췄을 때 바로 idle로 안 가고 천천히 가라앉기 */
    visualizerReleaseMode = true;
    visualizerReleaseFrames++;

    visualizerCtx.clearRect(0, 0, width, height);
    visualizerCtx.fillStyle = "#000000";
    visualizerCtx.fillRect(0, 0, width, height);

  /* 배경 glow도 천천히 죽이기 */
  const remainingEnergy =
    Math.max(...lastVisualizerBars) / Math.max(1, height - 2);

  const bgGradient = visualizerCtx.createRadialGradient(
    width / 2,
    height / 2,
    2,
    width / 2,
    height / 2,
    width / 1.1
  );
  bgGradient.addColorStop(0, `rgba(255, 40, 40, ${remainingEnergy * 0.18})`);
  bgGradient.addColorStop(0.45, `rgba(140, 0, 0, ${remainingEnergy * 0.10})`);
  bgGradient.addColorStop(1, "rgba(0, 0, 0, 0)");

  visualizerCtx.fillStyle = bgGradient;
  visualizerCtx.fillRect(0, 0, width, height);

  /* 중앙 파동선도 약하게 남기기 */
  visualizerCtx.beginPath();
  for (let x = 0; x < width; x++) {
    const wave =
      Math.sin(x * 0.22 + now * 0.003) * (0.4 + remainingEnergy * 1.8) +
      Math.sin(x * 0.07 - now * 0.002) * (0.2 + remainingEnergy * 0.9);

    const y = height * 0.62 - wave;

    if (x === 0) visualizerCtx.moveTo(x, y);
    else visualizerCtx.lineTo(x, y);
  }
  visualizerCtx.strokeStyle = `rgba(255, 90, 90, ${remainingEnergy * 0.20})`;
  visualizerCtx.lineWidth = 1;
  visualizerCtx.stroke();

  let stillMoving = false;

  for (let i = 0; i < barCount; i++) {
    const x = startX + i * (barWidth + gap);

    /* 막대 천천히 하강 */
    lastVisualizerBars[i] = Math.max(2, lastVisualizerBars[i] - 0.22);

    /* 피크는 막대보다 조금 더 천천히 */
    visualizerPeaks[i] = Math.max(
      lastVisualizerBars[i],
      visualizerPeaks[i] - 0.12
    );

    const barHeight = Math.round(lastVisualizerBars[i]);
    const peakHeight = Math.round(visualizerPeaks[i]);
    const y = height - barHeight;
    const peakY = height - peakHeight;

    if (barHeight > 2 || peakHeight > 2) stillMoving = true;

    if (barHeight < 8) {
      visualizerCtx.fillStyle = "#4a0000";
    } else if (barHeight < 16) {
      visualizerCtx.fillStyle = "#9d1111";
    } else {
      visualizerCtx.fillStyle = "#ff4a4a";
    }

    visualizerCtx.fillRect(x, y, barWidth, barHeight);

    visualizerCtx.fillStyle = "rgba(255, 180, 180, 0.18)";
    visualizerCtx.fillRect(x, y, barWidth, Math.min(2, barHeight));

    visualizerCtx.fillStyle = "#ffd1d1";
    visualizerCtx.fillRect(x, peakY, barWidth, 1);
  }

  /* 중앙 glow도 천천히 감소 */
  visualizerCtx.fillStyle = `rgba(255, 70, 70, ${remainingEnergy * 0.09})`;
  visualizerCtx.fillRect(Math.floor(width / 2) - 6, 0, 12, height);

  /* 다 가라앉았으면 그때 idle 상태로 전환 */
 if (!stillMoving || visualizerReleaseFrames > 180) {
  visualizerReleaseMode = false;
  visualizerReleaseFrames = 0;
  visualizerAnimationId = null;

  visualizerCtx.clearRect(0, 0, width, height);
  visualizerCtx.fillStyle = "#000000";
  visualizerCtx.fillRect(0, 0, width, height);

  return;
}

  visualizerAnimationId = requestAnimationFrame(drawVisualizerFrame);
  return;
}

  const targetFps = mobileQuery.matches ? 30 : 60;
  const frameInterval = 1000 / targetFps;

  if (now - visualizerLastFrameTime < frameInterval) {
    visualizerAnimationId = requestAnimationFrame(drawVisualizerFrame);
    return;
  }

  visualizerLastFrameTime = now;

  visualizerCtx.clearRect(0, 0, width, height);
  visualizerCtx.fillStyle = "#000000";
  visualizerCtx.fillRect(0, 0, width, height);

  const data = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(data);

  const avg =
    data.reduce((sum, value) => sum + value, 0) / Math.max(1, data.length);
  const pulse = avg / 255;
  const t = now * 0.004;

  /* 배경 붉은 glow */
  const pulseGlow = Math.max(0.08, pulse * 0.35);
  const bgGradient = visualizerCtx.createRadialGradient(
    width / 2,
    height / 2,
    2,
    width / 2,
    height / 2,
    width / 1.1
  );
  bgGradient.addColorStop(0, `rgba(255, 40, 40, ${pulseGlow})`);
  bgGradient.addColorStop(0.45, `rgba(140, 0, 0, ${pulseGlow * 0.55})`);
  bgGradient.addColorStop(1, "rgba(0, 0, 0, 0)");

  visualizerCtx.fillStyle = bgGradient;
  visualizerCtx.fillRect(0, 0, width, height);

  /* 중앙 파동선 유지 */
  visualizerCtx.beginPath();
  for (let x = 0; x < width; x++) {
    const wave =
      Math.sin(x * 0.22 + t * 1.4) * (1.2 + pulse * 3.5) +
      Math.sin(x * 0.07 - t * 0.9) * (0.5 + pulse * 1.8);

    const y = height * 0.62 - wave;

    if (x === 0) {
      visualizerCtx.moveTo(x, y);
    } else {
      visualizerCtx.lineTo(x, y);
    }
  }
  visualizerCtx.strokeStyle = `rgba(255, 90, 90, ${0.18 + pulse * 0.35})`;
  visualizerCtx.lineWidth = 1;
  visualizerCtx.stroke();

  /* 절반만 계산해서 좌우 대칭 복사 */
  const mirroredTargets = new Array(barCount).fill(2);

  const lowBand = Math.max(1, Math.floor(data.length * 0.18));
  const midBand = Math.max(lowBand + 1, Math.floor(data.length * 0.58));
  const highBand = data.length;

  for (let i = 0; i < halfCount; i++) {
    const ratio = i / Math.max(1, halfCount - 1);

    let startIndex;
    let endIndex;

    if (ratio < 0.33) {
      const local = ratio / 0.33;
      startIndex = Math.floor(local * lowBand * 0.9);
      endIndex = Math.floor(startIndex + lowBand * 0.22);
    } else if (ratio < 0.72) {
      const local = (ratio - 0.33) / 0.39;
      startIndex = Math.floor(lowBand + local * (midBand - lowBand) * 0.9);
      endIndex = Math.floor(startIndex + (midBand - lowBand) * 0.16);
    } else {
      const local = (ratio - 0.72) / 0.28;
      startIndex = Math.floor(midBand + local * (highBand - midBand) * 0.85);
      endIndex = Math.floor(startIndex + (highBand - midBand) * 0.18);
    }

    startIndex = Math.max(0, Math.min(data.length - 1, startIndex));
    endIndex = Math.max(startIndex + 1, Math.min(data.length, endIndex));

    let sum = 0;
    for (let j = startIndex; j < endIndex; j++) {
      sum += data[j];
    }

    const value = sum / Math.max(1, endIndex - startIndex);
    const normalized = value / 255;

    const centerBoost = 1 - ratio * 0.28; 
    const shaped =
      Math.pow(normalized, 0.82) * (height - 6) * centerBoost +
      Math.sin(t * 2 + i * 0.55) * (0.25 + pulse * 0.9);

    const h = Math.max(2, Math.round(shaped));

    /* 가운데에서 바깥으로 같은 값 배치 */
    const leftIndex = halfCount - 1 - i;
    const rightIndex = halfCount + i;

    mirroredTargets[leftIndex] = h;
    mirroredTargets[rightIndex] = h;
  }

  for (let i = 0; i < barCount; i++) {
    const x = startX + i * (barWidth + gap);

    lastVisualizerBars[i] +=
      (mirroredTargets[i] - lastVisualizerBars[i]) * 0.28;

    const barHeight = Math.max(2, Math.round(lastVisualizerBars[i]));
    const y = height - barHeight;

    /* 피크 홀드 유지 */
    if (barHeight >= visualizerPeaks[i]) {
      visualizerPeaks[i] = barHeight;
    } else {
      visualizerPeaks[i] -= 0.35;
    }
    visualizerPeaks[i] = Math.max(2, visualizerPeaks[i]);

    /* 막대 색상 */
    if (barHeight < 8) {
      visualizerCtx.fillStyle = "#4a0000";
    } else if (barHeight < 16) {
      visualizerCtx.fillStyle = "#9d1111";
    } else {
      visualizerCtx.fillStyle = "#ff4a4a";
    }

    visualizerCtx.fillRect(x, y, barWidth, barHeight);

    /* 윗부분 잔광 */
    visualizerCtx.fillStyle = "rgba(255, 180, 180, 0.22)";
    visualizerCtx.fillRect(x, y, barWidth, Math.min(2, barHeight));

    /* 피크 점 */
    const peakY = height - Math.round(visualizerPeaks[i]);
    visualizerCtx.fillStyle = "#ffd1d1";
    visualizerCtx.fillRect(x, peakY, barWidth, 1);
  }

  /* 중앙 세로 glow 유지 */
  visualizerCtx.fillStyle = `rgba(255, 70, 70, ${0.06 + pulse * 0.14})`;
  visualizerCtx.fillRect(Math.floor(width / 2) - 6, 0, 12, height);

  visualizerAnimationId = requestAnimationFrame(drawVisualizerFrame);
}

  function startVisualizer() {
    if (visualizerAnimationId) return;
    visualizerLastFrameTime = 0;
    visualizerAnimationId = requestAnimationFrame(drawVisualizerFrame);
  }

  function stopVisualizer() {
    if (visualizerAnimationId) {
      cancelAnimationFrame(visualizerAnimationId);
      visualizerAnimationId = null;
    }
  }

  clampPlayerToViewport();

  loadTrack(currentTrack, false, Number(savedTrackTime || 0));
  drawVisualizerFrame();

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      stopVisualizer();
      stopTrackMarquee();
    } else {
      updateTrackDisplay();
      if (!audio.paused && !player.classList.contains("minimized")) startVisualizer();
    }
  });

  window.addEventListener("beforeunload", function () {
    saveCurrentTime();
    stopTrackMarquee();
    stopVisualizer();
  });

  window.addEventListener("resize", function () {
    clampPlayerToViewport();
    updateTrackDisplay();
  });

  mobileQuery.addEventListener?.("change", function () {
    clampPlayerToViewport();
  });
});
