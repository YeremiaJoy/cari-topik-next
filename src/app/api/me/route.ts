import { NextResponse } from 'next/server'
import { requireUser } from '@/server/auth'
import { withErrors } from '@/server/handler'

export async function GET() {
  return withErrors(async () => {
    const { user } = await requireUser()
    return NextResponse.json(user)
  })
}

export async function DELETE() {
  return withErrors(async () => {
    const { supabase } = await requireUser()
    const { error } = await supabase.rpc('delete_account')
    if (error) throw error
    await supabase.auth.signOut()
    return new NextResponse(null, { status: 204 })
  })
}
