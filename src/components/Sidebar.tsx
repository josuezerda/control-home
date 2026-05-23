"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect, useCallback } from "react"
import { Home, Camera, Users, Activity, Settings, Shield, Wifi, WifiOff, Thermometer, Clock, Menu, X } from "lucide-react"

const NAV = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/cameras", label: "Cámaras", icon: Camera },
  { href: "/persons", label: "Personas", icon: Users },
  { href: "/activity", label: "Actividad", icon: Activity },
  { href: "/settings", label: "Configuración", icon: Settings },
]

interface HeartbeatData {
  effective_status: "online" | "degraded" | "offline"
  last_heartbeat: string | null
  cpu_temp: number | null
  uptime_seconds: number | null
  cameras_processing: number | null
  ip_address: string | null
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export function Sidebar() {
  const pathname = usePathname()
  const [heartbeat, setHeartbeat] = useState<HeartbeatData | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  const fetchHeartbeat = useCallback(async () => {
    try {
      const res = await fetch("/api/heartbeat")
      if (res.ok) {
        const data = await res.json()
        setHeartbeat(data)
      }
    } catch {
      setHeartbeat(null)
    }
  }, [])

  useEffect(() => {
    fetchHeartbeat()
    const interval = setInterval(fetchHeartbeat, 15000)
    return () => clearInterval(interval)
  }, [fetchHeartbeat])

  // Close mobile sidebar on navigation
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [mobileOpen])

  const statusConfig = {
    online: {
      color: "bg-emerald-400",
      textColor: "text-emerald-400",
      bgColor: "bg-emerald-500/5 border-emerald-500/10",
      label: "Online",
      icon: Wifi,
    },
    degraded: {
      color: "bg-amber-400",
      textColor: "text-amber-400",
      bgColor: "bg-amber-500/5 border-amber-500/10",
      label: "Inestable",
      icon: Wifi,
    },
    offline: {
      color: "bg-red-400",
      textColor: "text-red-400",
      bgColor: "bg-red-500/5 border-red-500/10",
      label: "Offline",
      icon: WifiOff,
    },
  }

  const status = heartbeat?.effective_status || "offline"
  const cfg = statusConfig[status]
  const StatusIcon = cfg.icon

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Shield size={20} className="text-white" />
          </div>
          <div className="flex-1">
            <h1 className="font-bold text-white text-sm tracking-tight">Control Home</h1>
            <p className="text-[10px] text-gray-500 font-medium">Cámaras & IA</p>
          </div>
          {/* Close button (mobile only) */}
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1.5 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={18} className="text-gray-400" />
          </button>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(item => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                active
                  ? "bg-emerald-500/10 text-emerald-400 shadow-sm"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <item.icon size={18} className={active ? "text-emerald-400" : ""} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* RPi Status */}
      <div className="px-4 py-4 border-t border-white/5">
        <div className={`rounded-xl border p-3 transition-colors ${cfg.bgColor}`}>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${cfg.color} ${status === "online" ? "animate-pulse" : ""}`} />
            <StatusIcon size={12} className={cfg.textColor} />
            <span className={`text-xs font-medium ${cfg.textColor}`}>
              RPi5 — {cfg.label}
            </span>
          </div>

          {heartbeat && status !== "offline" && (
            <div className="mt-2 space-y-1 pl-4">
              {heartbeat.cpu_temp !== null && (
                <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                  <Thermometer size={10} />
                  <span>{heartbeat.cpu_temp.toFixed(1)}°C</span>
                </div>
              )}
              {heartbeat.uptime_seconds !== null && (
                <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                  <Clock size={10} />
                  <span>Uptime: {formatUptime(heartbeat.uptime_seconds)}</span>
                </div>
              )}
              {heartbeat.cameras_processing !== null && heartbeat.cameras_processing > 0 && (
                <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                  <Camera size={10} />
                  <span>{heartbeat.cameras_processing} cámara{heartbeat.cameras_processing !== 1 ? "s" : ""}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile header bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-gray-900/95 backdrop-blur-xl border-b border-white/5 flex items-center px-4 z-40">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 -ml-1 hover:bg-white/10 rounded-xl transition-colors"
          aria-label="Abrir menú"
        >
          <Menu size={22} className="text-gray-300" />
        </button>
        <div className="flex items-center gap-2 ml-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
            <Shield size={14} className="text-white" />
          </div>
          <span className="font-bold text-white text-sm">Control Home</span>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${cfg.color} ${status === "online" ? "animate-pulse" : ""}`} />
          <span className={`text-[10px] font-medium ${cfg.textColor}`}>{cfg.label}</span>
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 bg-gray-900/80 backdrop-blur-xl border-r border-white/5 flex-col z-50">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          onClick={() => setMobileOpen(false)}
        >
          <aside
            className="fixed left-0 top-0 h-screen w-72 bg-gray-900 border-r border-white/5 flex flex-col sidebar-slide-in"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  )
}
