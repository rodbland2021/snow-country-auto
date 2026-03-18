/**
 * Snow Country Auto — Shop API (Cloudflare Worker)
 * - Creates Stripe Checkout sessions
 * - Handles Stripe webhooks for order notifications
 * - Email configurable via NOTIFICATION_EMAIL env var
 * - Stripe keys: STRIPE_SECRET_KEY (secret), STRIPE_WEBHOOK_SECRET (secret)
 */

function corsHeaders(request) {
  const origin = (request && request.headers.get('Origin')) || '';
  const allowed = origin.endsWith('.snow-country-auto.pages.dev') ||
                  origin === 'https://snow-country-auto.pages.dev' ||
                  origin.startsWith('http://localhost');
  return {
    'Access-Control-Allow-Origin': allowed ? origin : '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function jsonResponse(request, data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(request), 'Content-Type': 'application/json' }
  });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    const url = new URL(request.url);

    if (url.pathname === '/create-checkout' && request.method === 'POST') {
      return handleCheckout(request, env);
    }

    if (url.pathname === '/webhook' && request.method === 'POST') {
      return handleWebhook(request, env);
    }

    if (url.pathname === '/health') {
      return jsonResponse(request, { ok: true, mode: 'test', notification_email: env.NOTIFICATION_EMAIL });
    }

    return new Response('Not found', { status: 404 });
  }
};

// --- Checkout Session Creation ---
async function handleCheckout(request, env) {
  try {
    const { items, customer_email } = await request.json();

    if (!items || !items.length) {
      return jsonResponse(request, { error: 'Cart is empty' }, 400);
    }

    const params = new URLSearchParams();
    params.append('mode', 'payment');
    params.append('success_url', `${env.SUCCESS_URL}?session_id={CHECKOUT_SESSION_ID}`);
    params.append('cancel_url', env.CANCEL_URL);
    params.append('payment_method_types[0]', 'card');
    params.append('phone_number_collection[enabled]', 'true');

    // Store notification email in metadata so webhook can read it
    params.append('metadata[notification_email]', env.NOTIFICATION_EMAIL);
    params.append('metadata[store]', 'Snow Country Automotive');

    if (customer_email) {
      params.append('customer_email', customer_email);
    }

    // Shipping
    params.append('shipping_address_collection[allowed_countries][0]', 'AU');
    params.append('shipping_options[0][shipping_rate_data][type]', 'fixed_amount');
    params.append('shipping_options[0][shipping_rate_data][fixed_amount][amount]', '0');
    params.append('shipping_options[0][shipping_rate_data][fixed_amount][currency]', 'aud');
    params.append('shipping_options[0][shipping_rate_data][display_name]', 'Pickup from Workshop (Free)');
    params.append('shipping_options[0][shipping_rate_data][delivery_estimate][minimum][unit]', 'business_day');
    params.append('shipping_options[0][shipping_rate_data][delivery_estimate][minimum][value]', '1');
    params.append('shipping_options[0][shipping_rate_data][delivery_estimate][maximum][unit]', 'business_day');
    params.append('shipping_options[0][shipping_rate_data][delivery_estimate][maximum][value]', '1');
    params.append('shipping_options[1][shipping_rate_data][type]', 'fixed_amount');
    params.append('shipping_options[1][shipping_rate_data][fixed_amount][amount]', '1500');
    params.append('shipping_options[1][shipping_rate_data][fixed_amount][currency]', 'aud');
    params.append('shipping_options[1][shipping_rate_data][display_name]', 'Standard Shipping (Australia-wide)');
    params.append('shipping_options[1][shipping_rate_data][delivery_estimate][minimum][unit]', 'business_day');
    params.append('shipping_options[1][shipping_rate_data][delivery_estimate][minimum][value]', '3');
    params.append('shipping_options[1][shipping_rate_data][delivery_estimate][maximum][unit]', 'business_day');
    params.append('shipping_options[1][shipping_rate_data][delivery_estimate][maximum][value]', '7');

    // Line items
    items.forEach((item, i) => {
      params.append(`line_items[${i}][price_data][currency]`, 'aud');
      params.append(`line_items[${i}][price_data][product_data][name]`, item.name);
      if (item.brand) {
        params.append(`line_items[${i}][price_data][product_data][description]`, `${item.brand}${item.sku ? ' — ' + item.sku : ''}`);
      }
      params.append(`line_items[${i}][price_data][unit_amount]`, Math.round(item.price * 100).toString());
      params.append(`line_items[${i}][quantity]`, item.qty.toString());
    });

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const session = await stripeRes.json();

    if (session.error) {
      console.error('Stripe error:', JSON.stringify(session.error));
      return jsonResponse(request, { error: session.error.message }, 400);
    }

    return jsonResponse(request, { url: session.url, session_id: session.id });

  } catch (err) {
    console.error('Checkout error:', err.message || err);
    return jsonResponse(request, { error: 'Internal server error: ' + (err.message || '') }, 500);
  }
}

