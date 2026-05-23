"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Users, Plus, X, UserCheck, UserX, Camera, Upload, Trash2, Image as ImageIcon, ChevronLeft, ChevronRight } from "lucide-react"
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

interface PersonPhoto {
  id: string
  person_id: string
  storage_path: string
  original_name: string | null
  url: string | null
  created_at: string
}

export default function PersonsPage() {
  const [persons, setPersons] = useState<Person[]>([])
  const [photoCounts, setPhotoCounts] = useState<Record<string, number>>({})
  const [showAdd, setShowAdd] = useState(false)
  const [photoViewer, setPhotoViewer] = useState<{ person: Person } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadPersons() }, [])

  async function loadPersons() {
    const { data } = await supabase.from("home_persons").select("*").order("name")
    const personsList = data || []
    setPersons(personsList)
    setLoading(false)

    // Load photo counts for all persons
    const counts: Record<string, number> = {}
    await Promise.all(
      personsList.map(async (p) => {
        const { data: photos } = await supabase
          .from("home_person_photos")
          .select("id", { count: "exact" })
          .eq("person_id", p.id)
        counts[p.id] = photos?.length || 0
      })
    )
    setPhotoCounts(counts)
  }

  async function addPerson(fd: FormData) {
    const name = fd.get("name") as string
    const relationship = fd.get("relationship") as string
    const phone = fd.get("phone") as string

    const { data, error } = await supabase.from("home_persons").insert({
      name, relationship: relationship || null, phone: phone || null,
    }).select().single()

    if (!error && data) {
      setShowAdd(false)
      loadPersons()
      // Open photo viewer for the new person so user can add photos
      setPhotoViewer({ person: data })
    }
  }

  async function toggleActive(id: string, current: boolean) {
    await supabase.from("home_persons").update({ is_active: !current }).eq("id", id)
    loadPersons()
  }

  async function deletePerson(id: string) {
    if (!confirm("¿Eliminar esta persona y todas sus fotos?")) return
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
            <PersonCard
              key={p.id}
              person={p}
              photoCount={photoCounts[p.id] || 0}
              emoji={relationships[p.relationship || "otro"] || "👤"}
              onToggleActive={() => toggleActive(p.id, p.is_active)}
              onDelete={() => deletePerson(p.id)}
              onManagePhotos={() => setPhotoViewer({ person: p })}
            />
          ))}
        </div>
      )}

      {/* Add Person Modal */}
      {showAdd && (
        <AddPersonModal
          onClose={() => setShowAdd(false)}
          onSubmit={addPerson}
        />
      )}

      {/* Photo Manager Modal */}
      {photoViewer && (
        <PhotoManagerModal
          person={photoViewer.person}
          onClose={() => { setPhotoViewer(null); loadPersons() }}
        />
      )}
    </div>
  )
}

// ── Person Card ──────────────────────────────────────────────

