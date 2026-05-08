// supabase/functions/overdue-reminder/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  )

  // 1. Obtener cuotas que vencen hoy o están vencidas y no pagadas
  const { data: overdue, error } = await supabase
    .from("weekly_due")
    .select("*")
    .lte("dias_restantes", 0)

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  if (!overdue || overdue.length === 0) return new Response("No overdue items")

  // 2. Agrupar por prestamista (created_by)
  const grouped = overdue.reduce((acc: any, item: any) => {
    if (!acc[item.created_by]) acc[item.created_by] = []
    acc[item.created_by].push(item)
    return acc
  }, {})

  // 3. Enviar correos (Simplificado: asumiendo que tenemos el email del perfil)
  for (const userId in grouped) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, nombre")
      .eq("id", userId)
      .single()

    if (profile?.email) {
      const items = grouped[userId].map((i: any) => 
        `- ${i.borrower_nombre}: ${i.monto_cuota} (Venció: ${i.fecha_vencimiento})`
      ).join("\n")

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "LMS <onboarding@resend.dev>",
          to: profile.email,
          subject: "⚠️ Recordatorio de Cobros Vencidos",
          text: `Hola ${profile.nombre},\n\nTienes los siguientes cobros pendientes para hoy:\n\n${items}\n\nRevisa tu dashboard para más detalles.`,
        }),
      })
    }
  }

  return new Response(JSON.stringify({ sent: Object.keys(grouped).length }), { status: 200 })
})
