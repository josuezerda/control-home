"use client"

import { useState, useEffect } from "react"
import { Activity, Shield, AlertTriangle, Filter, Calendar } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface PresenceEvent {
  id: string
  person_name: string
  event_type: string
  camera_name: string | null
  confidence: number | null
  is_known: boolean
  event_time: string
  photo_url: string | null
}

export default function ActivityPage() {
  const [events, setEvents] = useState<PresenceEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "known" | "unknown">("all")

  useEffect(() => { loadEvents() }, [])

  async function loadEvents() {
    const query = supabase.from("home_presence_events")
      .select("*")
      .order("event_time", { ascending: false })
      .limit(100)

    const { data } = await query
    setEvents(data || [])
    setLoading(false)
  }

  const filtered = events.filter(e => {
    if (filter === "known") return e.is_known
    if (filter === "unknown") return !e.is_known
    return true
  })

  const eventLabels: Record<string, { label: string; color: string }> = {
    arrival: { label: "Llegada", color: "text-emerald-400" },
    departure: { label: "Salida", color: "text-blue-400" },
    detected: { label: "Detectado", color: "text-gray-400" },
    unknown_person: { label: "Desconocido", color: "text-red-400" },
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Actividad</h1>
          <p className="text-sm text-gray-500 mt-1">Historial de detecciones y eventos</p>
        </div>

        <div className="flex items-center gap-2">
          {(["all", "known", "unknown"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === f ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" : "bg-gray-800 text-gray-500 border border-white/5"
              }`}>
              {f === "all" ? "Todos" : f === "known" ? "Conocidos" : "Desconocidos"}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-gray-900/50 backdrop-blur-xl border border-white/5 overflow-hidden">
        {loading ? (
          <div className="p-16 flex justify-center">
            <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center">
            <Activity size={40} className="mx-auto text-gray-700 mb-3" />
            <p className="text-gray-500">Sin eventos registrados</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filtered.map(evt => {
              const info = eventLabels[evt.event_type] || { label: evt.event_type, color: "text-gray-400" }
              const time = new Date(evt.event_time)
              const timeStr = time.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })
              const dateStr = time.toLocaleDateString("es-AR", { day: "numeric", month: "short" })

              return (
                <div key={evt.id} className="px-5 py-4 hover:bg-white/[0.02] transition-colors flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    evt.is_known ? "bg-emerald-500/10" : "bg-red-500/10"
                  }`}>
                    {evt.is_known ? <Shield size={18} className="text-emerald-400" /> : <AlertTriangle size={18} className="text-red-400" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white">{evt.person_name}</p>
                      <span className={`text-[10px] font-medium ${info.color}`}>{info.label}</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {evt.camera_name || "Cámara desconocida"}
                      {evt.confidence && ` • ${(evt.confidence * 100).toFixed(0)}% confianza`}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-400 font-medium">{timeStr}</p>
                    <p className="text-[10px] text-gray-600">{dateStr}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
