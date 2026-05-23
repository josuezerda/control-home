"use client"

import { useState, useEffect } from "react"
import { Camera, Plus, Trash2, MapPin, Wifi, WifiOff, Eye, X } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface CameraItem {
  id: string
  name: string
  location: string
  rtsp_url: string
  snapshot_url: string | null
  username: string
  password: string | null
  is_active: boolean
}

export default function CamerasPage() {
  const [cameras, setCameras] = useState<CameraItem[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [fullscreen, setFullscreen] = useState<CameraItem | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadCameras() }, [])

  async function loadCameras() {
    const { data } = await supabase.from("home_cameras").select("*").order("created_at")
    setCameras(data || [])
    setLoading(false)
  }

  async function addCamera(formData: FormData) {
    const ip = formData.get("ip") as string
    const name = formData.get("name") as string
    const location = formData.get("location") as string
    const user = formData.get("username") as string || "admin"
    const pass = formData.get("password") as string || ""
    const channel = formData.get("channel") as string || "1"

    const rtsp_url = `rtsp://${user}:${pass}@${ip}:554/cam/realmonitor?channel=${channel}&subtype=0`
    const snapshot_url = `http://${ip}/cgi-bin/snapshot.cgi?channel=${channel}`

    const res = await fetch("/api/cameras", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, location, rtsp_url, snapshot_url, username: user, password: pass }),
    })

    if (res.ok) {
      setShowAdd(false)
      loadCameras()
    }
  }

  async function deleteCamera(id: string) {
    if (!confirm("¿Eliminar esta cámara?")) return
    await fetch(`/api/cameras?id=${id}`, { method: "DELETE" })
    loadCameras()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Cámaras</h1>
          <p className="text-sm text-gray-500 mt-1">Configurá y visualizá tus cámaras Dahua</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-emerald-500/20"
        >
          <Plus size={16} /> Agregar Cámara
        </button>
      </div>

      {/* Camera Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
        </div>
      ) : cameras.length === 0 ? (
        <div className="rounded-2xl bg-gray-900/50 backdrop-blur-xl border border-white/5 p-16 text-center">
          <Camera size={50} className="mx-auto text-gray-700 mb-4" />
          <h2 className="text-lg font-semibold text-gray-400 mb-2">Sin cámaras configuradas</h2>
          <p className="text-gray-600 text-sm mb-4">Agregá tu primera cámara Dahua para empezar</p>
          <button
            onClick={() => setShowAdd(true)}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <Plus size={14} className="inline mr-1" /> Agregar Cámara
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {cameras.map(cam => (
            <CameraCard
              key={cam.id}
              camera={cam}
              onDelete={() => deleteCamera(cam.id)}
              onFullscreen={() => setFullscreen(cam)}
            />
          ))}
        </div>
      )}

      {/* Add Camera Modal */}
      {showAdd && <AddCameraModal onClose={() => setShowAdd(false)} onSubmit={addCamera} />}

      {/* Fullscreen Viewer */}
      {fullscreen && <FullscreenViewer camera={fullscreen} onClose={() => setFullscreen(null)} />}
    </div>
  )
}

