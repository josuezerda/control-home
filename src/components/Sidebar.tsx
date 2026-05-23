"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Camera, Users, Activity, Settings, Shield } from "lucide-react"

const NAV = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/cameras", label: "Cámaras", icon: Camera },
  { href: "/persons", label: "Personas", icon: Users },
  { href: "/activity", label: "Actividad", icon: Activity },
  { href: "/settings", label: "Configuración", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-gray-900/80 backdrop-blur-xl border-r border-white/5 flex flex-col z-50">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Shield size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-white text-sm tracking-tight">Control Home</h1>
            <p className="text-[10px] text-gray-500 font-medium">Cámaras & IA</p>
          </div>
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

      {/* Status */}
      <div className="px-4 py-4 border-t border-white/5">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800/50">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-xs text-gray-400">RPi5 — Esperando conexión</span>
        </div>
      </div>
    </aside>
  )
}
