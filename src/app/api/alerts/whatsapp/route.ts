import { NextRequest, NextResponse } from "next/server"

// POST — Send WhatsApp alert via Twilio
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { to, message, media_url } = body

    if (!to || !message) {
      return NextResponse.json(
        { error: "to and message are required" },
        { status: 400 }
      )
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const from = process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+14155238886"

    if (!accountSid || !authToken) {
      return NextResponse.json(
        { error: "Twilio credentials not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN." },
        { status: 503 }
      )
    }

    // Format phone number for WhatsApp
    const toWhatsApp = to.startsWith("whatsapp:") ? to : `whatsapp:+${to.replace(/\D/g, "")}`

    // Build form data for Twilio API
    const params = new URLSearchParams()
    params.append("From", from)
    params.append("To", toWhatsApp)
    params.append("Body", message)
    if (media_url) {
      params.append("MediaUrl", media_url)
    }

    // Call Twilio REST API directly (no SDK needed)
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
    const authHeader = Buffer.from(`${accountSid}:${authToken}`).toString("base64")

    const res = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${authHeader}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    })

    const result = await res.json()

    if (!res.ok) {
      console.error("Twilio error:", result)
      return NextResponse.json(
        { error: result.message || "Twilio API error", code: result.code },
        { status: res.status }
      )
    }

    return NextResponse.json({
      success: true,
      sid: result.sid,
      status: result.status,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("WhatsApp alert error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
