export async function onRequestPost(context) {
  const headers={"content-type":"application/json;charset=UTF-8"};
  if (context.request.headers.get("authorization") !== `Bearer ${context.env.ADMIN_TOKEN}`)
    return new Response(JSON.stringify({ok:false,error:"unauthorized"}),{status:401,headers});

  const body=await context.request.json().catch(()=>({}));
  const days=Math.max(1,Math.min(Number(body.days)||30,3650));
  const bytes=new Uint8Array(6); crypto.getRandomValues(bytes);
  const hex=[...bytes].map(x=>x.toString(16).padStart(2,"0").toUpperCase()).join("");
  const key=`M4X-${hex.slice(0,4)}-${hex.slice(4,8)}-${hex.slice(8,12)}`;
  const created=Math.floor(Date.now()/1000);
  const expires=created+days*86400;

  await context.env.DB.prepare(
    "INSERT INTO keys(key_value,device_id,created_at,expires_at,revoked) VALUES(?1,NULL,?2,?3,0)"
  ).bind(key,created,expires).run();

  return new Response(JSON.stringify({ok:true,key,days,expires_at:expires}),{headers});
}
