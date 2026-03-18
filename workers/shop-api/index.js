/**
 * Snow Country Auto — Shop API (Cloudflare Worker)
 * Creates Stripe Checkout sessions from cart data.
 * Secret key stored as Worker secret (STRIPE_SECRET_KEY).
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://snow-country-auto.pages.dev',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    if (url.pathname === '/create-checkout' && request.method === 'POST') {
      return handleCheckout(request, env);
    }

    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ ok: true, mode: 'test' }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    return new Response('Not found', { status: 404 });
  }
};

async function handleCheckout(request, env) {
  try {
    const { items, customer_email } = await request.json();

    if (!items || !items.length) {
      return jsonResponse({ error: 'Cart is empty' }, 400);
    }

    // Build Stripe line items from cart
    const line_items = items.map(item => ({
      price_data: {
        currency: 'aud',
        product_data: {
          name: item.name,
          description: item.brand ? `${item.brand} — ${item.sku || ''}` : undefined,
          images: item.image ? [`https://snow-country-auto.pages.dev/${item.image}`] : undefined,
        },
        unit_amount: Math.round(item.price * 100), // Stripe uses cents
      },
      quantity: item.qty,
    }));

    // Create Stripe Checkout Session
    const params = new URLSearchParams();
    params.append('mode', 'payment');
    params.append('success_url', `${env.SUCCESS_URL}?session_id={CHECKOUT_SESSION_ID}`);
    params.append('cancel_url', env.CANCEL_URL);
    params.append('currency', 'aud');
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
    line_items.forEach((item, i) => {
      params.append(`line_items[${i}][price_data][currency]`, 'aud');
      params.append(`line_items[${i}][price_data][product_data][name]`, item.price_data.product_data.name);
      if (item.price_data.product_data.description) {
        params.append(`line_items[${i}][price_data][product_data][description]`, item.price_data.product_data.description);
      }
      params.append(`line_items[${i}][price_data][unit_amount]`, item.price_data.unit_amount.toString());
      params.append(`line_items[${i}][quantity]`, item.quantity.toString());
    });

    // Stripe API call
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
      console.error('Stripe error:', session.error);
      return jsonResponse({ error: session.error.message }, 400);
    }

    return jsonResponse({ url: session.url, session_id: session.id });

  } catch (err) {
    console.error('Checkout error:', err);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
  });
}
