/* ============================================================
   MARCATI TELONI v2 — Carrello & checkout (modalità demo)
   Il pagamento reale (Stripe) si attiva aggiungendo le chiavi
   API lato server: il flusso cliente resta identico.
   ============================================================ */

(function () {
  const STORAGE_KEY = 'mt_carrello_v1';

  let articoli = carica();

  function carica() {
    try {
      const dati = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return Array.isArray(dati) ? dati : [];
    } catch {
      return [];
    }
  }

  function salva() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(articoli));
  }

  const slug = (testo) => String(testo)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const formatPrezzo = (valore) =>
    new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(valore);

  const escapeHtml = (testo) => {
    const div = document.createElement('div');
    div.textContent = testo ?? '';
    return div.innerHTML;
  };

  const subtotale = () => articoli.reduce((somma, a) => somma + a.prezzo * a.qty, 0);
  const costoSpedizione = () => articoli.length
    ? articoli.reduce((max, a) => Math.max(max, a.spedizione || 0), 0)
    : 0;
  const totale = () => subtotale() + costoSpedizione();
  const ivaInclusa = () => totale() - totale() / 1.22;
  const conteggio = () => articoli.reduce((somma, a) => somma + a.qty, 0);

  /* ---- riferimenti DOM ---- */
  const btnCarrello = document.getElementById('cart-btn');
  const contatore = document.getElementById('cart-count');
  const overlay = document.getElementById('cart-overlay');
  const drawer = document.getElementById('cart-drawer');
  const listaItems = document.getElementById('cart-items');
  const totaleEl = document.getElementById('cart-total');
  const btnCheckout = document.getElementById('cart-checkout-btn');
  const modal = document.getElementById('checkout-modal');
  const vistaForm = document.getElementById('checkout-form-view');
  const vistaSuccess = document.getElementById('checkout-success-view');
  const riepilogo = document.getElementById('checkout-summary');
  const form = document.getElementById('checkout-form');
  const toast = document.getElementById('cart-toast');

  if (!btnCarrello || !drawer) return;

  /* ---- toast ---- */
  let toastTimer = null;
  function mostraToast(testo) {
    if (!toast) return;
    toast.textContent = testo;
    toast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 2200);
  }

  /* ---- drawer ---- */
  function apriDrawer() {
    drawer.classList.add('open');
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function chiudiDrawer() {
    drawer.classList.remove('open');
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  /* ---- rendering carrello ---- */
  function aggiornaUI() {
    const n = conteggio();
    if (contatore) {
      contatore.textContent = n;
      contatore.classList.toggle('visible', n > 0);
    }
    const subEl = document.getElementById('cart-subtotal');
    const shipEl = document.getElementById('cart-shipping');
    if (subEl) subEl.textContent = formatPrezzo(subtotale());
    if (shipEl) shipEl.textContent = articoli.length
      ? (costoSpedizione() > 0 ? formatPrezzo(costoSpedizione()) : 'Gratuita')
      : '—';
    if (totaleEl) totaleEl.textContent = formatPrezzo(totale());
    const ivaEl = document.getElementById('cart-iva');
    if (ivaEl) ivaEl.textContent = formatPrezzo(ivaInclusa());
    if (btnCheckout) btnCheckout.disabled = articoli.length === 0;

    if (!listaItems) return;
    if (!articoli.length) {
      listaItems.innerHTML = '<p class="cart-empty">Il carrello è vuoto.</p>';
      return;
    }
    listaItems.innerHTML = articoli.map(a => `
      <div class="cart-item" data-id="${escapeHtml(a.id)}">
        <img src="${escapeHtml(a.immagine)}" alt="${escapeHtml(a.nome)}">
        <div>
          <div class="cart-item-name">${escapeHtml(a.nome)}</div>
          <div class="cart-item-price">${formatPrezzo(a.prezzo)}</div>
          <div class="cart-qty">
            <button type="button" data-azione="meno" aria-label="Riduci quantità">&minus;</button>
            <span>${a.qty}</span>
            <button type="button" data-azione="piu" aria-label="Aumenta quantità">+</button>
          </div>
        </div>
        <button type="button" class="cart-item-remove" data-azione="rimuovi" aria-label="Rimuovi dal carrello">&#10005;</button>
      </div>`).join('');
  }

  /* ---- API pubblica per store.js ---- */
  window.MTCart = {
    aggiungi(prodotto) {
      const id = slug(prodotto.nome);
      const esistente = articoli.find(a => a.id === id);
      if (esistente) esistente.qty += 1;
      else articoli.push({
        id,
        nome: prodotto.nome,
        prezzo: prodotto.prezzo,
        spedizione: prodotto.spedizione || 0,
        immagine: prodotto.immagine,
        qty: 1
      });
      salva();
      aggiornaUI();
      mostraToast('Aggiunto al carrello');
    },
    apri: apriDrawer
  };

  /* ---- eventi drawer ---- */
  btnCarrello.addEventListener('click', apriDrawer);
  document.getElementById('cart-close')?.addEventListener('click', chiudiDrawer);
  overlay.addEventListener('click', chiudiDrawer);

  listaItems?.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-azione]');
    if (!btn) return;
    const id = btn.closest('.cart-item').dataset.id;
    const articolo = articoli.find(a => a.id === id);
    if (!articolo) return;

    const azione = btn.dataset.azione;
    if (azione === 'piu') articolo.qty += 1;
    if (azione === 'meno') articolo.qty = Math.max(1, articolo.qty - 1);
    if (azione === 'rimuovi') articoli = articoli.filter(a => a.id !== id);

    salva();
    aggiornaUI();
  });

  /* ---- checkout ---- */
  function apriModal() {
    if (!articoli.length) return;
    chiudiDrawer();
    vistaForm.hidden = false;
    vistaSuccess.hidden = true;
    riepilogo.innerHTML = articoli.map(a => `
      <div class="cart-summary-row">
        <span>${a.qty} &times; ${escapeHtml(a.nome)}</span>
        <span>${formatPrezzo(a.prezzo * a.qty)}</span>
      </div>`).join('') + `
      <div class="cart-summary-row">
        <span>Spedizione nazionale</span>
        <span>${costoSpedizione() > 0 ? formatPrezzo(costoSpedizione()) : 'Gratuita'}</span>
      </div>
      <div class="cart-summary-row total">
        <span>Totale indicativo</span>
        <span>${formatPrezzo(totale())}</span>
      </div>
      <div class="cart-summary-row" style="color:var(--gray);font-size:0.8rem;">
        <span>di cui IVA (22%) inclusa</span>
        <span>${formatPrezzo(ivaInclusa())}</span>
      </div>`;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function chiudiModal() {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  btnCheckout?.addEventListener('click', apriModal);
  document.getElementById('checkout-cancel')?.addEventListener('click', chiudiModal);
  document.getElementById('checkout-done')?.addEventListener('click', chiudiModal);

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (modal.classList.contains('open')) chiudiModal();
    else if (drawer.classList.contains('open')) chiudiDrawer();
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;

    const dati = new FormData(form);
    const ordine = {
      codice: generaCodice(),
      data: new Date().toISOString(),
      articoli: articoli.map(a => ({ id: a.id, nome: a.nome, prezzo: a.prezzo, qty: a.qty })),
      subtotale: subtotale(),
      spedizione: costoSpedizione(),
      iva_inclusa: ivaInclusa(),
      totale: totale(),
      cliente: {
        nome: (dati.get('nome') || '').trim(),
        cognome: (dati.get('cognome') || '').trim(),
        email: (dati.get('email') || '').trim(),
        telefono: (dati.get('telefono') || '').trim(),
        note: (dati.get('note') || '').trim(),
        privacy: dati.get('privacy') === '1'
      },
      spedizione: {
        indirizzo: (dati.get('indirizzo') || '').trim(),
        cap: (dati.get('cap') || '').trim(),
        citta: (dati.get('citta') || '').trim(),
        provincia: (dati.get('provincia') || '').trim().toUpperCase(),
        nazione: (dati.get('nazione') || '').trim()
      }
    };

    const submitBtn = document.getElementById('checkout-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Invio in corso…';

    try {
      await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ordine)
      });
    } catch {
      /* modalità demo: nessun backend pagamenti attivo */
    }

    try {
      const storici = JSON.parse(localStorage.getItem('mt_ordini_demo') || '[]');
      storici.push(ordine);
      localStorage.setItem('mt_ordini_demo', JSON.stringify(storici));
    } catch { /* ignora */ }

    document.getElementById('order-code').textContent = ordine.codice;
    vistaForm.hidden = true;
    vistaSuccess.hidden = false;

    articoli = [];
    salva();
    aggiornaUI();
    form.reset();

    submitBtn.disabled = false;
    submitBtn.textContent = 'Conferma ordine';
  });

  function generaCodice() {
    const d = new Date();
    const data = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const caso = Math.random().toString(36).slice(2, 5).toUpperCase();
    return `MT-${data}-${caso}`;
  }

  aggiornaUI();
})();
