"use client"

import { useEffect, useState } from "react"
import { Camera, Users, Activity, Smartphone, Eye, Clock, Shield, AlertTriangle } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface Stats {
  cameras: number
  persons: number
  todayEvents: number
  todayPhoneMinutes: number
}

interface PresenceEvent {
  id: string
  person_name: string
  event_type: string
  camera_name: string
  confidence: number | null
  is_known: boolean
  event_time: string
}

interface CameraItem {
  id: string
  name: string
  location: string
  snapshot_url: string | null
  username: string
  password: string | null
  is_active: boolean
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ cameras: 0, persons: 0, todayEvents: 0, todayPhoneMinutes: 0 })
  const [events, setEvents] = useState<PresenceEvent[]>([])
  const [cameras, setCameras] = useState<CameraItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 30000) // refresh cada 30s
    return () => clearInterval(interval)
  }, [])

  async function loadData() {
    const today = new Date().toISOString().split("T")[0]

    const [camRes, persRes, evtRes] = await Promise.all([
      supabase.from("home_cameras").select("*").eq("is_active", true),
      supabase.from("home_persons").select("*", { count: "exact" }).eq("is_active", true),
      supabase.from("home_presence_events").select("*").gte("event_time", today + "T00:00:00").order("event_time", { ascending: false }).limit(20),
    ])

    setCameras(camRes.data || [])
    setEvents(evtRes.data || [])
    setStats({
      cameras: camRes.data?.length || 0,
      persons: persRes.count || 0,
      todayEvents: evtRes.data?.length || 0,
      todayPhoneMinutes: 0,
    })
    setLoading(false)
  }

  const statCards = [
    { label: "Cámaras Activas", value: stats.cameras, icon: Camera, color: "from-emerald-500 to-cyan-500", shadow: "shadow-emerald-500/20" },
    { label: "Personas Autorizadas", value: stats.persons, icon: Users, color: "from-blue-500 to-indigo-500", shadow: "shadow-blue-500/20" },
    { label: "Detecciones Hoy", value: stats.todayEvents, icon: Eye, color: "from-amber-500 to-orange-500", shadow: "shadow-amber-500/20" },
    { label: "Min. Celular Hoy", value: stats.todayPhoneMinutes, icon: Smartphone, color: "from-rose-500 to-pink-500", shadow: "shadow-rose-500/20" },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Monitoreo en tiempo real de tu hogar</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(card => (
          <div key={card.label} className="relative overflow-hidden rounded-2xl bg-gray-900/50 backdrop-blur-xl border border-white/5 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">{card.label}</p>
                <p className="text-3xl font-bold text-white mt-1">{card.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center shadow-lg ${card.shadow}`}>
                <card.icon size={22} className="text-white" />
              </div>
            </div>
            <div className={`absolute -bottom-6 -right-6 w-24 h-24 rounded-full bg-gradient-to-br ${card.color} opacity-5`} />
          </div>
        ))}
      </div>

      {/* Camera Grid + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cameras */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl bg-gray-900/50 backdrop-blur-xl border border-white/5 overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
              <Camera size={16} className="text-emerald-400" />
              <h2 className="font-semibold text-white text-sm">Cámaras en Vivo</h2>
              <span className="ml-auto text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-medium">
                {stats.cameras} online
              </span>
            </div>
            
            {cameras.length === 0 ? (
              <div className="p-12 text-center">
                <Camera size={40} className="mx-auto text-gray-700 mb-3" />
                <p className="text-gray-500 text-sm">No hay cámaras configuradas</p>
                <a href="/cameras" className="text-emerald-400 text-sm hover:underline mt-1 inline-block">
                  Agregar cámara →
                </a>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-px bg-white/5 p-px">
                {cameras.slice(0, 4).map(cam => (
                  <CameraPreview key={cam.id} camera={cam} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-2xl bg-gray-900/50 backdrop-blur-xl border border-white/5 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
            <Activity size={16} className="text-amber-400" />
            <h2 className="font-semibold text-white text-sm">Actividad Reciente</h2>
          </div>
          
          {events.length === 0 ? (
            <div className="p-8 text-center">
              <Activity size={30} className="mx-auto text-gray-700 mb-2" />
              <p className="text-gray-500 text-xs">Sin actividad hoy</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto">
              {events.slice(0, 15).map(evt => (
                <div key={evt.id} className="px-4 py-3 hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      evt.is_known 
                        ? "bg-emerald-500/10 text-emerald-400" 
                        : "bg-red-500/10 text-red-400"
                    }`}>
                      {evt.is_known ? <Shield size={14} /> : <AlertTriangle size={14} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white truncate">{evt.person_name}</p>
                      <p className="text-[10px] text-gray-500">{evt.camera_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-gray-500">
                        {new Date(evt.event_time).toLocaleTimeString("es-AR", {
                          hour: "2-digit", minute: "2-digit"
                        })}
                      </p>
                      {evt.confidence && (
                        <p className="text-[9px] text-gray-600">{(evt.confidence * 100).toFixed(0)}%</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CameraPreview({ camera }: { camera: CameraItem }) {
  const [error, setError] = useState(false)
  const [imgKey, setImgKey] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => setImgKey(k => k + 1), 5000) // refresh snapshot cada 5s
    return () => clearInterval(interval)
  }, [])

  const snapshotSrc = camera.snapshot_url
    ? `/api/cameras/snapshot?url=${encodeURIComponent(camera.snapshot_url)}&user=${camera.username || "admin"}&pass=${camera.password || ""}&t=${imgKey}`
    : null

  return (
    <div className="relative aspect-video bg-gray-800 overflow-hidden group">
      {snapshotSrc && !error ? (
        <img
          key={imgKey}
          src={snapshotSrc}
          alt={camera.name}
          className="w-full h-full object-cover"
          onError={() => setError(true)}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Camera size={30} className="text-gray-700" />
        </div>
      )}

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      
      {/* Camera info */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <p className="text-xs font-medium text-white">{camera.name}</p>
        </div>
        <p className="text-[10px] text-gray-400 ml-4">{camera.location}</p>
      </div>

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
          <p className="text-xs text-red-400 font-medium">Offline</p>
        </div>
      )}
    </div>
  )
}
