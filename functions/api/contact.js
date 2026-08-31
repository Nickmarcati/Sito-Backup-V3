/**
 * Cloudflare Pages Function — POST /api/contact
 * Handles the quote request form and sends email via Resend.
 *
 * Setup:
 *   1. Sign up at https://resend.com
 *   2. Get an API key
 *   3. Add RESEND_API_KEY as an environment variable in Cloudflare Pages dashboard
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  const TO_EMAIL = 'info@marcatiteloni.com';
  const FROM_EMAIL = 'Marcati Teloni <onboarding@resend.dev>';
  // Note: Change to your own domain after verifying it in Resend
  // Example: 'Marcati Teloni <noreply@marcatiteloni.it>'

  // Get API key from environment variable (set in Cloudflare dashboard)
  const RESEND_API_KEY = env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY not configured');
    return new Response(JSON.stringify({ error: 'Servizio email non configurato.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let nome, cognome, email, telefono, prodotto, messaggio, privacy;

  try {
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const data = await request.formData();
      nome      = (data.get('nome') || '').trim();
      cognome   = (data.get('cognome') || '').trim();
      email     = (data.get('email') || '').trim();
      telefono  = (data.get('telefono') || '').trim();
      prodotto  = (data.get('prodotto') || '').trim();
      messaggio = (data.get('messaggio') || '').trim();
      privacy   = data.get('privacy');
    } else {
      const json = await request.json();
      nome      = (json.nome || '').trim();
      cognome   = (json.cognome || '').trim();
      email     = (json.email || '').trim();
      telefono  = (json.telefono || '').trim();
      prodotto  = (json.prodotto || '').trim();
      messaggio = (json.messaggio || '').trim();
      privacy   = json.privacy;
    }
  } catch {
    return new Response(JSON.stringify({ error: 'Errore nel formato della richiesta.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Validation
  if (!nome || !cognome || !email || !telefono || !messaggio) {
    return new Response(JSON.stringify({ error: 'Campi obbligatori mancanti.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (!isValidEmail(email)) {
    return new Response(JSON.stringify({ error: 'Indirizzo email non valido.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (!privacy) {
    return new Response(JSON.stringify({ error: 'È necessario accettare la Privacy Policy.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const nomeCompleto = cognome ? `${nome} ${cognome}` : nome;

  const textBody = `
Nuova richiesta di preventivo dal sito marcatiteloni.it

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DATI DEL RICHIEDENTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Nome:      ${nomeCompleto}
Email:     ${email}
Telefono:  ${telefono || 'Non fornito'}
Prodotto:  ${prodotto || 'Non specificato'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MESSAGGIO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${messaggio}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Inviato automaticamente dal sito web Marcati Teloni
`.trim();

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
  .message-box { background: #f5f5f5; border-left: 3px solid #C8102E; padding: 12px 16px; border-radius: 4px; font-size: 14px; line-height: 1.6; }
  .footer { margin-top: 24px; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 12px; }
</style></head>
<body>
  <div class="header"><h1>Nuova Richiesta di Preventivo</h1></div>
  <div class="body">
    <div class="field"><div class="field-label">Nome</div><div class="field-value">${escapeHtml(nomeCompleto)}</div></div>
    <div class="field"><div class="field-label">Email</div><div class="field-value"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></div></div>
    ${telefono ? `<div class="field"><div class="field-label">Telefono</div><div class="field-value">${escapeHtml(telefono)}</div></div>` : ''}
    ${prodotto ? `<div class="field"><div class="field-label">Tipologia prodotto</div><div class="field-value">${escapeHtml(prodotto)}</div></div>` : ''}
    <div class="field"><div class="field-label">Messaggio</div><div class="message-box">${escapeHtml(messaggio).replace(/\n/g, '<br>')}</div></div>
    <div class="footer">Inviato automaticamente dal sito web Marcati Teloni</div>
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
        reply_to: email,
        subject: `Preventivo da ${nomeCompleto} – marcatiteloni.it`,
        text: textBody,
        html: htmlBody,
      }),
    });

    if (resendResponse.ok) {
      return new Response(JSON.stringify({ success: true }), {
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

/* ---- Helpers ---- */

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