function PersonCard({ person, photoCount, emoji, onToggleActive, onDelete, onManagePhotos }: {
  person: Person
  photoCount: number
  emoji: string
  onToggleActive: () => void
  onDelete: () => void
  onManagePhotos: () => void
}) {
  return (
    <div className="rounded-2xl bg-gray-900/50 backdrop-blur-xl border border-white/5 overflow-hidden hover:border-white/10 transition-colors group">
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${
            person.is_active ? "bg-emerald-500/10" : "bg-gray-800"
          }`}>
            {person.avatar_url ? (
              <img src={person.avatar_url} alt={person.name} className="w-full h-full rounded-2xl object-cover" />
            ) : (
              emoji
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white">{person.name}</h3>
            <p className="text-xs text-gray-500 mt-0.5 capitalize">{person.relationship || "Sin categoría"}</p>
            {person.phone && <p className="text-[10px] text-gray-600 mt-1">📱 {person.phone}</p>}
          </div>
          <div className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
            person.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-gray-800 text-gray-500"
          }`}>
            {person.is_active ? "Activa" : "Inactiva"}
          </div>
        </div>

        {/* Photo count badge */}
        <button
          onClick={onManagePhotos}
          className="mt-3 w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-800/50 border border-white/5 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all group/photos"
        >
          <Camera size={14} className="text-gray-500 group-hover/photos:text-emerald-400 transition-colors" />
          <span className="text-xs text-gray-500 group-hover/photos:text-gray-300 transition-colors">
            {photoCount === 0
              ? "Agregar fotos para reconocimiento"
              : `${photoCount} foto${photoCount !== 1 ? "s" : ""} facial${photoCount !== 1 ? "es" : ""}`
            }
          </span>
          {photoCount === 0 && (
            <span className="ml-auto text-[9px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded-full font-medium">
              Requerido
            </span>
          )}
          {photoCount > 0 && (
            <span className="ml-auto text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded-full font-medium">
              ✓
            </span>
          )}
        </button>

        <div className="flex gap-2 mt-3 pt-3 border-t border-white/5">
          <button onClick={onToggleActive}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium bg-gray-800 hover:bg-gray-700 text-gray-400 transition-colors">
            {person.is_active ? <UserX size={13} /> : <UserCheck size={13} />}
            {person.is_active ? "Desactivar" : "Activar"}
          </button>
          <button onClick={onDelete}
            className="px-3 py-2 rounded-lg text-xs bg-gray-800 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors">
            <X size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Add Person Modal ─────────────────────────────────────────

function AddPersonModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (fd: FormData) => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-gray-900 rounded-2xl border border-white/10 w-full max-w-md mx-4 shadow-2xl animate-in">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <h3 className="font-bold text-white flex items-center gap-2">
            <Users size={18} className="text-emerald-400" /> Nueva Persona
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg">
            <X size={16} className="text-gray-400" />
          </button>
        </div>
        <form action={(fd) => onSubmit(fd)} className="p-6 space-y-4">
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

          <div className="bg-gray-800/50 rounded-xl p-3 border border-white/5">
            <p className="text-[10px] text-gray-500 flex items-center gap-1.5">
              <Camera size={12} className="text-amber-400" />
              Después de crear la persona, podrás subir fotos faciales para el reconocimiento automático.
            </p>
          </div>

          <button type="submit" className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-colors shadow-lg shadow-emerald-500/20">
            Crear Persona
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Photo Manager Modal ──────────────────────────────────────

function PhotoManagerModal({ person, onClose }: { person: Person; onClose: () => void }) {
  const [photos, setPhotos] = useState<PersonPhoto[]>([])
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [loading, setLoading] = useState(true)
  const [previewIdx, setPreviewIdx] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadPhotos = useCallback(async () => {
    const res = await fetch(`/api/persons/photos?person_id=${person.id}`)
    if (res.ok) {
      const data = await res.json()
      setPhotos(data)
    }
    setLoading(false)
  }, [person.id])

  useEffect(() => { loadPhotos() }, [loadPhotos])

  async function uploadFile(file: File) {
    if (uploading) return

    // Validate
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      alert("Solo se permiten imágenes JPEG, PNG o WebP")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("La imagen debe pesar menos de 5MB")
      return
    }

    setUploading(true)

    const formData = new FormData()
    formData.append("file", file)
    formData.append("person_id", person.id)

    try {
      const res = await fetch("/api/persons/photos", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json()
        alert(err.error || "Error al subir la foto")
      } else {
        await loadPhotos()
      }
    } catch {
      alert("Error de red al subir la foto")
    }

    setUploading(false)
  }

  async function deletePhoto(photoId: string) {
    if (!confirm("¿Eliminar esta foto?")) return

    const res = await fetch(`/api/persons/photos?id=${photoId}`, { method: "DELETE" })
    if (res.ok) {
      setPhotos(prev => prev.filter(p => p.id !== photoId))
      if (previewIdx !== null && previewIdx >= photos.length - 1) {
        setPreviewIdx(null)
      }
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) uploadFile(file)
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
    // Reset input so same file can be selected again
    e.target.value = ""
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-gray-900 rounded-2xl border border-white/10 w-full max-w-lg mx-4 shadow-2xl animate-in max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-bold text-white flex items-center gap-2">
              <Camera size={18} className="text-emerald-400" /> Fotos de {person.name}
            </h3>
            <p className="text-[10px] text-gray-500 mt-0.5">
              Subí fotos claras del rostro para mejor reconocimiento
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
            <X size={16} className="text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Upload area */}
          <div
            className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
              dragOver
                ? "border-emerald-400 bg-emerald-500/10"
                : "border-white/10 hover:border-white/20 hover:bg-white/[0.02]"
            } ${uploading ? "opacity-50 pointer-events-none" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileSelect}
            />

            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
                <p className="text-sm text-gray-400">Subiendo foto...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center">
                  <Upload size={22} className="text-gray-500" />
                </div>
                <p className="text-sm text-gray-400">
                  Arrastrá una foto o <span className="text-emerald-400 font-medium">hacé clic para seleccionar</span>
                </p>
                <p className="text-[10px] text-gray-600">
                  JPEG, PNG o WebP • Máximo 5MB • Recomendado: foto clara del rostro
                </p>
              </div>
            )}
          </div>

          {/* Tips */}
          {photos.length === 0 && !loading && (
            <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-4">
              <p className="text-xs text-amber-400 font-medium mb-2">💡 Tips para mejor reconocimiento:</p>
              <ul className="text-[11px] text-gray-400 space-y-1">
                <li>• Subí entre 3 y 5 fotos de diferentes ángulos</li>
                <li>• Asegurate que el rostro sea visible y esté bien iluminado</li>
                <li>• Evitá fotos con lentes de sol o mascarillas</li>
                <li>• Incluí fotos con diferentes expresiones</li>
              </ul>
            </div>
          )}

          {/* Photo grid */}
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full" />
            </div>
          ) : photos.length > 0 ? (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-gray-500 font-medium">
                  {photos.length} foto{photos.length !== 1 ? "s" : ""} subida{photos.length !== 1 ? "s" : ""}
                </p>
                {photos.length >= 3 && (
                  <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-medium">
                    ✓ Óptimo
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                {photos.map((photo, idx) => (
                  <div
                    key={photo.id}
                    className="relative aspect-square rounded-xl overflow-hidden bg-gray-800 group cursor-pointer"
                    onClick={() => setPreviewIdx(idx)}
                  >
                    {photo.url ? (
                      <img
                        src={photo.url}
                        alt={photo.original_name || "Face photo"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon size={20} className="text-gray-700" />
                      </div>
                    )}

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        onClick={(e) => { e.stopPropagation(); deletePhoto(photo.id) }}
                        className="p-2 bg-red-500/20 hover:bg-red-500/40 rounded-lg transition-colors"
                      >
                        <Trash2 size={14} className="text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/5 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-medium text-sm transition-colors"
          >
            Listo
          </button>
        </div>
      </div>

      {/* Photo preview overlay */}
      {previewIdx !== null && photos[previewIdx] && (
        <PhotoPreviewOverlay
          photos={photos}
          currentIdx={previewIdx}
          onChangeIdx={setPreviewIdx}
          onClose={() => setPreviewIdx(null)}
          onDelete={(id) => { deletePhoto(id); setPreviewIdx(null) }}
        />
      )}
    </div>
  )
}

// ── Photo Preview Overlay ────────────────────────────────────

function PhotoPreviewOverlay({ photos, currentIdx, onChangeIdx, onClose, onDelete }: {
  photos: PersonPhoto[]
  currentIdx: number
  onChangeIdx: (idx: number) => void
  onClose: () => void
  onDelete: (id: string) => void
}) {
  const photo = photos[currentIdx]

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowLeft" && currentIdx > 0) onChangeIdx(currentIdx - 1)
      if (e.key === "ArrowRight" && currentIdx < photos.length - 1) onChangeIdx(currentIdx + 1)
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [currentIdx, photos.length, onClose, onChangeIdx])

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center" onClick={onClose}>
      {/* Close */}
      <button className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10">
        <X size={20} className="text-white" />
      </button>

      {/* Counter */}
      <div className="absolute top-4 left-4 z-10">
        <p className="text-sm text-gray-400">{currentIdx + 1} / {photos.length}</p>
      </div>

      {/* Delete */}
      <button
        className="absolute bottom-4 right-4 p-2.5 bg-red-500/20 hover:bg-red-500/40 rounded-xl transition-colors z-10 flex items-center gap-2"
        onClick={(e) => { e.stopPropagation(); onDelete(photo.id) }}
      >
        <Trash2 size={16} className="text-red-400" />
        <span className="text-xs text-red-400 font-medium">Eliminar</span>
      </button>

      {/* Navigation */}
      {currentIdx > 0 && (
        <button
          className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10"
          onClick={(e) => { e.stopPropagation(); onChangeIdx(currentIdx - 1) }}
        >
          <ChevronLeft size={24} className="text-white" />
        </button>
      )}
      {currentIdx < photos.length - 1 && (
        <button
          className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10"
          onClick={(e) => { e.stopPropagation(); onChangeIdx(currentIdx + 1) }}
        >
          <ChevronRight size={24} className="text-white" />
        </button>
      )}

      {/* Image */}
      {photo.url && (
        <img
          src={photo.url}
          alt={photo.original_name || "Face photo"}
          className="max-w-[80vw] max-h-[80vh] object-contain rounded-lg"
          onClick={(e) => e.stopPropagation()}
        />
      )}
    </div>
  )
}
