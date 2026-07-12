import { NextResponse } from 'next/server'
import { requireUser } from '@/server/auth'
import { withErrors } from '@/server/handler'
import { jsonError } from '@/server/errors'
import { getTransactionStatus } from '@/server/db/operations'

/** Polling status transaksi dari client — sumber kebenaran selain webhook. */
export async function GET(request: Request) {
  return withErrors(async () => {
    const { user } = await requireUser()
    const referenceId = new URL(request.url).searchParams.get('ref')
    if (!referenceId) {
      return jsonError(400, 'validation_error', 'Parameter ref wajib diisi.')
    }

    const txn = await getTransactionStatus(user.id, referenceId)
    if (!txn) {
      return jsonError(404, 'transaction_not_found', 'Transaksi tidak ditemukan.')
    }

    return NextResponse.json({ status: txn.status })
  })
}
