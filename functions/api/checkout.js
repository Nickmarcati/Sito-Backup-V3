/**
 * Cloudflare Pages Function — POST /api/checkout
 * Riceve gli ordini dello store e li invia via email (Resend).
 * Quando sarà attivo Stripe, il pagamento verrà verificato qui prima dell'invio.
 *
 * Setup: RESEND_API_KEY come variabile d'ambiente in Cloudflare Pages
 * (la stessa già usata da /api/contact)
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  const TO_EMAIL = 'info@marcatiteloni.com';
  const FROM_EMAIL = 'Marcati Teloni <onboarding@resend.dev>';

  const RESEND_API_KEY = env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY not configured');
    return new Response(JSON.stringify({ error: 'Servizio email non configurato.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let ordine;
  try {
    ordine = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Errore nel formato della richiesta.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const cliente = ordine.cliente || {};
  const indirizzo = ordine.spedizione || {};
  const articoli = Array.isArray(ordine.articoli) ? ordine.articoli : [];

  if (!cliente.nome || !cliente.cognome || !cliente.email || !cliente.telefono) {
    return new Response(JSON.stringify({ error: 'Dati cliente incompleti.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (!isValidEmail(cliente.email)) {
    return new Response(JSON.stringify({ error: 'Indirizzo email non valido.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (!indirizzo.indirizzo || !indirizzo.cap || !indirizzo.citta) {
    return new Response(JSON.stringify({ error: 'Indirizzo di spedizione incompleto.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (!articoli.length) {
    return new Response(JSON.stringify({ error: 'Carrello vuoto.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const euro = (v) =>
    new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(Number(v) || 0);

  const codice = ordine.codice || 'MT-ND';
  const nomeCompleto = `${cliente.nome} ${cliente.cognome}`;
  const indirizzoCompleto = `${indirizzo.indirizzo}, ${indirizzo.cap} ${indirizzo.citta} (${indirizzo.provincia || ''}) ${indirizzo.nazione || ''}`;

  const righeTesto = articoli
    .map((a) => `  ${a.qty} x ${a.nome} — ${euro(a.prezzo)} cad. = ${euro(a.prezzo * a.qty)}`)
    .join('\n');

  const textBody = `
Nuovo ordine dallo store Marcati Teloni

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ORDINE ${codice}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${righeTesto}

Subtotale:            ${euro(ordine.subtotale)}
Spedizione:           ${euro(ordine.spedizione)}
Totale (IVA incl.):   ${euro(ordine.totale)}
di cui IVA 22%:       ${euro(ordine.iva_inclusa)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CLIENTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Nome:      ${nomeCompleto}
Email:     ${cliente.email}
Telefono:  ${cliente.telefono}
${cliente.note ? `Note:      ${cliente.note}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INDIRIZZO DI SPEDIZIONE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${indirizzoCompleto}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Inviato automaticamente dallo store Marcati Teloni
`.trim();

  const righeHtml = articoli
    .map((a) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">${a.qty} &times; ${escapeHtml(a.nome)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${euro(a.prezzo)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:700;">${euro(a.prezzo * a.qty)}</td>
      </tr>`)
    .join('');

  const htmlBody = `
<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"><style>
  body { font-family: Arial, sans-serif; color: #1C1C1C; max-width: 600px; margin: 0 auto; }
  .header { background: #C8102E; color: white; padding: 24px; border-radius: 8px 8px 0 0; }
  .header h1 { margin: 0; font-size: 20px; }
  .body { padding: 24px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px; }
  .field { margin-bottom: 16px; }
  .field-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #555; margin-bottom: 4px; }
  .field-value { font-size: 15px; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 16px; }
  .totali { font-size: 14px; margin-bottom: 16px; }
  .totali div { display: flex; justify-content: space-between; padding: 4px 12px; }
  .totali .tot { font-weight: 700; border-top: 2px solid #C8102E; margin-top: 6px; padding-top: 8px; }
  .footer { margin-top: 24px; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 12px; }
</style></head>
<body>
  <div class="header"><h1>Nuovo ordine ${escapeHtml(codice)}</h1></div>
  <div class="body">
    <table>
      <tr style="background:#f5f5f5;">
        <th style="padding:8px 12px;text-align:left;">Articolo</th>
        <th style="padding:8px 12px;text-align:right;">Prezzo</th>
        <th style="padding:8px 12px;text-align:right;">Importo</th>
      </tr>
      ${righeHtml}
    </table>
    <div class="totali">
      <div><span>Subtotale</span><span>${euro(ordine.subtotale)}</span></div>
      <div><span>Spedizione</span><span>${euro(ordine.spedizione)}</span></div>
      <div><span>di cui IVA (22%) inclusa</span><span>${euro(ordine.iva_inclusa)}</span></div>
      <div class="tot"><span>TOTALE</span><span>${euro(ordine.totale)}</span></div>
    </div>
    <div class="field"><div class="field-label">Cliente</div><div class="field-value">${escapeHtml(nomeCompleto)} — ${escapeHtml(cliente.email)} — ${escapeHtml(cliente.telefono)}</div></div>
    ${cliente.note ? `<div class="field"><div class="field-label">Note</div><div class="field-value">${escapeHtml(cliente.note)}</div></div>` : ''}
    <div class="field"><div class="field-label">Indirizzo di spedizione</div><div class="field-value">${escapeHtml(indirizzoCompleto)}</div></div>
    <div class="footer">Inviato automaticamente dallo store Marcati Teloni</div>
  </div>
</body>
</html>
`.trim();

  try {
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [TO_EMAIL],
        reply_to: cliente.email,
        subject: `Nuovo ordine ${codice} da ${nomeCompleto} – store Marcati Teloni`,
        text: textBody,
        html: htmlBody,
      }),
    });

    if (resendResponse.ok) {
      await inviaConfermaCliente({
        codice,
        nomeCompleto,
        email: cliente.email,
        articoli,
        totale: ordine.totale,
        indirizzoCompleto
      }, RESEND_API_KEY);
      return new Response(JSON.stringify({ success: true, codice }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      const errData = await resendResponse.json().catch(() => ({}));
      console.error('Resend error:', resendResponse.status, errData);
      return new Response(JSON.stringify({ success: false, error: 'Errore nell\'invio dell\'email.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (err) {
    console.error('Fetch error:', err);
    return new Response(JSON.stringify({ error: 'Errore di rete. Riprova più tardi.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function inviaConfermaCliente(dati, RESEND_API_KEY) {
  const FROM_EMAIL = 'Marcati Teloni <onboarding@resend.dev>';

  const righe = dati.articoli
    .map((a) => `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;">${a.qty} &times; ${escapeHtml(a.nome)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:700;">${euroFmt(a.prezzo * a.qty)}</td>
    </tr>`)
    .join('');

  const html = `
<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"><style>
  body { font-family: Arial, sans-serif; color: #1C1C1C; max-width: 600px; margin: 0 auto; }
  .header { background: #1e2229; color: #c9a84c; padding: 24px; border-radius: 8px 8px 0 0; }
  .header h1 { margin: 0; font-size: 20px; }
  .body { padding: 24px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px; font-size: 14px; line-height: 1.6; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; margin: 16px 0; }
  .tot { font-weight: 700; text-align: right; padding: 8px 12px; border-top: 2px solid #c9a84c; }
  .footer { margin-top: 24px; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 12px; }
</style></head>
<body>
  <div class="header"><h1>Ordine ${escapeHtml(dati.codice)} ricevuto</h1></div>
  <div class="body">
    <p>Gentile ${escapeHtml(dati.nomeCompleto)},</p>
    <p>abbiamo ricevuto correttamente il tuo ordine e ti ringraziamo per la fiducia. Ecco il riepilogo:</p>
    <table>${righe}
      <tr><td class="tot">Totale (IVA inclusa)</td><td class="tot">${euroFmt(dati.totale)}</td></tr>
    </table>
    <p>Indirizzo di consegna: ${escapeHtml(dati.indirizzoCompleto)}</p>
    <p><strong>Cosa succede ora:</strong> il nostro staff ti contatter&agrave; entro 1&ndash;2 giorni lavorativi per la conferma finale di misure e preventivo. Una volta approvato il disegno e avviata la lavorazione, riceverai un'email con il numero di tracciamento della spedizione.</p>
    <p>Per qualsiasi domanda rispondi a questa email o chiama lo +39 0444 1931496.</p>
    <div class="footer">Marcati Teloni S.R.L. &ndash; Via Broli 46, 36025 Noventa Vicentina (VI)</div>
  </div>
</body>
</html>
`.trim();

  const text = `Gentile ${dati.nomeCompleto}, abbiamo ricevuto il tuo ordine ${dati.codice}. Ti contatteremo entro 1-2 giorni lavorativi per la conferma finale di misure e preventivo.`;

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [dati.email],
        subject: `Abbiamo ricevuto il tuo ordine ${dati.codice} – Marcati Teloni`,
        text,
        html
      }),
    });
  } catch { /* la conferma al cliente non deve bloccare l'ordine */ }
}

function euroFmt(v) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(Number(v) || 0);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
