import { NextRequest, NextResponse } from "next/server"
import { getAdmin } from "@/lib/supabase"

export async function GET() {
  const admin = getAdmin()
  const { data, error } = await admin.from("home_cameras").select("*").order("created_at")
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, location, rtsp_url, snapshot_url, username, password } = body

  if (!name || !rtsp_url) {
    return NextResponse.json({ error: "name and rtsp_url are required" }, { status: 400 })
  }

  const admin = getAdmin()
  const { data, error } = await admin.from("home_cameras").insert({
    name, location: location || "general",
    rtsp_url,
    snapshot_url: snapshot_url || null,
    username: username || "admin",
    password: password || null,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  const admin = getAdmin()
  const { error } = await admin.from("home_cameras").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
