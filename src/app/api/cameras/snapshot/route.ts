import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url")
  const user = req.nextUrl.searchParams.get("user") || "admin"
  const pass = req.nextUrl.searchParams.get("pass") || ""

  if (!url) {
    return NextResponse.json({ error: "Missing url param" }, { status: 400 })
  }

  try {
    const authHeader = Buffer.from(`${user}:${pass}`).toString("base64")

    const res = await fetch(url, {
      headers: { Authorization: `Basic ${authHeader}` },
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) {
      return NextResponse.json({ error: `Camera returned ${res.status}` }, { status: 502 })
    }

    const contentType = res.headers.get("content-type") || "image/jpeg"
    const buffer = await res.arrayBuffer()

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Camera offline" }, { status: 502 })
  }
}
