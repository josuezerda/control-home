import { NextRequest, NextResponse } from "next/server"
import { getAdmin } from "@/lib/supabase"

// GET — Phone usage stats for a given date
export async function GET(req: NextRequest) {
  const dateParam = req.nextUrl.searchParams.get("date")
  const date = dateParam || new Date().toISOString().split("T")[0]

  const admin = getAdmin()

  // Get all completed sessions for the given date
  const { data: sessions, error } = await admin
    .from("home_phone_sessions")
    .select("*")
    .gte("started_at", `${date}T00:00:00`)
    .lte("started_at", `${date}T23:59:59`)
    .order("started_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Calculate total minutes
  const totalSeconds = (sessions || []).reduce((acc, s) => {
    return acc + (s.duration_seconds || 0)
  }, 0)

  const totalMinutes = Math.round(totalSeconds / 60)

  return NextResponse.json({
    date,
    total_minutes: totalMinutes,
    total_seconds: totalSeconds,
    sessions_count: sessions?.length || 0,
    sessions: sessions || [],
  })
}
