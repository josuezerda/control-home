import { NextRequest, NextResponse } from "next/server"
import { getAdmin } from "@/lib/supabase"

// POST — RPi sends heartbeat
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      device_id = "rpi5",
      cameras_processing = 0,
      cpu_temp = null,
      uptime_seconds = null,
      ip_address = null,
      version = "1.0.0",
    } = body

    const admin = getAdmin()

    const { error } = await admin
      .from("home_device_heartbeats")
      .upsert({
        id: device_id,
        device_name: "Raspberry Pi 5",
        last_heartbeat: new Date().toISOString(),
        status: "online",
        cameras_processing,
        cpu_temp,
        uptime_seconds,
        ip_address,
        version,
      })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// GET — Dashboard queries heartbeat status
export async function GET() {
  const admin = getAdmin()

  const { data, error } = await admin
    .from("home_device_heartbeats")
    .select("*")
    .eq("id", "rpi5")
    .single()

  if (error) {
    return NextResponse.json(
      { status: "offline", last_heartbeat: null },
      { status: 200 }
    )
  }

  // Determine effective status based on time since last heartbeat
  let effectiveStatus = "offline"
  if (data.last_heartbeat) {
    const lastBeat = new Date(data.last_heartbeat).getTime()
    const now = Date.now()
    const diffSeconds = (now - lastBeat) / 1000

    if (diffSeconds < 60) {
      effectiveStatus = "online"
    } else if (diffSeconds < 120) {
      effectiveStatus = "degraded"
    } else {
      effectiveStatus = "offline"
    }
  }

  return NextResponse.json({
    ...data,
    effective_status: effectiveStatus,
  })
}
