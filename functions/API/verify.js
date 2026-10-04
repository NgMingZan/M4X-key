export async function onRequestPost(context) {
  const headers = {"content-type":"application/json;charset=UTF-8"};
  try {
    const { key, device_id } = await context.request.json();
    if (!key || !device_id)
      return new Response(JSON.stringify({valid:false,reason:"missing_fields"}), {status:400,headers});

    const now = Math.floor(Date.now()/1000);
    const row = await context.env.DB.prepare(
      "SELECT key_value, device_id, expires_at, revoked FROM keys WHERE key_value=?1"
    ).bind(key).first();

    if (!row) return new Response(JSON.stringify({valid:false,reason:"key_not_found"}),{headers});
    if (row.revoked) return new Response(JSON.stringify({valid:false,reason:"revoked"}),{headers});
    if (row.expires_at <= now) return new Response(JSON.stringify({valid:false,reason:"expired"}),{headers});

    // Первый успешный вход привязывает ключ к устройству.
    if (!row.device_id) {
      await context.env.DB.prepare(
        "UPDATE keys SET device_id=?1 WHERE key_value=?2 AND device_id IS NULL"
      ).bind(device_id,key).run();
    } else if (row.device_id !== device_id) {
      return new Response(JSON.stringify({valid:false,reason:"device_mismatch"}),{headers});
    }

    return new Response(JSON.stringify({valid:true,expires_at:row.expires_at}),{headers});
  } catch (e) {
    return new Response(JSON.stringify({valid:false,reason:"server_error"}),{status:500,headers});
  }
}
