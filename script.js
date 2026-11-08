(() => {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const palette = ['#FFC5D9', '#E4709B', '#BDF4F1', '#FFDFF1', '#F7A8C6'];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const song    = $('#song');
  const player  = $('#player');
  const playBtn = $('#play');
  const seek    = $('#seek');
  const vol     = $('#vol');
  const curEl   = $('#cur');
  const durEl   = $('#dur');

  /* ---------- helpers ---------- */
  const fmt = (t) => {
    if (!isFinite(t)) return '0:00';
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };
  const setFill = (input) => {
    const min = +input.min || 0, max = +input.max || 100;
    input.style.setProperty('--p', ((input.value - min) / (max - min)) * 100 + '%');
  };

  /* ---------- floating background hearts ---------- */
  const heartsLayer = $('#hearts');
  function spawnFloatingHeart() {
    if (reduceMotion || document.hidden) return;
    const h = document.createElement('span');
    h.className = 'float-heart';
    h.textContent = Math.random() > 0.2 ? '❤' : '♥';
    const size = 12 + Math.random() * 22;
    const dur = 9 + Math.random() * 9;
    h.style.cssText = `
      left:${Math.random() * 100}%;
      font-size:${size}px;
      color:${palette[Math.floor(Math.random() * palette.length)]};
      animation-duration:${dur}s;
      --drift:${(Math.random() - 0.5) * 140}px;
      --spin:${(Math.random() - 0.5) * 80}deg;`;
    heartsLayer.appendChild(h);
    setTimeout(() => h.remove(), dur * 1000);
  }
  setInterval(spawnFloatingHeart, 700);
  for (let i = 0; i < 6; i++) setTimeout(spawnFloatingHeart, i * 250);

  /* ---------- heart burst on tap ---------- */
  function burst(x, y, count = 7) {
    if (reduceMotion) return;
    for (let i = 0; i < count; i++) {
      const b = document.createElement('span');
      b.className = 'burst-heart';
      b.textContent = '❤';
      const angle = Math.random() * Math.PI * 2;
      const dist = 40 + Math.random() * 70;
      b.style.cssText = `
        left:${x}px; top:${y}px;
        font-size:${12 + Math.random() * 14}px;
        color:${palette[Math.floor(Math.random() * 2)]};
        --dx:${Math.cos(angle) * dist}px;
        --dy:${Math.sin(angle) * dist - 20}px;
        --r:${(Math.random() - 0.5) * 120}deg;`;
      document.body.appendChild(b);
      setTimeout(() => b.remove(), 950);
    }
  }
  document.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.player, .intro')) return;
    burst(e.clientX, e.clientY);
  });

  /* ---------- envelope intro ---------- */
  const intro = $('#intro');
  const envelope = $('#envelope');
  let opened = false;

  function openLetter() {
    if (opened) return;
    opened = true;
    intro.classList.add('opening');

    // user gesture -> browsers allow audio now
    song.volume = +vol.value;
    song.play().catch(() => { /* user can press play */ });

    setTimeout(() => {
      intro.classList.add('gone');
      document.body.classList.remove('locked');
      document.body.classList.add('revealed');
      window.scrollTo(0, 0);
    }, 2300);
  }
  envelope.addEventListener('click', openLetter);

  /* ---------- music player ---------- */
  function updatePlayState() {
    const playing = !song.paused;
    player.classList.toggle('playing', playing);
    playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
  }
  function toggle() {
    if (song.paused) song.play().catch(() => {});
    else song.pause();
  }
  playBtn.addEventListener('click', toggle);
  song.addEventListener('play', updatePlayState);
  song.addEventListener('pause', updatePlayState);

  let scrubbing = false;
  song.addEventListener('loadedmetadata', () => {
    seek.max = song.duration;
    durEl.textContent = fmt(song.duration);
    setFill(seek);
  });
  if (song.readyState >= 1) { seek.max = song.duration; durEl.textContent = fmt(song.duration); }

  song.addEventListener('timeupdate', () => {
    if (scrubbing) return;
    seek.value = song.currentTime;
    curEl.textContent = fmt(song.currentTime);
    setFill(seek);
  });

  // dragging the slider: preview time, then jump
  seek.addEventListener('input', () => {
    scrubbing = true;
    curEl.textContent = fmt(+seek.value);
    setFill(seek);
  });
  seek.addEventListener('change', () => {
    song.currentTime = +seek.value;
    scrubbing = false;
  });

  $('#back').addEventListener('click', () => { song.currentTime = Math.max(0, song.currentTime - 10); });
  $('#fwd').addEventListener('click',  () => { song.currentTime = Math.min(song.duration || 0, song.currentTime + 10); });

  vol.addEventListener('input', () => { song.volume = +vol.value; setFill(vol); });
  setFill(vol);

  // keyboard: space = play/pause, arrows = seek (when not typing in a control)
  document.addEventListener('keydown', (e) => {
    if (!opened) return;
    const tag = (e.target.tagName || '').toLowerCase();
    if (e.code === 'Space' && tag !== 'button' && tag !== 'input') { e.preventDefault(); toggle(); }
    if (e.code === 'Escape') closeLightbox();
  });

  /* ---------- scroll reveal ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) {
        en.target.classList.add('in');
        io.unobserve(en.target);
      }
    });
  }, { threshold: 0.18 });
  document.querySelectorAll('.reveal').forEach((el, i) => {
    el.style.transitionDelay = (el.closest('.gallery') ? (i % 4) * 120 : 0) + 'ms';
    io.observe(el);
  });

  /* ---------- lightbox ---------- */
  const lb = $('#lightbox');
  const lbImg = $('#lightboxImg');
  function closeLightbox() {
    lb.classList.remove('open');
    lb.setAttribute('aria-hidden', 'true');
  }
  document.querySelectorAll('.polaroid').forEach((p) => {
    p.addEventListener('click', () => {
      lbImg.src = p.dataset.full;
      lbImg.alt = p.querySelector('img').alt;
      lb.classList.add('open');
      lb.setAttribute('aria-hidden', 'false');
    });
  });
  lb.addEventListener('click', closeLightbox);

  /* ---------- big heart finale ---------- */
  $('#bigHeart').addEventListener('click', (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2, 22);
  });
})();
