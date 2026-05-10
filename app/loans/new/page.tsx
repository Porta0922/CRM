// app/loans/new/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LoanForm from '@/components/LoanForm'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function NewLoanPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Obtener deudores para el selector
  const { data: borrowers } = await supabase
    .from('borrowers')
    .select('id, nombre, contacto')
    .eq('created_by', user.id)

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Nuevo Préstamo</h1>
      </div>

      <LoanForm borrowers={borrowers || []} userId={user.id} />
    </div>
  )
}
