/* ============================================================
   MARCATI TELONI v2 — Store (dati da data/prodotti.json)
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  const grid = document.getElementById('store-grid');
  const status = document.getElementById('store-status');
  if (!grid) return;

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

  let catalogo = [];

  const renderizza = (prodotti) => {
    if (status) status.style.display = 'none';

    if (!prodotti.length) {
      grid.innerHTML = '<p class="store-empty">Nessun prodotto disponibile al momento.</p>';
      return;
    }

    catalogo = prodotti;
    const ordinati = [...prodotti].sort((a, b) => (b.in_evidenza ? 1 : 0) - (a.in_evidenza ? 1 : 0));

    grid.innerHTML = ordinati.map(p => {
      const badge = p.in_evidenza ? '<span class="store-badge">In evidenza</span>' : '';
      const esaurito = p.disponibile === false;
      return `
        <article class="store-card${esaurito ? ' store-card-esaurito' : ''}" data-nome="${escapeHtml(p.nome)}">
          <div class="store-card-media">
            <img src="${escapeHtml(p.immagine)}" alt="${escapeHtml(p.nome)}" loading="lazy">
            ${badge}
          </div>
          <div class="store-card-body">
            <h3>${escapeHtml(p.nome)}</h3>
            ${p.descrizione ? `<p>${escapeHtml(p.descrizione)}</p>` : ''}
            <div class="store-card-footer">
              <div>
                <span class="store-prezzo">${formatPrezzo(p.prezzo)}</span>
                <div class="store-spedizione">${p.spedizione > 0 ? `Spedizione ${formatPrezzo(p.spedizione)}` : 'Spedizione gratuita'}</div>
              </div>
              <button type="button" class="btn ${esaurito ? 'btn-outline' : 'btn-primary'} store-add" ${esaurito ? 'disabled' : ''}>
                ${esaurito ? 'Non disponibile' : 'Aggiungi al carrello'}
              </button>
            </div>
            <a href="index.html#preventivo" class="store-info-link">Misure personalizzate? Richiedi un preventivo</a>
          </div>
        </article>`;
    }).join('');
  };

  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('.store-add');
    if (!btn || btn.disabled) return;
    const nome = btn.closest('.store-card').dataset.nome;
    const prodotto = catalogo.find(p => p.nome === nome);
    if (prodotto && window.MTCart) window.MTCart.aggiungi(prodotto);
  });

  fetch('data/prodotti.json')
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then(dati => renderizza(dati.prodotti || []))
    .catch(() => {
      if (status) {
        status.textContent = window.location.protocol === 'file:'
          ? 'Per vedere lo store in locale apri il sito con un server locale (es. "npx serve"), oppure caricalo online.'
          : 'Impossibile caricare i prodotti. Riprova più tardi.';
        status.classList.add('store-error');
      }
    });
});
