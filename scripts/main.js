// Landing page: nav, hero video, highlights, RGBW color picker, installation tabs, Design image mode, Buy selector
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* sticky nav: border + active link */
  const lnav = document.getElementById('lnav');
  const onScroll = () => lnav.classList.toggle('stuck', scrollY > 0);
  addEventListener('scroll', onScroll, { passive:true }); onScroll();
  const links = [...lnav.querySelectorAll('a.sub')];
  const secObs = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) links.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id));
  }), { rootMargin:'-45% 0px -50% 0px' });
  links.forEach(a => { const h = a.getAttribute('href'); if (h.length < 2) return; const el = document.querySelector(h); if (el) secObs.observe(el); });

  /* generic tabs / segmented controls */
  document.querySelectorAll('[data-tabs]').forEach(box => {
    const btns = box.querySelectorAll('button[data-for]');
    btns.forEach(b => b.addEventListener('click', () => {
      btns.forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', x === b); });
      box.querySelectorAll('[data-pane]').forEach(p => p.classList.toggle('on', p.dataset.pane === b.dataset.for));
    }));
  });

  /* reveal on scroll */
  const rev = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); rev.unobserve(e.target); }
  }), { rootMargin:'0px 0px -12% 0px' });
  document.querySelectorAll('.pg-reveal').forEach(el => rev.observe(el));

  /* embedded videos: blob: URL, falling back to data: where blob: media is blocked.
     playFromStart() remembers that the video should be playing, so it also starts after the fallback or once it is ready. */
  function embedVideo(v) {
    const d = document.getElementById(v.dataset.embed); if (!d) return;
    const b64 = d.textContent.trim(), bin = atob(b64), buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    v.loop = false; v.controls = false; v.muted = true; v.playsInline = true;
    v.addEventListener('error', () => {
      if (!v.src.startsWith('blob:')) return;
      v.src = 'data:video/mp4;base64,' + b64; v.load();
      if (v._want) playFromStart(v);
    }, { once:true });
    v.addEventListener('contextmenu', e => e.preventDefault());
    v.src = URL.createObjectURL(new Blob([buf], { type:'video/mp4' }));
  }
  function playFromStart(v) {
    v._want = true;
    const go = () => { if (!v._want) return; try { v.currentTime = 0; } catch (e) {} v.play().catch(() => {}); };
    if (v.readyState >= 2) go(); else v.addEventListener('canplay', go, { once:true });
  }
  function stopVideo(v) { v._want = false; v.pause(); }

  /* highlights gallery: each slide shows 6 s; a video plays once from the start when its slide becomes active */
  const track = document.getElementById('galTrack'), slides = [...track.children];
  const dotsEl = document.getElementById('galDots'), play = document.getElementById('galPlay');
  const PAUSE = play.innerHTML, PLAY = '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M4 2.5v11a1 1 0 001.5.86l9-5.5a1 1 0 000-1.72l-9-5.5A1 1 0 004 2.5z"/></svg>';
  let gi = 0, playing = !reduce, inView = false;
  slides.forEach(s => s.querySelectorAll('video[data-embed]').forEach(embedVideo));
  const dots = slides.map((s, i) => {
    const b = document.createElement('button'); b.setAttribute('role', 'tab'); b.setAttribute('aria-label', s.dataset.name || 'Highlight ' + (i + 1));
    b.innerHTML = '<span></span>'; b.addEventListener('click', () => go(i));
    b.querySelector('span').addEventListener('animationend', () => go(gi + 1));
    dotsEl.appendChild(b); return b;
  });
  const curVideo = () => slides[gi].querySelector('video');
  function go(i) {
    gi = (i + slides.length) % slides.length;
    track.style.transform = `translateX(calc(${-gi} * (100% + 24px)))`;
    slides.forEach((s, k) => { s.classList.toggle('on', k === gi); s.setAttribute('aria-hidden', k !== gi);
      const v = s.querySelector('video'); if (v && k !== gi) stopVideo(v); });
    dots.forEach((d, k) => { d.classList.remove('on'); d.setAttribute('aria-selected', k === gi); });
    void dotsEl.offsetWidth; dots[gi].classList.add('on');
    const v = curVideo(); if (v) { if (playing && inView) playFromStart(v); else { stopVideo(v); try { v.currentTime = 0; } catch (e) {} } }
  }
  const sync = () => {
    dotsEl.classList.toggle('paused', !playing || !inView);
    play.innerHTML = playing ? PAUSE : PLAY; play.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    const v = curVideo(); if (v) { if (playing && inView) { if (!v.ended) { v._want = true; v.play().catch(() => {}); } } else stopVideo(v); }
  };
  play.addEventListener('click', () => { playing = !playing; sync(); });
  function holdGallery() { playing = false; dotsEl.classList.add('paused'); play.innerHTML = PLAY; play.setAttribute('aria-label', 'Play'); }
  new IntersectionObserver(es => { inView = es[0].isIntersecting; sync(); }, { threshold:.4 }).observe(track.parentElement);   // observe the gallery, not the moving track
  let sx = null;
  track.addEventListener('pointerdown', e => sx = e.clientX);
  track.addEventListener('pointerup', e => { if (sx === null) return; const dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 50) go(gi + (dx < 0 ? 1 : -1)); });
  go(0); sync();


  /* ---- HIGHLIGHTS · RGBW: pick a light color; the light in the video turns on in that color ----
     Same list as "Light colors" in Design. A WebGL shader recolors only the LED light and its glow
     (the red board, logo and housing keep their own color). Warm white shows the original video. */
  const RGBW_COLORS = [
    { name:'Warm white', css:'#ffc58a', tint:null },
    { name:'Cool white', css:'#eef4ff', tint:'#dfe9ff' },
    { name:'Red',        css:'#ff3b30', tint:'#ff1a1a' },
    { name:'Orange',     css:'#ff9500', tint:'#ff6a00' },
    { name:'Green',      css:'#34c759', tint:'#00ff3c' },
    { name:'Blue',       css:'#0a84ff', tint:'#0a3dff' },
    { name:'Purple',     css:'#bf5af2', tint:'#7a1aff' },
    { name:'Pink',       css:'#ff2d92', tint:'#ff1a8c' },
  ];
  const rgbwSlide = document.querySelector('.pg-slide[data-name="RGBW"]');
  const rgbwVid = rgbwSlide.querySelector('video'), rgbwCv = document.getElementById('rgbwCanvas');
  const rgbwSw = document.getElementById('rgbwSwatches'), rgbwName = document.getElementById('rgbwName');
  let rgbwTint = null, gl = null, glU = {}, glTex = null;
  (function initGL() {
    try { gl = rgbwCv.getContext('webgl', { premultipliedAlpha:false, preserveDrawingBuffer:true }); } catch (e) { gl = null; }
    if (!gl) return;
    const vs = 'attribute vec2 p; varying vec2 v; void main(){ v = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }';
    const fs = `precision mediump float; varying vec2 v; uniform sampler2D t; uniform vec3 tint; uniform vec2 c; uniform float asp;
      void main(){
        vec3 a = texture2D(t, v).rgb;
        float d = length(vec2((v.x - c.x) * asp, v.y - c.y));
        float l = dot(a, vec3(.299, .587, .114)), val = max(a.r, max(a.g, a.b)), gr = a.g / max(a.r, .001);
        float core = 1. - smoothstep(.26, .34, d);                                    // lens + LEDs
        float glow = (1. - smoothstep(.30, .80, d)) * (1. - smoothstep(.30, .55, l)); // soft halo around the module
        float m = clamp(core + glow, 0., 1.) * smoothstep(.42, .66, gr);              // skip the red board
        vec3 lit = tint * min(val * 1.15, 1.);
        float hot = smoothstep(.88, 1., l) * .45; lit = lit * (1. - hot) + hot;       // white-hot LED centres
        gl_FragColor = vec4(mix(a, lit, m), 1.);
      }`;
    const sh = (type, src) => { const o = gl.createShader(type); gl.shaderSource(o, src); gl.compileShader(o); return o; };
    const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { gl = null; return; }
    gl.useProgram(pr);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    ['tint', 'c', 'asp'].forEach(n => glU[n] = gl.getUniformLocation(pr, n));
    gl.uniform2f(glU.c, 0.498, 1 - 0.481);          // LED centre in the RGBW video (x, y from bottom)
    glTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, glTex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach(k => gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  })();
  const hex3 = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
  function drawRGBW() {
    if (!gl || !rgbwTint || rgbwVid.readyState < 2) return;
    const w = rgbwVid.videoWidth, h = rgbwVid.videoHeight;
    if (rgbwCv.width !== w || rgbwCv.height !== h) { rgbwCv.width = w; rgbwCv.height = h; gl.viewport(0, 0, w, h); }
    try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, rgbwVid); }
    catch (e) { gl = null; rgbwCv.classList.remove('live'); return; }   // video not readable -> plain video
    gl.uniform3fv(glU.tint, hex3(rgbwTint)); gl.uniform1f(glU.asp, w / h);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    rgbwCv.classList.add('live');
  }
  (function rgbwLoop() { if (rgbwTint && rgbwSlide.classList.contains('on')) drawRGBW(); requestAnimationFrame(rgbwLoop); })();
  ['seeked', 'loadeddata', 'ended'].forEach(ev => rgbwVid.addEventListener(ev, drawRGBW));
  RGBW_COLORS.forEach((c, i) => {
    const b = document.createElement('button');
    b.className = 'sw' + (i === 0 ? ' on' : ''); b.style.background = c.css;
    b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', i === 0); b.setAttribute('aria-label', c.name); b.title = c.name;
    b.addEventListener('click', () => {
      [...rgbwSw.children].forEach(x => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-checked', on); });
      rgbwName.textContent = c.name; rgbwTint = c.tint;
      if (!rgbwTint || !gl) rgbwCv.classList.remove('live');
      holdGallery();                 // stop auto-advance so the visitor can watch the color
      playFromStart(rgbwVid);        // the light turns on again, now in the chosen color
    });
    rgbwSw.appendChild(b);
  });

  /* ---- BUY · product selector: length + channel color + cap color -> Buy now goes to checkout ----
     Set CHECKOUT_URL to the store's checkout / cart URL. The choices are sent as query parameters. */
  const CHECKOUT_URL = '#checkout';
  const buyFixed = document.getElementById('buyFixed');
  new IntersectionObserver(es => buyFixed.classList.toggle('away', es[0].isIntersecting), { threshold:.25 }).observe(document.getElementById('buy'));
  const cfg = { length:null, channel:null, cap:null };
  const NAMES = { 'white':'White', 'black':'Black', 'muskett-brown':'Muskett Brown', 'dark-bronze':'Dark Bronze',
                  'pebblestone-clay':'Pebblestone Clay', 'clear':'Clear', 'grey':'Grey' };
  // price per length (ft -> USD)
  const PRICES = { 50:840, 100:1340, 150:1840, 200:2340, 250:2840, 300:3340, 350:3840, 400:4340, 450:4840 };
  // regular (before-discount) price per length, shown struck through
  const REGULAR = { 50:1050, 100:1675, 150:2300, 200:2925, 250:3550, 300:4175, 350:4800, 400:5425, 450:6050 };
  const money = n => '$' + n.toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 });
  const buyNow = document.getElementById('buyNow'), buyHint = document.getElementById('buyHint');
  const cfgSum = document.getElementById('cfgSum'), cfgImgs = [...document.querySelectorAll('#cfgMedia img')];
  const cfgPrice = document.getElementById('cfgPrice'), cfgPriceNote = document.getElementById('cfgPriceNote');
  function updateCfg() {
    // the image for the selected length (50 ft until a length is chosen)
    cfgImgs.forEach(im => im.classList.toggle('show', im.dataset.len === String(cfg.length || 50)));
    const L = cfg.length || 50;
    cfgPrice.textContent = (cfg.length ? '' : 'From ') + money(PRICES[L]);
    document.getElementById('cfgWas').textContent = money(REGULAR[L]);
    document.getElementById('cfgSave').textContent = 'Save ' + money(REGULAR[L] - PRICES[L]);
    cfgPriceNote.textContent = cfg.length ? `Clicklight bundle · ${cfg.length} ft` : 'Choose a length to see the price.';
    const parts = [cfg.length && `<b>${cfg.length} ft</b>`, cfg.channel && `${NAMES[cfg.channel]} channel`, cfg.cap && `${NAMES[cfg.cap]} caps`].filter(Boolean);
    cfgSum.innerHTML = 'Clicklight' + (parts.length ? ' · ' + parts.join(' · ') : '');
    const missing = Object.keys(cfg).filter(k => !cfg[k]);
    const ready = !missing.length;
    buyNow.setAttribute('aria-disabled', !ready);
    buyNow.textContent = ready ? `Buy now · ${money(PRICES[cfg.length])}` : 'Buy now';
    buyNow.href = ready ? `${CHECKOUT_URL}${CHECKOUT_URL.includes('?') ? '&' : '?'}product=clicklight&length=${cfg.length}&channel=${cfg.channel}&cap=${cfg.cap}` : '#';
    buyHint.textContent = ready ? `${cfg.length} ft · ${NAMES[cfg.channel]} channel · ${NAMES[cfg.cap]} caps`
      : 'Choose ' + missing.map(k => ({ length:'a length', channel:'a channel color', cap:'a cap color' })[k]).join(', ').replace(/, ([^,]*)$/, ' and $1') + '.';
  }
  document.querySelectorAll('#cfgForm [role="radiogroup"]').forEach(g => {
    const key = g.dataset.key, opts = [...g.querySelectorAll('.pg-opt')];
    opts.forEach(o => o.addEventListener('click', () => {
      opts.forEach(x => x.setAttribute('aria-checked', x === o));
      cfg[key] = o.dataset.val; updateCfg();
    }));
  });
  buyNow.addEventListener('click', e => { if (buyNow.getAttribute('aria-disabled') === 'true') { e.preventDefault(); buyHint.animate([{ opacity:.3 }, { opacity:1 }], 400); } });
  updateCfg();

  /* ---- HERO: video plays once and stays on the last frame ---- */
  const hv = document.getElementById('heroVideo'), hd = document.getElementById('hero-video-data');
  if (hd) {
    const bin = atob(hd.textContent.trim()), buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    hv.src = URL.createObjectURL(new Blob([buf], { type:'video/mp4' }));
    // if blob: media is blocked (some previews), fall back to a data: URL
    hv.addEventListener('error', () => { if (hv.src.startsWith('blob:')) { hv.src = 'data:video/mp4;base64,' + hd.textContent.trim(); hv.play().catch(showLastFrame); } }, { once:true });
  }
  hv.loop = false; hv.controls = false; hv.muted = true;
  var showLastFrame = () => { const go = () => { hv.currentTime = Math.max(0, hv.duration - 0.04); };
    hv.readyState >= 1 ? go() : hv.addEventListener('loadedmetadata', go, { once:true }); };
  const pr = hv.play(); if (pr && pr.catch) pr.catch(showLastFrame);   // if the browser blocks autoplay: show the last frame
  hv.addEventListener('ended', () => hv.pause());
  hv.addEventListener('contextmenu', e => e.preventDefault());

  /* ---- DESIGN: 3D switch (always starts OFF) + options with images ---- */
  const sw3d = document.getElementById('sw3d'), frame = document.getElementById('designFrame');
  const dImg = document.getElementById('dImg'), closerEl = document.getElementById('closer');
  function set3d(on) {
    sw3d.setAttribute('aria-checked', on); frame.classList.toggle('is-3d', on);
    closerEl.inert = !on; dImg.inert = on;
    if (on) dispatchEvent(new Event('resize'));
  }
  sw3d.addEventListener('click', () => set3d(sw3d.getAttribute('aria-checked') !== 'true'));
  set3d(false);

  const dNav = dImg.querySelector('.features'), dItems = [...dNav.querySelectorAll('li')];
  const dFigs = [...dImg.querySelectorAll('figure')];
  let dCur = null;
  dImg.querySelectorAll('video[data-embed]').forEach(embedVideo);
  const chVids = [...dImg.querySelectorAll('figure[data-img="channels"] video')];
  const chBtns = [...dImg.querySelectorAll('#dChOpts button')];
  let chCur = (chBtns.find(b => b.classList.contains('on')) || chBtns[0]).dataset.ch;
  const playCh = () => chVids.forEach(v => {          // selected finish plays once from the start and holds its last frame
    const on = v.dataset.ch === chCur; v.classList.toggle('show', on);
    if (on) playFromStart(v); else stopVideo(v);
  });
  chBtns.forEach(b => b.addEventListener('click', () => {
    chCur = b.dataset.ch;
    chBtns.forEach(x => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); });
    playCh();
  }));
  const showFig = id => {
    dFigs.forEach(f => f.classList.toggle('show', f.dataset.img === id));
    if (id === 'channels') playCh(); else chVids.forEach(stopVideo);
    dFigs.forEach(f => { if (f.dataset.img === 'channels') return;      // single-video options: play once from the start
      f.querySelectorAll('video').forEach(v => f.dataset.img === id ? playFromStart(v) : stopVideo(v)); });
  };
  function openD(id) {
    dCur = id; dNav.classList.add('open');
    dItems.forEach(li => { const on = li.dataset.id === id; li.classList.toggle('active', on); li.querySelector('.pill').setAttribute('aria-expanded', on); });
    showFig(id);
  }
  function closeD() {
    dCur = null; dNav.classList.remove('open');
    dItems.forEach(li => { li.classList.remove('active'); li.querySelector('.pill').setAttribute('aria-expanded', false); });
    showFig('default');
  }
  const stepD = d => { const i = dItems.findIndex(li => li.dataset.id === dCur); openD(dItems[(i + d + dItems.length) % dItems.length].dataset.id); };
  dItems.forEach(li => li.querySelector('.pill').addEventListener('click', () => openD(li.dataset.id)));
  dImg.querySelector('[data-nav="prev"]').addEventListener('click', () => stepD(-1));
  dImg.querySelector('[data-nav="next"]').addEventListener('click', () => stepD(1));
  dImg.querySelector('[data-nav="close"]').addEventListener('click', closeD);
  addEventListener('keydown', e => { if (e.key === 'Escape' && dCur && !frame.classList.contains('is-3d')) closeD(); });
  closeD();
})();
