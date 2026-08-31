/* ============================================================
   MARCATI TELONI v2 — Main JavaScript
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ---- Navbar scroll effect ---- */
  const navbar = document.getElementById('navbar');
  if (navbar) {
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 20);
    }, { passive: true });
  }

  /* ---- Mobile nav toggle ---- */
  const navToggle = document.querySelector('.nav-toggle');
  const navMobile = document.querySelector('.nav-mobile');
  if (navToggle && navMobile) {
    navToggle.addEventListener('click', () => {
      navToggle.classList.toggle('open');
      navMobile.classList.toggle('open');
    });
    // Close on link click
    navMobile.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navToggle.classList.remove('open');
        navMobile.classList.remove('open');
      });
    });
  }

  /* ---- Active nav link ---- */
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a, .nav-mobile a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });

  /* ---- Back to top ---- */
  const btt = document.getElementById('back-to-top');
  if (btt) {
    window.addEventListener('scroll', () => {
      btt.classList.toggle('visible', window.scrollY > 400);
    }, { passive: true });
    btt.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ---- Carousel ---- */
  const wrapper = document.querySelector('.carousel-wrapper');
  if (wrapper) {
    const track = wrapper.querySelector('.carousel-track');
    const slides = track ? track.querySelectorAll('.carousel-slide') : [];
    const dotsContainer = document.querySelector('.carousel-dots');
    const prevBtn = wrapper.querySelector('.carousel-prev');
    const nextBtn = wrapper.querySelector('.carousel-next');
    let current = 0;
    let autoplayTimer = null;
    const total = slides.length;

    if (total === 0) return;

    // Build dots
    if (dotsContainer) {
      slides.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.classList.add('carousel-dot');
        dot.setAttribute('aria-label', `Diapositiva ${i + 1}`);
        if (i === 0) dot.classList.add('active');
        dot.addEventListener('click', () => goTo(i));
        dotsContainer.appendChild(dot);
      });
    }

    function updateDots() {
      if (!dotsContainer) return;
      dotsContainer.querySelectorAll('.carousel-dot').forEach((d, i) => {
        d.classList.toggle('active', i === current);
      });
    }

    function goTo(index) {
      current = (index + total) % total;
      track.style.transform = `translateX(-${current * 100}%)`;
      updateDots();
    }

    function next() { goTo(current + 1); }
    function prev() { goTo(current - 1); }

    if (prevBtn) prevBtn.addEventListener('click', () => { prev(); resetAutoplay(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { next(); resetAutoplay(); });

    // Keyboard
    wrapper.setAttribute('tabindex', '0');
    wrapper.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft') { prev(); resetAutoplay(); }
      if (e.key === 'ArrowRight') { next(); resetAutoplay(); }
    });

    // Touch/swipe
    let startX = 0;
    wrapper.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
    wrapper.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 40) { dx < 0 ? next() : prev(); resetAutoplay(); }
    });

    // Autoplay
    function startAutoplay() {
      autoplayTimer = setInterval(next, 6000);
    }
    function resetAutoplay() {
      clearInterval(autoplayTimer);
      startAutoplay();
    }

    // Pause on hover
    wrapper.addEventListener('mouseenter', () => clearInterval(autoplayTimer));
    wrapper.addEventListener('mouseleave', startAutoplay);

    startAutoplay();
  }

  /* ---- Quote form ---- */
  const form = document.getElementById('quote-form');
  if (form) {
    // Show success/error from URL params
    const params = new URLSearchParams(window.location.search);
    const successEl = document.getElementById('form-success');
    const errorEl = document.getElementById('form-error');

    if (params.get('success') === 'true' && successEl) {
      successEl.classList.add('visible');
      form.style.display = 'none';
      // Scroll to form area
      document.getElementById('preventivo')?.scrollIntoView({ behavior: 'smooth' });
    }
    if (params.get('error') === 'true' && errorEl) {
      errorEl.classList.add('visible');
    }

    // Validate form before submitting to /api/contact (Cloudflare Function)
    const isLocalEnv = window.location.protocol === 'file:' ||
                       window.location.hostname === 'localhost' ||
                       window.location.hostname === '127.0.0.1';

    const submitBtn = form.querySelector('#submit-btn');

    // Validate and submit on button click
    if (submitBtn) {
      submitBtn.addEventListener('click', async () => {
        const nome = form.querySelector('[name="nome"]')?.value.trim();
        const cognome = form.querySelector('[name="cognome"]')?.value.trim();
        const email = form.querySelector('[name="email"]')?.value.trim();
        const telefono = form.querySelector('[name="telefono"]')?.value.trim();
        const prodotto = form.querySelector('[name="prodotto"]')?.value.trim();
        const messaggio = form.querySelector('[name="messaggio"]')?.value.trim();
        const privacy = form.querySelector('[name="privacy"]')?.checked;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        // Reset messages
        if (successEl) successEl.classList.remove('visible');
        if (errorEl) { errorEl.classList.remove('visible'); errorEl.textContent = ''; }

        if (!nome || !cognome || !email || !telefono || !messaggio) {
          if (errorEl) {
            errorEl.textContent = 'Compila tutti i campi obbligatori.';
            errorEl.classList.add('visible');
          }
          return;
        }
        if (!emailRegex.test(email)) {
          if (errorEl) {
            errorEl.textContent = 'Inserisci un indirizzo email valido.';
            errorEl.classList.add('visible');
          }
          return;
        }
        if (!privacy) {
          if (errorEl) {
            errorEl.textContent = 'È necessario accettare la Privacy Policy.';
            errorEl.classList.add('visible');
          }
          return;
        }

        const nomeCompleto = cognome ? `${nome} ${cognome}` : nome;

        // Local fallback: open mailto client
        if (isLocalEnv) {
          openMailto(nomeCompleto, email, telefono, prodotto, messaggio);
          if (successEl) {
            successEl.classList.add('visible');
            form.style.display = 'none';
          }
          return;
        }

        // Submit via fetch
        const originalBtnText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Invio in corso…';

        try {
          const formData = new FormData(form);
          const response = await fetch('/api/contact', {
            method: 'POST',
            body: formData,
          });

          // Try to parse JSON, but fallback to checking response.ok
          let result;
          try {
            result = await response.json();
          } catch {
            result = { success: response.ok };
          }

          if (result.success) {
            if (successEl) {
              successEl.classList.add('visible');
              successEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            form.style.display = 'none';
            // Hide the form title too
            const formTitle = form.parentElement.querySelector('h3');
            if (formTitle) formTitle.style.display = 'none';
          } else {
            throw new Error(result.error || 'Errore sconosciuto');
          }
        } catch (err) {
          openMailto(nomeCompleto, email, telefono, prodotto, messaggio);
          if (errorEl) {
            errorEl.textContent = err.message || 'Impossibile contattare il server. Apertura client email alternativo…';
            errorEl.classList.add('visible');
            errorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = originalBtnText;
        }
      });
    }

    function openMailto(nomeCompleto, email, telefono, prodotto, messaggio) {
      const subject = encodeURIComponent(`Richiesta preventivo da ${nomeCompleto}`);
      const body = encodeURIComponent(
        `Nome: ${nomeCompleto}\n` +
        `Email: ${email}\n` +
        `Telefono: ${telefono || 'Non fornito'}\n` +
        `Prodotto: ${prodotto || 'Non specificato'}\n\n` +
        `Messaggio:\n${messaggio}`
      );
      window.location.href = `mailto:info@marcatiteloni.com?subject=${subject}&body=${body}`;
    }
  }

  /* ---- Animate on scroll ---- */
  const animateEls = document.querySelectorAll('[data-animate]');
  if (animateEls.length && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animated');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    animateEls.forEach(el => observer.observe(el));
  }

});