// --- Stripe Webhook Handler ---
async function handleWebhook(request, env) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  // Verify webhook signature if secret is configured
  let event;
  if (env.STRIPE_WEBHOOK_SECRET && sig) {
    try {
      event = await verifyStripeWebhook(body, sig, env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return new Response('Invalid signature', { status: 400 });
    }
  } else {
    // No webhook secret configured — parse directly (test mode)
    event = JSON.parse(body);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    await handleOrderComplete(session, env);
  }

  return new Response('OK', { status: 200 });
}

async function handleOrderComplete(session, env) {
  const notificationEmail = session.metadata?.notification_email || env.NOTIFICATION_EMAIL;
  const customerEmail = session.customer_details?.email || session.customer_email || 'unknown';
  const customerName = session.customer_details?.name || 'Customer';
  const totalCents = session.amount_total || 0;
  const total = (totalCents / 100).toFixed(2);
  const currency = (session.currency || 'aud').toUpperCase();
  const shipping = session.shipping_details?.address
    ? `${session.shipping_details.name}, ${session.shipping_details.address.line1}, ${session.shipping_details.address.city} ${session.shipping_details.address.state} ${session.shipping_details.address.postal_code}`
    : 'Pickup from workshop';
  const shippingMethod = session.shipping_cost?.shipping_rate ? 'Shipping' : 'Workshop Pickup';
  const sessionId = session.id;

  // Retrieve line items from Stripe
  let itemsHtml = '';
  try {
    const lineItemsRes = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}/line_items?limit=50`, {
      headers: { 'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}` }
    });
    const lineItems = await lineItemsRes.json();
    if (lineItems.data) {
      itemsHtml = lineItems.data.map(item =>
        `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee;">${item.description}</td>` +
        `<td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>` +
        `<td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;">$${(item.amount_total / 100).toFixed(2)}</td></tr>`
      ).join('');
    }
  } catch (err) {
    console.error('Failed to fetch line items:', err.message);
    itemsHtml = '<tr><td colspan="3">Could not retrieve line items</td></tr>';
  }

  // Build notification email HTML
  const emailHtml = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9;padding:20px;">
      <div style="background:#1a1a2e;color:#fff;padding:20px;border-radius:8px 8px 0 0;text-align:center;">
        <h1 style="margin:0;font-size:22px;">🛒 New Order — Snow Country Auto</h1>
      </div>
      <div style="background:#fff;padding:24px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 8px 8px;">
        <p style="font-size:14px;color:#333;"><strong>Order ref:</strong> ${sessionId}</p>
        <p style="font-size:14px;color:#333;"><strong>Customer:</strong> ${customerName} (${customerEmail})</p>
        <p style="font-size:14px;color:#333;"><strong>Shipping:</strong> ${shipping}</p>
        <p style="font-size:14px;color:#333;"><strong>Method:</strong> ${shippingMethod}</p>
        <hr style="border:none;border-top:1px solid #eee;margin:16px 0;">
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr style="background:#f5f5f5;">
            <th style="padding:8px 12px;text-align:left;">Item</th>
            <th style="padding:8px 12px;text-align:center;">Qty</th>
            <th style="padding:8px 12px;text-align:right;">Total</th>
          </tr>
          ${itemsHtml}
        </table>
        <div style="text-align:right;margin-top:16px;font-size:18px;font-weight:bold;color:#1a1a2e;">
          Total: ${currency} $${total}
        </div>
        <hr style="border:none;border-top:1px solid #eee;margin:16px 0;">
        <p style="font-size:12px;color:#999;">This is a test mode order. View in <a href="https://dashboard.stripe.com/test/payments">Stripe Dashboard</a>.</p>
      </div>
    </div>
  `;

  // Send email via VPS webhook (Kit email relay)
  try {
    await fetch('https://srv912889.tail61f1e3.ts.net/hooks/agent', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer RLW2S57gxvRLeFdpVt0Oox-xpE76utXBKOBQuRVdJFw',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agentId: 'main',
        message: `New Snow Country Auto order! Customer: ${customerName} (${customerEmail}). Total: ${currency} $${total}. Method: ${shippingMethod}. Session: ${sessionId}. Please send order notification email to ${notificationEmail}.`,
        timeoutSeconds: 15,
      }),
    });
    console.log('Order notification sent to Kit agent');
  } catch (err) {
    console.error('Failed to notify Kit:', err.message);
  }

  // Also log to console for Worker logs
  console.log(`ORDER COMPLETE: ${customerName} (${customerEmail}) — ${currency} $${total} — ${shippingMethod} — ${sessionId}`);
}

// --- Stripe Webhook Signature Verification ---
async function verifyStripeWebhook(payload, sigHeader, secret) {
  const parts = sigHeader.split(',').reduce((acc, part) => {
    const [key, value] = part.split('=');
    acc[key.trim()] = value;
    return acc;
  }, {});

  const timestamp = parts['t'];
  const signature = parts['v1'];

  if (!timestamp || !signature) {
    throw new Error('Missing timestamp or signature');
  }

  // Check timestamp is within 5 minutes
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp)) > 300) {
    throw new Error('Timestamp too old');
  }

  const signedPayload = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload));
  const computedSig = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');

  if (computedSig !== signature) {
    throw new Error('Signature mismatch');
  }

  return JSON.parse(payload);
}
