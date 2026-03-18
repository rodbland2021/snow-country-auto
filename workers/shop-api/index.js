/**
 * Snow Country Auto — Shop API (Cloudflare Worker)
 * Creates Stripe Checkout sessions from cart data.
 * Secret key stored as Worker secret (STRIPE_SECRET_KEY).
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

    if (url.pathname === '/health') {
      return jsonResponse(request, { ok: true, mode: 'test' });
    }

    return new Response('Not found', { status: 404 });
  }
};

async function handleCheckout(request, env) {
  try {
    const { items, customer_email } = await request.json();

    if (!items || !items.length) {
      return jsonResponse(request, { error: 'Cart is empty' }, 400);
    }

    // Create Stripe Checkout Session via form-encoded API
    const params = new URLSearchParams();
    params.append('mode', 'payment');
    params.append('success_url', `${env.SUCCESS_URL}?session_id={CHECKOUT_SESSION_ID}`);
    params.append('cancel_url', env.CANCEL_URL);
    params.append('payment_method_types[0]', 'card');

    if (customer_email) {
      params.append('customer_email', customer_email);
    }

    // Shipping options
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

    // Add line items
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
