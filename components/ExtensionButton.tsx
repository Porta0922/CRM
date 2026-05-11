'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { CalendarPlus, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ExtensionButtonProps {
  installmentId: string
  onSuccess?: () => void
}

export function ExtensionButton({ installmentId, onSuccess }: ExtensionButtonProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  async function handleExtend() {
    if (!confirm('¿Deseas extender la fecha de vencimiento 10 días?')) return

    startTransition(async () => {
      const supabase = createClient()
      const { error } = await supabase.rpc('extend_installment_due_date', {
        p_installment_id: installmentId,
        p_days: 10
      })

      if (error) {
        alert('Error al extender fecha: ' + error.message)
      } else {
        router.refresh()
        if (onSuccess) onSuccess()
      }
    })
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="text-indigo-600 border-indigo-200 bg-indigo-50 hover:bg-indigo-100 h-8 gap-1"
      onClick={handleExtend}
      disabled={isPending}
    >
      {isPending ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <CalendarPlus className="w-3.5 h-3.5" />
      )}
      <span className="text-[11px] font-bold">+10 días</span>
    </Button>
  )
}
