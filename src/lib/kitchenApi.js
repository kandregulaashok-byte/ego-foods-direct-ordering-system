const apiUrl = import.meta.env.VITE_KITCHEN_API_URL;
const apiToken = import.meta.env.VITE_KITCHEN_API_TOKEN;

export const hasKitchenApi = Boolean(apiUrl && apiToken);

async function request(path, options = {}) {
  if (!hasKitchenApi) throw new Error('Kitchen API is not configured.');
  const response = await fetch(`${apiUrl.replace(/\/$/, '')}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-kitchen-token': apiToken,
      ...(options.headers || {})
    }
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.error || 'Kitchen API request failed.');
  return json;
}

export async function fetchKitchenOrders() {
  const json = await request('/api/kitchen-os/orders');
  return json.orders || [];
}

export async function fetchKitchenSettings() {
  return request('/api/kitchen-os/settings');
}

export async function updateKitchenSettings(settings) {
  return request('/api/kitchen-os/settings', {
    method: 'POST',
    body: JSON.stringify(settings)
  });
}

export async function updateKitchenOrderStatus(orderId, status, extra = {}) {
  const json = await request('/api/kitchen-os/orders', {
    method: 'POST',
    body: JSON.stringify({
      orderId,
      status,
      reason: extra.rejection_reason
    })
  });
  return json.order;
}
