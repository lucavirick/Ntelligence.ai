document.addEventListener('DOMContentLoaded', () => {
    // 1. Entrance Animations (GSAP)
    const tl = gsap.timeline();

    tl.fromTo('.loader-logo',
        { clipPath: 'inset(0 100% 0 0)', opacity: 1 },
        { clipPath: 'inset(0 0% 0 0)', duration: 2.5, ease: 'power2.inOut' }
    )
        .to('#loader-overlay', {
            yPercent: -100,
            duration: 1.2,
            ease: 'power4.inOut',
            delay: 0.5
        })
        .to('.central-logo-img', {
            opacity: 1,
            scale: 1,
            startAt: { scale: 0.8 },
            duration: 2,
            ease: 'power4.out'
        }, "-=0.5")
        .to('.hero-subtitle', {
            opacity: 1,
            y: 0,
            stagger: 0.1,
            duration: 1,
            ease: 'power3.out'
        }, "-=1")
        .add(() => {
            initFlowAnimation();
        }, "-=2");

    // 2. Data Flow Animation (HTML5 Canvas)
    function initFlowAnimation() {
        const container = document.getElementById('canvas-container');
        const canvas = document.createElement('canvas');
        container.appendChild(canvas);
        const ctx = canvas.getContext('2d');

        let width, height, centerX, centerY;

        function resize() {
            width = canvas.width = container.clientWidth;
            height = canvas.height = container.clientHeight;
            centerX = width / 2;
            centerY = height / 2;
        }
        resize();
        window.addEventListener('resize', resize);

        const particles = [];
        const chars = ['1', '0', '$', '€', '£', '%', 'N', '↑', '+'];

        class Particle {
            constructor() {
                this.reset();
                // Randomize initial progress so they don't all start at the edges at once
                this.progress = Math.random();
            }

            reset() {
                // Pick a random angle
                this.angle = Math.random() * Math.PI * 2;
                // Start further outside but ensuring coverage
                this.radius = Math.max(width, height) * 0.9;
                this.speed = Math.random() * 0.0005 + 0.0002;
                this.char = chars[Math.floor(Math.random() * chars.length)];
                this.size = Math.random() * 14 + 8;
                this.progress = 0;

                // Color variations
                const rand = Math.random();
                if (rand > 0.9) {
                    this.color = '#dc2626'; // Bright Red
                    this.glow = true;
                } else if (rand > 0.6) {
                    this.color = '#7f1d1d'; // Dark Red
                    this.glow = false;
                } else {
                    this.color = 'rgba(255, 255, 255, 0.3)'; // Faint White
                    this.glow = false;
                }
            }

            update() {
                this.progress += this.speed;

                // Accelerate as it gets closer (gravitational pull effect)
                this.progress += this.progress * 0.005;

                if (this.progress >= 1) {
                    this.reset();
                }
            }

            draw() {
                // Calculate current position based on polar coordinates
                // We shrink the radius as progress goes 0 -> 1
                const currentRadius = this.radius * (1 - this.progress);

                // Add some spiral motion?
                // Let's modify angle slightly as it moves in for a "drain" effect
                const currentAngle = this.angle + (this.progress * 2);

                const x = centerX + Math.cos(currentAngle) * currentRadius;
                const y = centerY + Math.sin(currentAngle) * currentRadius;

                // Opacity fades in then out
                let alpha = 1;
                if (this.progress < 0.2) alpha = this.progress * 5;
                if (this.progress > 0.8) alpha = (1 - this.progress) * 5;

                ctx.globalAlpha = alpha;
                ctx.fillStyle = this.color;
                ctx.font = `${this.size}px 'Outfit'`;

                if (this.glow) {
                    ctx.shadowBlur = 10;
                    ctx.shadowColor = this.color;
                } else {
                    ctx.shadowBlur = 0;
                }

                ctx.fillText(this.char, x, y);

                // Draw a faint "trail" line for some fast particles
                if (this.speed > 0.005) {
                    const tailRadius = currentRadius + 20;
                    const tx = centerX + Math.cos(currentAngle - 0.05) * tailRadius;
                    const ty = centerY + Math.sin(currentAngle - 0.05) * tailRadius;

                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    ctx.lineTo(tx, ty);
                    ctx.strokeStyle = this.color;
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }

                ctx.globalAlpha = 1;
                ctx.shadowBlur = 0;
            }
        }

        // Initialize particles
        const particleCount = 250; // Lots of numbers
        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle());
        }

        function animate() {
            ctx.fillStyle = 'rgba(13, 2, 2, 0.1)'; // Clear with trailing effect
            ctx.fillRect(0, 0, width, height);

            particles.forEach(p => {
                p.update();
                p.draw();
            });

            requestAnimationFrame(animate);
        }

        animate();
    }
    // 3. SCROLL REVEAL ANIMATIONS (New Sections)
    // Simple Intersection Observer for fade-ups
    const observerOptions = {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Elements to reveal
    const revealElements = document.querySelectorAll('.service-block, .solution-card, .about-content, .about-visual, .contact-info, .precision-form');

    revealElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
        observer.observe(el);
    });

    // 4. FORM INTERACTION (Input Focus Effects)
    const inputs = document.querySelectorAll('.input-group input, .input-group textarea');
    inputs.forEach(input => {
        input.addEventListener('focus', () => {
            const label = input.previousElementSibling;
            if (label) label.style.color = '#dc2626';
        });
        input.addEventListener('blur', () => {
            const label = input.previousElementSibling;
            if (label && input.value === '') label.style.color = 'rgba(255,255,255,0.5)';
        });
    });

    // 6. NAVIGATION ACTIVE STATE
    const navLinks = document.querySelectorAll('.nav-item');
    window.addEventListener('scroll', () => {
        let current = '';
        const sections = document.querySelectorAll('section, main');

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (window.scrollY >= (sectionTop - 300)) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href').includes(current)) {
                link.classList.add('active');
            }
        });
    });

    // 7. FORM SUBMISSION (AJAX)
    const contactForm = document.getElementById('contact-form');
    const formStatus = document.getElementById('form-status');

    if (contactForm) {
        contactForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const data = new FormData(this);
            const action = this.action;

            formStatus.className = 'form-status'; // Reset
            formStatus.innerText = 'Sending...';
            formStatus.style.opacity = '1';

            try {
                const response = await fetch(action, {
                    method: 'POST',
                    body: data,
                    headers: {
                        'Accept': 'application/json'
                    }
                });

                if (response.ok) {
                    contactForm.reset();
                    formStatus.innerText = 'Thanks for reaching out! We will get back to you as soon as possible.';
                    formStatus.classList.add('success');
                } else {
                    const jsonData = await response.json();
                    if (jsonData.errors) {
                        formStatus.innerText = jsonData.errors.map(error => error.message).join(", ");
                    } else {
                        formStatus.innerText = "There was a problem submitting your form. Please try again.";
                    }
                    formStatus.classList.add('error');
                }
            } catch (error) {
                formStatus.innerText = "There was a problem submitting your form. Please try again.";
                formStatus.classList.add('error');
            }
        });
    }

    // 8. CUSTOM ANCHOR SCROLL
    // When any in-page anchor link is clicked, scroll so the section's
    // eyebrow (.section-tag) — or first heading if no eyebrow — lands
    // a comfortable distance below the floating nav, with breathing room.
    // Offset is calculated dynamically from the actual nav element so
    // it adapts to any viewport / nav size.
    const navEl = document.querySelector('.floating-nav');
    const BREATHING_ROOM = 28; // px between nav bottom and eyebrow top

    function getNavOffset() {
        if (!navEl) return 96;
        const navRect = navEl.getBoundingClientRect();
        // navRect.bottom is where the nav visually ends (relative to viewport)
        return Math.ceil(navRect.bottom + BREATHING_ROOM);
    }

    document.querySelectorAll('a[href^="#"]').forEach((link) => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (!href || href === '#') return;

            const target = document.querySelector(href);
            if (!target) return;

            // Prefer scrolling to the visible heading inside the section,
            // not the section's outer top (which is buried in padding).
            const focal = target.querySelector('.section-tag')
                       || target.querySelector('h1, h2, h3, h4')
                       || target;

            e.preventDefault();

            const focalY = focal.getBoundingClientRect().top + window.scrollY;
            const scrollTo = focalY - getNavOffset();

            window.scrollTo({
                top: scrollTo,
                behavior: 'smooth'
            });

            // Update URL fragment so browser back-button + bookmarks work
            if (history.pushState) {
                history.pushState(null, '', href);
            }
        });
    });
});
