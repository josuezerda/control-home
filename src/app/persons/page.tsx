"use client"

import { useState, useEffect } from "react"
import { Users, Plus, X, UserCheck, UserX, Clock, Smartphone } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface Person {
  id: string
  name: string
  relationship: string | null
  avatar_url: string | null
  phone: string | null
  is_active: boolean
  created_at: string
}

export default function PersonsPage() {
  const [persons, setPersons] = useState<Person[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadPersons() }, [])

  async function loadPersons() {
    const { data } = await supabase.from("home_persons").select("*").order("name")
    setPersons(data || [])
    setLoading(false)
  }

  async function addPerson(fd: FormData) {
    const name = fd.get("name") as string
    const relationship = fd.get("relationship") as string
    const phone = fd.get("phone") as string

    const { error } = await supabase.from("home_persons").insert({
      name, relationship: relationship || null, phone: phone || null,
    })

    if (!error) { setShowAdd(false); loadPersons() }
  }

  async function toggleActive(id: string, current: boolean) {
    await supabase.from("home_persons").update({ is_active: !current }).eq("id", id)
    loadPersons()
  }

  async function deletePerson(id: string) {
    if (!confirm("¿Eliminar esta persona?")) return
    await supabase.from("home_persons").delete().eq("id", id)
    loadPersons()
  }

  const relationships: Record<string, string> = {
    familia: "👨‍👩‍👧‍👦", empleada: "🏠", visita: "👋", niñera: "👶", otro: "👤"
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Personas Autorizadas</h1>
          <p className="text-sm text-gray-500 mt-1">Gestión de personas reconocidas por el sistema</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-emerald-500/20">
          <Plus size={16} /> Agregar Persona
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
        </div>
      ) : persons.length === 0 ? (
        <div className="rounded-2xl bg-gray-900/50 backdrop-blur-xl border border-white/5 p-16 text-center">
          <Users size={50} className="mx-auto text-gray-700 mb-4" />
          <h2 className="text-lg font-semibold text-gray-400 mb-2">Sin personas registradas</h2>
          <p className="text-gray-600 text-sm mb-4">Agregá personas para que el sistema las reconozca</p>
          <button onClick={() => setShowAdd(true)}
            className="px-5 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-medium">
            <Plus size={14} className="inline mr-1" /> Agregar Persona
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {persons.map(p => (
            <div key={p.id} className="rounded-2xl bg-gray-900/50 backdrop-blur-xl border border-white/5 overflow-hidden hover:border-white/10 transition-colors group">
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${
                    p.is_active ? "bg-emerald-500/10" : "bg-gray-800"
                  }`}>
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt={p.name} className="w-full h-full rounded-2xl object-cover" />
                    ) : (
                      relationships[p.relationship || "otro"] || "👤"
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white">{p.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5 capitalize">{p.relationship || "Sin categoría"}</p>
                    {p.phone && <p className="text-[10px] text-gray-600 mt-1">📱 {p.phone}</p>}
                  </div>
                  <div className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    p.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-gray-800 text-gray-500"
                  }`}>
                    {p.is_active ? "Activa" : "Inactiva"}
                  </div>
                </div>

                <div className="flex gap-2 mt-4 pt-3 border-t border-white/5">
                  <button onClick={() => toggleActive(p.id, p.is_active)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium bg-gray-800 hover:bg-gray-700 text-gray-400 transition-colors">
                    {p.is_active ? <UserX size={13} /> : <UserCheck size={13} />}
                    {p.is_active ? "Desactivar" : "Activar"}
                  </button>
                  <button onClick={() => deletePerson(p.id)}
                    className="px-3 py-2 rounded-lg text-xs bg-gray-800 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors">
                    <X size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="bg-gray-900 rounded-2xl border border-white/10 w-full max-w-md mx-4 shadow-2xl">
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Users size={18} className="text-emerald-400" /> Nueva Persona
              </h3>
              <button onClick={() => setShowAdd(false)} className="p-1 hover:bg-white/10 rounded-lg">
                <X size={16} className="text-gray-400" />
              </button>
            </div>
            <form action={(fd) => addPerson(fd)} className="p-6 space-y-4">
              <div>
                <label className="text-xs text-gray-400 font-medium">Nombre completo</label>
                <input name="name" required placeholder="Benicio Zerda" className="mt-1 w-full px-3 py-2.5 bg-gray-800 border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
              </div>
              <div>
                <label className="text-xs text-gray-400 font-medium">Relación</label>
                <select name="relationship" className="mt-1 w-full px-3 py-2.5 bg-gray-800 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
                  <option value="familia">👨‍👩‍👧‍👦 Familia</option>
                  <option value="empleada">🏠 Empleada</option>
                  <option value="niñera">👶 Niñera</option>
                  <option value="visita">👋 Visita frecuente</option>
                  <option value="otro">👤 Otro</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 font-medium">Teléfono (opcional)</label>
                <input name="phone" placeholder="5493855381804" className="mt-1 w-full px-3 py-2.5 bg-gray-800 border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
              </div>
              <button type="submit" className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-colors shadow-lg shadow-emerald-500/20">
                Agregar Persona
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
