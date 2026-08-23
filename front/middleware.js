export const config = {
  matcher: '/c/:codigo*',
}

export default async function middleware(request) {
  const url = new URL(request.url)
  const match = url.pathname.match(/^\/c\/([^/]+)/)
  if (!match) return

  const codigo = match[1]
  const htmlRes = await fetch(new URL('/index.html', request.url))
  let html = await htmlRes.text()

  html = html.replace(
    /<link rel="manifest"[^>]*>/,
    `<link rel="manifest" href="/api/manifest?c=${encodeURIComponent(codigo)}">`,
  )

  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  })
}
