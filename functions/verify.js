function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) {
    return json({ valid: false, error: "Database chưa được kết nối." }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ valid: false, error: "Dữ liệu không hợp lệ." }, 400);
  }

  const key = String(body.key || "").trim();
  const deviceId = String(body.device_id || "").trim();

  if (!key || !deviceId) {
    return json({ valid: false, error: "Thiếu key hoặc Device ID." }, 400);
  }

  const row = await env.DB.prepare(`
    SELECT id, key_value, device_id, expires_at, revoked
    FROM keys
    WHERE key_value = ?
    LIMIT 1
  `).bind(key).first();

  if (!row) {
    return json({ valid: false, error: "Key không tồn tại." }, 404);
  }

  if (Number(row.revoked) === 1) {
    return json({ valid: false, error: "Key đã bị thu hồi." }, 403);
  }

  const now = Math.floor(Date.now() / 1000);
  if (Number(row.expires_at) <= now) {
    return json({ valid: false, error: "Key đã hết hạn." }, 403);
  }

  if (row.device_id && row.device_id !== deviceId) {
    return json({ valid: false, error: "Key đã được dùng trên thiết bị khác." }, 403);
  }

  // Lần xác thực đầu tiên sẽ khóa key vào thiết bị này.
  if (!row.device_id) {
    await env.DB.prepare(`
      UPDATE keys
      SET device_id = ?
      WHERE id = ? AND device_id IS NULL
    `).bind(deviceId, row.id).run();
  }

  return json({
    valid: true,
    expires_at: new Date(Number(row.expires_at) * 1000).toISOString()
  });
}

export function onRequest() {
  return json({ valid: false, error: "Method Not Allowed" }, 405);
}
