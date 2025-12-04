// app/api/logout/route.ts
export async function POST() {
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      // apagar cookie
      "Set-Cookie":
        "iumatec_token=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0",
      "Content-Type": "application/json",
    },
  });
}
