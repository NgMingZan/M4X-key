function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}

function randomKey() {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);

  const hex = [...bytes]
    .map(v => v.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();

  return `M4X-${hex.slice(0,4)}-${hex.slice(4,8)}-${hex.slice(8,12)}`;
}

function authorized(request, env) {
  const header = request.headers.get("Authorization");

  if (!header || !header.startsWith("Basic ")) {
    return false;
  }

  try {
    const raw = atob(header.slice(6));
    const pos = raw.indexOf(":");

    if (pos === -1) return false;

    const username = raw.slice(0, pos);
    const password = raw.slice(pos + 1);

    return (
      username === env.ADMIN_USERNAME &&
      password === env.ADMIN_PASSWORD
    );
  } catch {
    return false;
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!authorized(request, env)) {
    return json({
      ok: false,
      error: "Sai tài khoản hoặc mật khẩu."
    }, 401);
  }

  if (!env.DB) {
    return json({
      ok: false,
      error: "Chưa kết nối D1 database."
    }, 500);
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return json({
      ok: false,
      error: "Dữ liệu không hợp lệ."
    }, 400);
  }

  try {
    switch (body.action) {

      case "list": {
        const result = await env.DB.prepare(`
          SELECT
            id,
            key_value,
            device_id,
            created_at,
            expires_at,
            revoked
          FROM keys
          ORDER BY id DESC
          LIMIT 200
        `).all();

        return json({
          ok: true,
          keys: result.results || []
        });
      }

      case "create": {
        const days = Math.min(
          Math.max(Number(body.days) || 30, 1),
          3650
        );

        const key = randomKey();
        const now = Math.floor(Date.now() / 1000);
        const expires = now + days * 86400;

        await env.DB.prepare(`
          INSERT INTO keys
          (
            key_value,
            device_id,
            created_at,
            expires_at,
            revoked
          )
          VALUES (?, NULL, ?, ?, 0)
        `)
        .bind(key, now, expires)
        .run();

        return json({
          ok: true,
          key,
          expires_at: expires
        });
      }

      case "reset": {
        const id = Number(body.id);

        await env.DB.prepare(`
          UPDATE keys
          SET device_id = NULL
          WHERE id = ?
        `)
        .bind(id)
        .run();

        return json({ ok: true });
      }

      case "revoke": {
        const id = Number(body.id);

        await env.DB.prepare(`
          UPDATE keys
          SET revoked =
            CASE WHEN revoked = 1 THEN 0 ELSE 1 END
          WHERE id = ?
        `)
        .bind(id)
        .run();

        return json({ ok: true });
      }

      case "delete": {
        const id = Number(body.id);

        await env.DB.prepare(`
          DELETE FROM keys
          WHERE id = ?
        `)
        .bind(id)
        .run();

        return json({ ok: true });
      }

      default:
        return json({
          ok: false,
          error: "Action không hợp lệ."
        }, 400);
    }

  } catch (e) {
    return json({
      ok: false,
      error: "Database error: " + e.message
    }, 500);
  }
}
