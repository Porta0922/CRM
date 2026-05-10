'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner' // Asumiendo que usas sonner para notificaciones

interface PaymentButtonProps {
  installmentId: string
  borrowerNombre: string
  borrowerContacto?: string | null
  monto: string
}

export function PaymentButton({ installmentId, borrowerNombre, borrowerContacto, monto }: PaymentButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  async function handlePayment() {
    if (!confirm(`¿Confirmar pago de ${monto} de ${borrowerNombre}?`)) return

    setIsLoading(true)
    const supabase = createClient()

    const { error } = await supabase.rpc('pay_installment', {
      p_installment_id: installmentId,
      p_fecha_pago: new Date().toISOString().split('T')[0]
    })

    if (error) {
      toast.error('Error al registrar pago: ' + error.message)
    } else {
      toast.success('Pago registrado correctamente', {
        action: borrowerContacto ? {
          label: 'WhatsApp',
          onClick: () => {
            const url = getWhatsAppLink(borrowerContacto, WA_MESSAGES.confirmation(borrowerNombre, monto))
            window.open(url, '_blank')
          }
        } : undefined
      })
      router.refresh()
    }
    setIsLoading(false)
  }

  return (
    <Button
      size="sm"
      variant="outline"
      className="h-8 w-8 p-0 border-green-200 hover:bg-green-50 hover:text-green-700 dark:border-green-900/30 dark:hover:bg-green-950/30"
      onClick={handlePayment}
      disabled={isLoading}
      title="Marcar como pagado"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Check className="h-4 w-4" />
      )}
    </Button>
  )
}

import { getWhatsAppLink, WA_MESSAGES } from '@/lib/whatsapp'
