/* =========================================================================
   TEACHERS' DAY — SCRIPT
   Handles: intro sequence, staggered text reveals, screen transitions,
   ambient particles (stars + petals), optional music, small interaction
   details (ripple, cursor glow, section indicator).
   ========================================================================= */

(() => {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------------
     Screen order + navigation
  --------------------------------------------------------------------- */
  const SCREEN_IDS = ['opening', 'teacher', 'sorry', 'reveal', 'final'];
  const screens = SCREEN_IDS.map(id => document.getElementById(id));
  let currentIndex = 0;

  const progressRail = document.getElementById('progressRail');
  const progressDots = progressRail ? [...progressRail.querySelectorAll('.progress-dot')] : [];

  function setProgress(index) {
    progressDots.forEach((dot, i) => dot.classList.toggle('is-active', i === index));
  }

  /**
   * Reveals every reveal-able element inside a screen, one after another,
   * with a gentle stagger. Elements: .line-reveal / .reveal-line / .ghost-btn
   */
  function playRevealSequence(screenEl, { startDelay = 200, gap = 550 } = {}) {
    const targets = [...screenEl.querySelectorAll('.line-reveal, .reveal-line, .ghost-btn')];
    if (prefersReducedMotion) {
      targets.forEach(el => el.classList.add('is-shown'));
      return;
    }
    targets.forEach((el, i) => {
      const extra = el.classList.contains('ghost-btn') ? 300 : 0; // small pause before CTA
      window.setTimeout(() => el.classList.add('is-shown'), startDelay + i * gap + extra);
    });
  }

  function resetRevealSequence(screenEl) {
    screenEl.querySelectorAll('.is-shown').forEach(el => el.classList.remove('is-shown'));
  }

  /**
   * Switches from the currently active screen to the target screen index.
   * `withClimax` triggers the golden flash used for the Akka reveal.
   */
  function goToScreen(targetIndex, { withClimax = false } = {}) {
    const from = screens[currentIndex];
    const to = screens[targetIndex];
    if (!to || to === from) return;

    const doSwitch = () => {
      from.classList.remove('is-active');
      resetRevealSequence(from);
      to.classList.add('is-active');
      currentIndex = targetIndex;
      setProgress(targetIndex);
      playRevealSequence(to);
      intensifyAmbience(targetIndex);
    };

    if (withClimax && !prefersReducedMotion) {
      const flash = document.getElementById('climaxFlash');
      flash.classList.add('is-active');
      window.setTimeout(doSwitch, 380); // switch content mid-flash
      window.setTimeout(() => flash.classList.remove('is-active'), 1700);
    } else {
      doSwitch();
    }
  }

  /* ---------------------------------------------------------------------
     Opening screen → begin experience
  --------------------------------------------------------------------- */
  const beginBtn = document.getElementById('beginBtn');
  const openingScreen = document.getElementById('opening');
  const musicToggle = document.getElementById('musicToggle');

  beginBtn.addEventListener('click', () => {
    spawnRipple(beginBtn, event);
    openingScreen.classList.add('is-leaving');
    activateAmbience();
    progressRail && progressRail.classList.add('is-visible');
    musicToggle && musicToggle.classList.add('is-visible');

    window.setTimeout(() => {
      openingScreen.classList.remove('is-active'); // no-op, kept for clarity
      goToScreen(1);
    }, prefersReducedMotion ? 50 : 900);
  });

  /* ---------------------------------------------------------------------
     Section navigation buttons
  --------------------------------------------------------------------- */
  document.getElementById('toSorryBtn').addEventListener('click', (e) => {
    spawnRipple(e.currentTarget, e);
    goToScreen(2);
  });

  document.getElementById('toRevealBtn').addEventListener('click', (e) => {
    spawnRipple(e.currentTarget, e);
    goToScreen(3, { withClimax: true });
  });

  document.getElementById('toFinalBtn').addEventListener('click', (e) => {
    spawnRipple(e.currentTarget, e);
    goToScreen(4);
  });

  /* ---------------------------------------------------------------------
     Button ripple effect
  --------------------------------------------------------------------- */
  function spawnRipple(button, evt) {
    if (prefersReducedMotion) return;
    const rect = button.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    const size = Math.max(rect.width, rect.height);
    const x = (evt && evt.clientX ? evt.clientX - rect.left : rect.width / 2) - size / 2;
    const y = (evt && evt.clientY ? evt.clientY - rect.top : rect.height / 2) - size / 2;
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    button.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
  }

  /* ---------------------------------------------------------------------
     Ambient particles: soft glowing stars on canvas
  --------------------------------------------------------------------- */
  const canvas = document.getElementById('particle-canvas');
  const ctx = canvas.getContext('2d');
  let stars = [];
  let ambienceActive = false;
  let intensity = 0.35; // grows as the story progresses

  function resizeCanvas() {
    canvas.width = window.innerWidth * window.devicePixelRatio;
    canvas.height = window.innerHeight * window.devicePixelRatio;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
  }

  function createStars(count) {
    const arr = [];
    for (let i = 0; i < count; i++) {
      arr.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: Math.random() * 1.4 + 0.4,
        speed: Math.random() * 0.15 + 0.03,
        twinkleSpeed: Math.random() * 0.02 + 0.005,
        phase: Math.random() * Math.PI * 2,
        hue: Math.random() > 0.5 ? '227,190,134' : '242,183,196'
      });
    }
    return arr;
  }

  function drawStars(time) {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    stars.forEach(s => {
      s.phase += s.twinkleSpeed;
      s.y -= s.speed;
      if (s.y < -10) { s.y = window.innerHeight + 10; s.x = Math.random() * window.innerWidth; }
      const alpha = (Math.sin(s.phase) * 0.4 + 0.6) * intensity;
      ctx.beginPath();
      ctx.fillStyle = `rgba(${s.hue}, ${alpha})`;
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
    if (ambienceActive) window.requestAnimationFrame(drawStars);
  }

  function initParticles() {
    resizeCanvas();
    stars = createStars(prefersReducedMotion ? 0 : (window.innerWidth < 640 ? 40 : 80));
  }

  function activateAmbience() {
    if (ambienceActive) return;
    ambienceActive = true;
    initParticles();
    window.requestAnimationFrame(drawStars);
    if (!prefersReducedMotion) startPetals();
  }

  function intensifyAmbience(screenIndex) {
    // Story arc: brighten and add more warmth as we approach the reveal.
    const curve = [0.35, 0.4, 0.3, 0.75, 0.85];
    intensity = curve[screenIndex] ?? 0.5;
    document.querySelectorAll('.glow--one, .glow--two').forEach(g => {
      g.style.opacity = String(0.28 + intensity * 0.25);
    });
    if (screenIndex === 3 || screenIndex === 4) {
      petalRate = 900; // more petals during the emotional climax + finale
    }
  }

  window.addEventListener('resize', () => { if (ambienceActive) initParticles(); });

  /* ---------------------------------------------------------------------
     Floating flower petals (DOM based, lightweight)
  --------------------------------------------------------------------- */
  const petalLayer = document.getElementById('petal-layer');
  const PETAL_GLYPHS = ['🌸', '❀', '✿'];
  let petalRate = 2200;
  let petalTimer = null;

  function spawnPetal() {
    const petal = document.createElement('span');
    petal.className = 'petal';
    petal.textContent = PETAL_GLYPHS[Math.floor(Math.random() * PETAL_GLYPHS.length)];
    const startX = Math.random() * 100;
    const drift = (Math.random() - 0.5) * 140;
    const duration = 9 + Math.random() * 7;
    const rotate = (Math.random() - 0.5) * 360;
    const scale = 0.6 + Math.random() * 0.7;

    petal.style.left = `${startX}vw`;
    petal.style.setProperty('--drift', `${drift}px`);
    petal.style.setProperty('--rotate', `${rotate}deg`);
    petal.style.setProperty('--scale', scale.toFixed(2));
    petal.style.animation = `petal-fall ${duration}s linear forwards`;

    petalLayer.appendChild(petal);
    window.setTimeout(() => petal.remove(), duration * 1000 + 200);
  }

  function startPetals() {
    const loop = () => {
      spawnPetal();
      petalTimer = window.setTimeout(loop, petalRate + Math.random() * 800);
    };
    loop();
  }

  // Inject the petal-fall keyframes once (kept in JS since it uses CSS custom
  // properties set per-petal — simpler than pre-declaring many variants).
  const styleTag = document.createElement('style');
  styleTag.textContent = `
    @keyframes petal-fall {
      0%   { transform: translate(0, 0) rotate(0deg) scale(var(--scale, 1)); opacity: 0; }
      8%   { opacity: .85; }
      92%  { opacity: .7; }
      100% { transform: translate(var(--drift, 0px), 108vh) rotate(var(--rotate, 180deg)) scale(var(--scale, 1)); opacity: 0; }
    }
  `;
  document.head.appendChild(styleTag);

  /* ---------------------------------------------------------------------
     Optional background music
  --------------------------------------------------------------------- */
  const bgMusic = document.getElementById('bgMusic');
  let musicPlaying = false;

  musicToggle.addEventListener('click', () => {
    if (!bgMusic) return;
    if (musicPlaying) {
      bgMusic.pause();
      musicPlaying = false;
    } else {
      bgMusic.volume = 0.5;
      const playPromise = bgMusic.play();
      if (playPromise && playPromise.catch) {
        playPromise.then(() => { musicPlaying = true; syncMusicUI(); })
          .catch(() => { /* music.mp3 missing or blocked — page still works fine */ });
      } else {
        musicPlaying = true;
      }
    }
    syncMusicUI();
  });

  function syncMusicUI() {
    musicToggle.classList.toggle('is-playing', musicPlaying);
    musicToggle.setAttribute('aria-pressed', String(musicPlaying));
    musicToggle.setAttribute('aria-label', musicPlaying ? 'Pause background music' : 'Play background music');
  }

  /* ---------------------------------------------------------------------
     Subtle cursor glow (desktop only)
  --------------------------------------------------------------------- */
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches && !prefersReducedMotion) {
    const cursorGlow = document.createElement('div');
    cursorGlow.className = 'cursor-glow';
    document.body.appendChild(cursorGlow);
    window.addEventListener('mousemove', (e) => {
      cursorGlow.style.left = `${e.clientX}px`;
      cursorGlow.style.top = `${e.clientY}px`;
    });
  }

  /* ---------------------------------------------------------------------
     Initial state
  --------------------------------------------------------------------- */
  setProgress(0);
})();