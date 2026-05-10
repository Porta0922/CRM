import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft, UserPlus, Phone, User } from 'lucide-react'

import type { Database } from '@/lib/supabase/types'

export default async function BorrowersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: borrowers } = await supabase
    .from('borrowers')
    .select('*')
    .eq('created_by', user.id)
    .order('nombre', { ascending: true })

  type Borrower = Database['public']['Tables']['borrowers']['Row']

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Mis Deudores</h1>
        </div>
        {/* Placeholder for adding a borrower if needed, aunque usualmente se agregan con los préstamos */}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {!borrowers || borrowers.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center text-muted-foreground">
              No tienes deudores registrados.
            </CardContent>
          </Card>
        ) : (
          (borrowers as Borrower[]).map((borrower) => (
            <Card key={borrower.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                    <User className="text-blue-600 w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold">{borrower.nombre}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="w-3 h-3" />
                      {borrower.contacto || 'Sin contacto'}
                    </div>
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/borrowers/${borrower.id}`}>Ver Perfil</Link>
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
