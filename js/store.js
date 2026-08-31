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

  const renderizza = (prodotti) => {
    if (status) status.style.display = 'none';

    if (!prodotti.length) {
      grid.innerHTML = '<p class="store-empty">Nessun prodotto disponibile al momento.</p>';
      return;
    }

    const ordinati = [...prodotti].sort((a, b) => (b.in_evidenza ? 1 : 0) - (a.in_evidenza ? 1 : 0));

    grid.innerHTML = ordinati.map(p => {
      const badge = p.in_evidenza ? '<span class="store-badge">In evidenza</span>' : '';
      const esaurito = p.disponibile === false;
      return `
        <article class="store-card${esaurito ? ' store-card-esaurito' : ''}">
          <div class="store-card-media">
            <img src="${escapeHtml(p.immagine)}" alt="${escapeHtml(p.nome)}" loading="lazy">
            ${badge}
          </div>
          <div class="store-card-body">
            <h3>${escapeHtml(p.nome)}</h3>
            ${p.descrizione ? `<p>${escapeHtml(p.descrizione)}</p>` : ''}
            <div class="store-card-footer">
              <span class="store-prezzo">${formatPrezzo(p.prezzo)}</span>
              <a href="index.html#preventivo" class="btn ${esaurito ? 'btn-outline' : 'btn-primary'}">
                ${esaurito ? 'Non disponibile' : 'Richiedi info'}
              </a>
            </div>
          </div>
        </article>`;
    }).join('');
  };

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
