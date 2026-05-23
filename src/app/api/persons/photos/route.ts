import { NextRequest, NextResponse } from "next/server"
import { getAdmin } from "@/lib/supabase"

// POST — Upload a photo for a person
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const personId = formData.get("person_id") as string | null

    if (!file || !personId) {
      return NextResponse.json(
        { error: "file and person_id are required" },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Only JPEG, PNG, and WebP images are allowed" },
        { status: 400 }
      )
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size must be under 5MB" },
        { status: 400 }
      )
    }

    const admin = getAdmin()

    // Verify person exists
    const { data: person } = await admin
      .from("home_persons")
      .select("id")
      .eq("id", personId)
      .single()

    if (!person) {
      return NextResponse.json({ error: "Person not found" }, { status: 404 })
    }

    // Generate unique file path
    const ext = file.name.split(".").pop() || "jpg"
    const timestamp = Date.now()
    const storagePath = `${personId}/${timestamp}.${ext}`

    // Upload to Supabase Storage
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    const { error: uploadError } = await admin.storage
      .from("face-photos")
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error("Storage upload error:", uploadError)
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      )
    }

    // Insert record in database
    const { data: photoRecord, error: dbError } = await admin
      .from("home_person_photos")
      .insert({
        person_id: personId,
        storage_path: storagePath,
        original_name: file.name,
      })
      .select()
      .single()

    if (dbError) {
      // Rollback: delete uploaded file
      await admin.storage.from("face-photos").remove([storagePath])
      return NextResponse.json(
        { error: `DB error: ${dbError.message}` },
        { status: 500 }
      )
    }

    // Generate signed URL for immediate display
    const { data: signedUrlData } = await admin.storage
      .from("face-photos")
      .createSignedUrl(storagePath, 3600) // 1 hour

    return NextResponse.json({
      ...photoRecord,
      url: signedUrlData?.signedUrl || null,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("Photo upload error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// GET — List photos for a person (with signed URLs)
export async function GET(req: NextRequest) {
  const personId = req.nextUrl.searchParams.get("person_id")

  if (!personId) {
    return NextResponse.json(
      { error: "person_id is required" },
      { status: 400 }
    )
  }

  const admin = getAdmin()

  const { data: photos, error } = await admin
    .from("home_person_photos")
    .select("*")
    .eq("person_id", personId)
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Generate signed URLs for each photo
  const photosWithUrls = await Promise.all(
    (photos || []).map(async (photo) => {
      const { data } = await admin.storage
        .from("face-photos")
        .createSignedUrl(photo.storage_path, 3600)
      return { ...photo, url: data?.signedUrl || null }
    })
  )

  return NextResponse.json(photosWithUrls)
}

// DELETE — Delete a photo
export async function DELETE(req: NextRequest) {
  const photoId = req.nextUrl.searchParams.get("id")

  if (!photoId) {
    return NextResponse.json({ error: "id is required" }, { status: 400 })
  }

  const admin = getAdmin()

  // Get photo record to find storage path
  const { data: photo } = await admin
    .from("home_person_photos")
    .select("*")
    .eq("id", photoId)
    .single()

  if (!photo) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 })
  }

  // Delete from storage
  await admin.storage.from("face-photos").remove([photo.storage_path])

  // Delete from database
  const { error } = await admin
    .from("home_person_photos")
    .delete()
    .eq("id", photoId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
