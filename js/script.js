/* ================================================
   NTELLIGENCE — INTERACTIONS & ANIMATIONS
   ================================================ */

window.addEventListener('load', () => {

    /* ─── DOT SPHERE ───────────────────────────────
       Fibonacci-distributed particles spiral in
       from a chaotic cloud and settle into a
       breathing red sphere with mouse parallax,
       per-dot shimmer, and bloom-rendered dots.
    ──────────────────────────────────────────────── */

    const canvas = document.getElementById('earth-canvas');
    const ctx    = canvas.getContext('2d');

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W, H, cx, cy, R;

    function resize() {
        const rect = canvas.getBoundingClientRect();
        W = rect.width;
        H = rect.height;
        canvas.width  = W * dpr;
        canvas.height = H * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        cx = W / 2;
        cy = H / 2;
        R  = Math.min(W, H) * (W < 700 ? 0.40 : 0.36);
    }

    /* ── Pre-rendered bloom sprite ───────────────
       One radial-gradient circle. Drawn per dot
       via drawImage — 10× faster than per-frame
       gradient creation, gives true circular bloom.
    ───────────────────────────────────────────── */
    const SPRITE_SIZE = 36;
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = SPRITE_SIZE;
    {
        const sctx = sprite.getContext('2d');
        const c = SPRITE_SIZE / 2;
        const g = sctx.createRadialGradient(c, c, 0, c, c, c);
        g.addColorStop(0.00, 'rgba(255, 180, 180, 1.00)');
        g.addColorStop(0.10, 'rgba(255,  90,  90, 0.95)');
        g.addColorStop(0.25, 'rgba(220,  38,  38, 0.55)');
        g.addColorStop(0.55, 'rgba(220,  38,  38, 0.18)');
        g.addColorStop(1.00, 'rgba(220,  38,  38, 0)');
        sctx.fillStyle = g;
        sctx.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
    }

    /* ── Fibonacci sphere — perfectly even coverage ── */
    const DOT_COUNT = 1700;
    const dots = [];
    const GOLDEN = Math.PI * (3 - Math.sqrt(5));

    for (let i = 0; i < DOT_COUNT; i++) {
        // even distribution: y stratified, theta golden-angle stepped
        const y = 1 - (i / (DOT_COUNT - 1)) * 2;
        const ringR = Math.sqrt(1 - y * y);
        const theta = GOLDEN * i;

        const fx = Math.cos(theta) * ringR;
        const fy = y;
        const fz = Math.sin(theta) * ringR;

        // Random rotation axis (unit vector) for entrance swirl
        const ax = Math.random() - 0.5;
        const ay = Math.random() - 0.5;
        const az = Math.random() - 0.5;
        const aLen = Math.hypot(ax, ay, az) || 1;

        dots.push({
            fx, fy, fz,
            axX: ax / aLen,
            axY: ay / aLen,
            axZ: az / aLen,
            // Significant swirl: 1.2π to 2.4π — feels orbital, not chaotic
            swirl:       (1.2 + Math.random() * 1.2) * Math.PI,
            startRadius: 2.0 + Math.random() * 1.4,
            delay:       Math.random() * 1400,           // staggered start
            duration:    2700 + Math.random() * 400,     // ~2.7-3.1s per dot
            phase:       Math.random() * Math.PI * 2     // for idle shimmer
        });
    }

    /* ── Rodrigues' rotation: rotate v around unit axis a by angle θ ── */
    function rotateAxis(vx, vy, vz, ax, ay, az, t) {
        const ct = Math.cos(t), st = Math.sin(t);
        const k = 1 - ct;
        const dot = vx * ax + vy * ay + vz * az;
        return [
            vx * ct + (ay * vz - az * vy) * st + ax * dot * k,
            vy * ct + (az * vx - ax * vz) * st + ay * dot * k,
            vz * ct + (ax * vy - ay * vx) * st + az * dot * k
        ];
    }

    /* ── Mouse parallax ─────────────────────────── */
    let mouseX = 0, mouseY = 0;
    let parX = 0, parY = 0;
    window.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
        mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });

    /* ── Easings ───────────────────────────────── */
    const easeOutExpo  = (t) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);

    const startTs = performance.now();

    function tick(now) {
        ctx.clearRect(0, 0, W, H);

        const elapsed = now - startTs;

        // smooth parallax follow
        parX += (mouseX - parX) * 0.045;
        parY += (mouseY - parY) * 0.045;

        // global rotation = slow base spin + parallax tilt
        const tiltY = parX * 0.18 + elapsed * 0.00012;
        const tiltX = parY * 0.13;
        const cY = Math.cos(tiltY), sY = Math.sin(tiltY);
        const cX = Math.cos(tiltX), sX = Math.sin(tiltX);

        // subtle breathing scale (~0.8% amplitude, slow)
        const breathe = 1 + 0.008 * Math.sin(elapsed * 0.00075);
        const Rb = R * breathe;

        /* ── soft red halo behind sphere ── */
        const halo = ctx.createRadialGradient(cx, cy, Rb * 0.55, cx, cy, Rb * 1.45);
        halo.addColorStop(0, 'rgba(220, 38, 38, 0.06)');
        halo.addColorStop(1, 'rgba(220, 38, 38, 0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(cx, cy, Rb * 1.45, 0, Math.PI * 2);
        ctx.fill();

        /* ── render dots with bloom sprite ── */
        for (let i = 0; i < dots.length; i++) {
            const d = dots[i];

            const localT = (elapsed - d.delay) / d.duration;
            if (localT <= 0) continue;
            const t = Math.min(1, localT);

            // angular settles via quart, radial via expo (snappy collapse)
            const angT = easeOutQuart(t);
            const radT = easeOutExpo(t);

            const ang = d.swirl * (1 - angT);
            const rr  = 1 + (d.startRadius - 1) * (1 - radT);

            // current 3D position: rotate final around axis by ang, scale by rr
            let [px, py, pz] = rotateAxis(d.fx, d.fy, d.fz, d.axX, d.axY, d.axZ, ang);
            px *= rr; py *= rr; pz *= rr;

            // After settle: subtle per-dot radial pulse — sphere feels alive
            if (t >= 1) {
                const pulse = 1 + 0.010 * Math.sin(elapsed * 0.0028 + d.phase);
                px *= pulse; py *= pulse; pz *= pulse;
            }

            // World rotation: Y first, then X
            const xr =  px * cY + pz * sY;
            const zr = -px * sY + pz * cY;
            const yr =  py * cX - zr * sX;
            const zt =  py * sX + zr * cX;

            // Project to screen
            const sx = cx + xr * Rb;
            const sy = cy + yr * Rb;

            // Depth: -1 back .. +1 front
            const depth = (zt + 1) / 2;
            if (depth < 0.05) continue;
            const depthSq = depth * depth;

            // Per-dot brightness shimmer (slow sine, individual phase)
            const shimmer = 0.82 + 0.18 * Math.sin(elapsed * 0.0011 + d.phase * 2.7);

            // Entry alpha & size scale
            const alpha = (0.07 + depthSq * 0.93) * t * shimmer;
            const baseSize = 0.7 + depthSq * 2.2;

            // Bloom sprite — drawn at ~6× core size for halo
            const drawSize = baseSize * 5.5;
            ctx.globalAlpha = alpha;
            ctx.drawImage(
                sprite,
                sx - drawSize / 2, sy - drawSize / 2,
                drawSize, drawSize
            );
        }
        ctx.globalAlpha = 1;

        requestAnimationFrame(tick);
    }

    resize();
    requestAnimationFrame(tick);

    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(resize, 120);
    }, { passive: true });

    /* ─── NAV: glass on scroll ───────────────── */

    const nav = document.getElementById('nav');
    window.addEventListener('scroll', () => {
        nav.classList.toggle('scrolled', window.scrollY > 60);
    }, { passive: true });

    /* ─── GSAP SETUP ─────────────────────────── */

    gsap.registerPlugin(ScrollTrigger);

    /* ─── HERO entrance ──────────────────────────
       Logo/text appear as the sphere is finishing
       its formation — ~1.6s in, settles by ~4s.
    ──────────────────────────────────────────── */

    const heroTl = gsap.timeline({ delay: 1.6 });

    heroTl
        .to('.hero-logo-large', {
            opacity: 1, y: 0, duration: 1.6, ease: 'power3.out'
        })
        .to('.hero-sub', {
            opacity: 1, duration: 0.9, ease: 'power2.out'
        }, '-=0.7')
        .to('.hero-rule', {
            opacity: 1, duration: 0.7, ease: 'power2.out'
        }, '-=0.5')
        .to('.scroll-hint', {
            opacity: 1, duration: 0.5, ease: 'power1.out'
        }, '-=0.2');

    /* ─── SECTION SCROLL REVEALS ────────────────
       Each section reveals: label → headline →
       bodies → details (cards/points/stats).
    ─────────────────────────────────────────── */

    gsap.utils.toArray('.section').forEach((section) => {

        const label    = section.querySelector('.section-label');
        const headline = section.querySelector('.section-headline');
        const bodies   = section.querySelectorAll('.section-body');
        const details  = section.querySelectorAll(
            '.bridge-side, .bridge-flow, .seam-value, ' +
            '.offering-card, .why-us-anchor, ' +
            '.cta-actions > *'
        );

        const all = [label, headline, ...bodies, ...details].filter(Boolean);
        if (!all.length) return;

        // Initial state
        gsap.set(label,    { opacity: 0, y: 14 });
        gsap.set(headline, { opacity: 0, y: 40 });
        gsap.set(bodies,   { opacity: 0, y: 22 });
        gsap.set(details,  { opacity: 0, y: 24 });

        // Reveal timeline
        const tl = gsap.timeline({ paused: true });

        if (label)    tl.to(label,    { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' });
        if (headline) tl.to(headline, { opacity: 1, y: 0, duration: 1.0, ease: 'power3.out' }, '-=0.35');
        if (bodies.length)
            tl.to(bodies,  { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out', stagger: 0.12 }, '-=0.55');
        if (details.length)
            tl.to(details, { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out', stagger: 0.08 }, '-=0.45');

        ScrollTrigger.create({
            trigger: section,
            start: 'top 78%',
            end:   'bottom top',
            onEnter:     () => tl.play(),
            onEnterBack: () => tl.play(),
            onLeaveBack: () => tl.reverse()
        });
    });

    /* ─── SMOOTH SCROLL for anchor links ─────── */

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            const href = anchor.getAttribute('href');
            if (href === '#') return;
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                const offset = nav.offsetHeight + 20;
                const top    = target.getBoundingClientRect().top + window.scrollY - offset;
                window.scrollTo({ top, behavior: 'smooth' });
            }
        });
    });

});
