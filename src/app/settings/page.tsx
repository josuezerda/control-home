"use client"

import { useState, useEffect } from "react"
import { Settings, Save, Bell, Smartphone, Clock, Check } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface Config {
  alert_phones: string[]
  phone_limit_minutes: number
  detection_interval_seconds: number
  unknown_person_alert: boolean
  phone_usage_alert: boolean
  notifications_enabled: boolean
}

export default function SettingsPage() {
  const [config, setConfig] = useState<Config>({
    alert_phones: [],
    phone_limit_minutes: 60,
    detection_interval_seconds: 2,
    unknown_person_alert: true,
    phone_usage_alert: true,
    notifications_enabled: false,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    supabase.from("home_config").select("*").eq("id", "main").single().then(({ data }) => {
      if (data) setConfig(data as any)
    })
  }, [])

  async function saveConfig() {
    setSaving(true)
    await supabase.from("home_config").update({
      ...config,
      updated_at: new Date().toISOString(),
    }).eq("id", "main")
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Configuración</h1>
        <p className="text-sm text-gray-500 mt-1">Ajustes del sistema de Control Home</p>
      </div>

      {/* Master Toggle */}
      <div className={`rounded-2xl backdrop-blur-xl border overflow-hidden transition-all ${
        config.notifications_enabled 
          ? "bg-emerald-500/10 border-emerald-500/30" 
          : "bg-gray-900/50 border-white/5"
      }`}>
        <div className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              config.notifications_enabled ? "bg-emerald-500/20" : "bg-gray-800"
            }`}>
              <Bell size={20} className={config.notifications_enabled ? "text-emerald-400" : "text-gray-500"} />
            </div>
            <div>
              <p className="text-white font-semibold">Notificaciones</p>
              <p className="text-xs text-gray-400">
                {config.notifications_enabled ? "Las alertas WhatsApp están activas" : "Todas las alertas están desactivadas"}
              </p>
            </div>
          </div>
          <button onClick={() => setConfig(c => ({ ...c, notifications_enabled: !c.notifications_enabled }))}
            className={`w-14 h-8 rounded-full transition-colors ${config.notifications_enabled ? "bg-emerald-500" : "bg-gray-700"}`}>
            <div className={`w-6 h-6 rounded-full bg-white shadow-lg transition-transform ${config.notifications_enabled ? "translate-x-7" : "translate-x-1"}`} />
          </button>
        </div>
      </div>

      {/* Alertas */}
      <div className={`rounded-2xl bg-gray-900/50 backdrop-blur-xl border border-white/5 overflow-hidden transition-opacity ${!config.notifications_enabled ? "opacity-40 pointer-events-none" : ""}`}>
        <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
          <Bell size={16} className="text-amber-400" />
          <h2 className="font-semibold text-white text-sm">Alertas WhatsApp</h2>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs text-gray-400 font-medium">Teléfonos para alertas (uno por línea)</label>
            <textarea
              value={config.alert_phones.join("\n")}
              onChange={e => setConfig(c => ({ ...c, alert_phones: e.target.value.split("\n").filter(Boolean) }))}
              rows={3}
              className="mt-1 w-full px-3 py-2.5 bg-gray-800 border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-mono"
              placeholder="5493855381804"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white font-medium">Persona desconocida</p>
              <p className="text-xs text-gray-500">Alertar cuando se detecta alguien no autorizado</p>
            </div>
            <button onClick={() => setConfig(c => ({ ...c, unknown_person_alert: !c.unknown_person_alert }))}
              className={`w-11 h-6 rounded-full transition-colors ${config.unknown_person_alert ? "bg-emerald-500" : "bg-gray-700"}`}>
              <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${config.unknown_person_alert ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white font-medium">Límite de celular</p>
              <p className="text-xs text-gray-500">Alertar cuando se supera el tiempo máximo diario</p>
            </div>
            <button onClick={() => setConfig(c => ({ ...c, phone_usage_alert: !c.phone_usage_alert }))}
              className={`w-11 h-6 rounded-full transition-colors ${config.phone_usage_alert ? "bg-emerald-500" : "bg-gray-700"}`}>
              <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${config.phone_usage_alert ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Detección */}
      <div className="rounded-2xl bg-gray-900/50 backdrop-blur-xl border border-white/5 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
          <Smartphone size={16} className="text-rose-400" />
          <h2 className="font-semibold text-white text-sm">Detección de Celular</h2>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs text-gray-400 font-medium">Límite diario (minutos)</label>
            <input
              type="number"
              value={config.phone_limit_minutes}
              onChange={e => setConfig(c => ({ ...c, phone_limit_minutes: parseInt(e.target.value) || 60 }))}
              className="mt-1 w-full px-3 py-2.5 bg-gray-800 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 font-medium">Intervalo de análisis (segundos)</label>
            <input
              type="number"
              value={config.detection_interval_seconds}
              onChange={e => setConfig(c => ({ ...c, detection_interval_seconds: parseInt(e.target.value) || 2 }))}
              className="mt-1 w-full px-3 py-2.5 bg-gray-800 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
            <p className="text-[10px] text-gray-600 mt-1">Menor = más preciso pero más uso de CPU. Recomendado: 2-5s</p>
          </div>
        </div>
      </div>

      {/* Save */}
      <button onClick={saveConfig} disabled={saving}
        className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-xl font-medium transition-colors shadow-lg shadow-emerald-500/20">
        {saving ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> :
          saved ? <><Check size={16} /> Guardado</> : <><Save size={16} /> Guardar Configuración</>}
      </button>
    </div>
  )
}