function CameraCard({ camera, onDelete, onFullscreen }: {
  camera: CameraItem
  onDelete: () => void
  onFullscreen: () => void
}) {
  const [error, setError] = useState(false)
  const [imgKey, setImgKey] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => { setImgKey(k => k + 1); setError(false) }, 5000)
    return () => clearInterval(interval)
  }, [])

  const src = camera.snapshot_url
    ? `/api/cameras/snapshot?url=${encodeURIComponent(camera.snapshot_url)}&user=${camera.username}&pass=${camera.password || ""}&t=${imgKey}`
    : null

  return (
    <div className="rounded-2xl bg-gray-900/50 backdrop-blur-xl border border-white/5 overflow-hidden group">
      <div className="relative aspect-video bg-gray-800">
        {src && !error ? (
          <img
            key={imgKey}
            src={src}
            alt={camera.name}
            className="w-full h-full object-cover"
            onError={() => setError(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <WifiOff size={28} className="text-gray-700" />
            <p className="text-xs text-gray-600">Sin señal</p>
          </div>
        )}

        <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onFullscreen}
            className="p-1.5 bg-black/60 backdrop-blur rounded-lg hover:bg-black/80 transition-colors"
          >
            <Eye size={14} className="text-white" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 bg-black/60 backdrop-blur rounded-lg hover:bg-red-500/80 transition-colors"
          >
            <Trash2 size={14} className="text-white" />
          </button>
        </div>

        <div className="absolute top-3 left-3">
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium backdrop-blur-sm ${
            error ? "bg-red-500/20 text-red-300" : "bg-emerald-500/20 text-emerald-300"
          }`}>
            {error ? <WifiOff size={10} /> : <Wifi size={10} />}
            {error ? "Offline" : "Online"}
          </div>
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-white text-sm">{camera.name}</h3>
        <div className="flex items-center gap-1.5 mt-1 text-gray-500">
          <MapPin size={12} />
          <span className="text-xs">{camera.location}</span>
        </div>
      </div>
    </div>
  )
}

function AddCameraModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (fd: FormData) => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-gray-900 rounded-2xl border border-white/10 w-full max-w-md mx-4 overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <h3 className="font-bold text-white flex items-center gap-2">
            <Camera size={18} className="text-emerald-400" /> Nueva Cámara Dahua
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
            <X size={16} className="text-gray-400" />
          </button>
        </div>

        <form action={(fd) => onSubmit(fd)} className="p-6 space-y-4">
          <div>
            <label className="text-xs text-gray-400 font-medium">Nombre</label>
            <input name="name" required placeholder="Cámara Entrada" className="mt-1 w-full px-3 py-2.5 bg-gray-800 border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
          </div>
          <div>
            <label className="text-xs text-gray-400 font-medium">Ubicación</label>
            <input name="location" placeholder="Entrada principal" className="mt-1 w-full px-3 py-2.5 bg-gray-800 border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
          </div>
          <div>
            <label className="text-xs text-gray-400 font-medium">IP de la cámara</label>
            <input name="ip" required placeholder="192.168.1.100" className="mt-1 w-full px-3 py-2.5 bg-gray-800 border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 font-medium">Usuario</label>
              <input name="username" defaultValue="admin" className="mt-1 w-full px-3 py-2.5 bg-gray-800 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium">Contraseña</label>
              <input name="password" type="password" className="mt-1 w-full px-3 py-2.5 bg-gray-800 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 font-medium">Canal</label>
            <input name="channel" defaultValue="1" className="mt-1 w-full px-3 py-2.5 bg-gray-800 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
          </div>

          <div className="bg-gray-800/50 rounded-xl p-3 border border-white/5">
            <p className="text-[10px] text-gray-500">
              URL RTSP generada automáticamente: <br />
              <code className="text-emerald-400">rtsp://user:pass@IP:554/cam/realmonitor?channel=1&subtype=0</code>
            </p>
          </div>

          <button type="submit" className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-colors shadow-lg shadow-emerald-500/20">
            Agregar Cámara
          </button>
        </form>
      </div>
    </div>
  )
}

function FullscreenViewer({ camera, onClose }: { camera: CameraItem; onClose: () => void }) {
  const [imgKey, setImgKey] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => setImgKey(k => k + 1), 3000)
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handleKey)
    return () => { clearInterval(interval); window.removeEventListener("keydown", handleKey) }
  }, [onClose])

  const src = camera.snapshot_url
    ? `/api/cameras/snapshot?url=${encodeURIComponent(camera.snapshot_url)}&user=${camera.username}&pass=${camera.password || ""}&t=${imgKey}`
    : null

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center" onClick={onClose}>
      <button className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10">
        <X size={20} className="text-white" />
      </button>
      <div className="absolute top-4 left-4 z-10">
        <h3 className="text-white font-semibold">{camera.name}</h3>
        <p className="text-gray-400 text-sm">{camera.location}</p>
      </div>
      {src && (
        <img
          key={imgKey}
          src={src}
          alt={camera.name}
          className="max-w-full max-h-full object-contain"
          onClick={(e) => e.stopPropagation()}
        />
      )}
    </div>
  )
}
