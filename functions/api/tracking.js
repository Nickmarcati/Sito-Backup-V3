/**
 * Cloudflare Pages Function — POST /api/tracking
 * Invia al cliente l'email di spedizione con il numero di tracciamento.
 * Chiamata dal pannello admin quando l'ordine viene affidato al corriere.
 *
 * Setup: RESEND_API_KEY come variabile d'ambiente in Cloudflare Pages
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  const FROM_EMAIL = 'Marcati Teloni <onboarding@resend.dev>';

  const RESEND_API_KEY = env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: 'Servizio email non configurato.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let dati;
  try {
    dati = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Errore nel formato della richiesta.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const email = (dati.email || '').trim();
  const codice = (dati.codice || '').trim();
  const corriere = (dati.corriere || 'Corriere espresso').trim();
  const tracking = (dati.tracking || '').trim();
  const link = (dati.link || '').trim();

  if (!isValidEmail(email)) {
    return new Response(JSON.stringify({ error: 'Indirizzo email non valido.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (!tracking) {
    return new Response(JSON.stringify({ error: 'Inserisci il numero di tracciamento.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const linkHtml = link
    ? `<p style="text-align:center;margin:20px 0;"><a href="${escapeHtml(link)}" style="background:#c9a84c;color:#0f1115;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;">Traccia il tuo pacco</a></p>`
    : `<p style="text-align:center;font-size:13px;color:#555;">Puoi seguire la consegna sul sito del corriere con il numero qui sopra.</p>`;

  const htmlBody = `
<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"><style>
  body { font-family: Arial, sans-serif; color: #1C1C1C; max-width: 600px; margin: 0 auto; }
  .header { background: #1e2229; color: #c9a84c; padding: 24px; border-radius: 8px 8px 0 0; }
  .header h1 { margin: 0; font-size: 20px; }
  .body { padding: 24px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px; font-size: 14px; line-height: 1.6; }
  .code { text-align: center; font-size: 18px; font-weight: 700; letter-spacing: 0.06em; background: #f5f5f5; border: 1px dashed #c9a84c; border-radius: 8px; padding: 12px; margin: 18px 0; }
  .footer { margin-top: 24px; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 12px; }
</style></head>
<body>
  <div class="header"><h1>Il tuo ordine &egrave; in viaggio</h1></div>
  <div class="body">
    <p>Gentile cliente,</p>
    <p>il tuo ordine <strong>${escapeHtml(codice || '')}</strong> &egrave; stato affidato a <strong>${escapeHtml(corriere)}</strong> e verr&agrave; consegnato entro 24&ndash;72 ore lavorative.</p>
    <div class="code">${escapeHtml(tracking)}</div>
    ${linkHtml}
    <p>Ti ricordiamo di verificare l'integrit&agrave; dell'imballo alla consegna: in caso di danni evidenti al pacco, accetta con la dicitura <strong>&ldquo;Accettato con riserva di controllo per imballo danneggiato&rdquo;</strong>.</p>
    <p>Grazie per aver scelto Marcati Teloni.</p>
    <div class="footer">Marcati Teloni S.R.L. &ndash; Via Broli 46, 36025 Noventa Vicentina (VI) &ndash; Tel. +39 0444 1931496</div>
  </div>
</body>
</html>
`.trim();

  const textBody = `Il tuo ordine ${codice || ''} è stato affidato a ${corriere}. Numero di tracciamento: ${tracking}${link ? ` — Traccia qui: ${link}` : ''}. Consegna stimata: 24-72 ore lavorative.`;

  try {
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [email],
        subject: `Il tuo ordine ${codice || ''} è in viaggio – Marcati Teloni`,
        text: textBody,
        html: htmlBody,
      }),
    });

    if (resendResponse.ok) {
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const errData = await resendResponse.json().catch(() => ({}));
    console.error('Resend error:', resendResponse.status, errData);
    return new Response(JSON.stringify({ error: 'Errore nell\'invio dell\'email.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Fetch error:', err);
    return new Response(JSON.stringify({ error: 'Errore di rete. Riprova più tardi.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
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
