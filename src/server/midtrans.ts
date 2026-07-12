import midtransClient from 'midtrans-client'

export type TransactionStatus =
  | 'pending'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'expired'
  | 'refunded'

function getMidtransConfig() {
  const serverKey = process.env.MIDTRANS_SERVER_KEY
  const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY
  if (!serverKey || !clientKey) {
    throw new Error('MIDTRANS_SERVER_KEY / NEXT_PUBLIC_MIDTRANS_CLIENT_KEY belum diset.')
  }
  return {
    isProduction: process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === 'true',
    serverKey,
    clientKey,
  }
}

/** Snap charge kadaluarsa setelah sekian jam kalau belum dibayar. */
export const SNAP_EXPIRY_HOURS = 24

export interface SnapChargeParams {
  orderId: string
  grossAmount: number
  customer: { first_name: string; email: string }
}

export async function createSnapTransaction({ orderId, grossAmount, customer }: SnapChargeParams) {
  const snap = new midtransClient.Snap(getMidtransConfig())
  return snap.createTransaction({
    transaction_details: { order_id: orderId, gross_amount: grossAmount },
    customer_details: customer,
    expiry: { unit: 'hours', duration: SNAP_EXPIRY_HOURS },
  })
}

/**
 * Re-fetch status server-side by transaction_id lewat CoreApi, bukan cuma
 * cek signature_key di body — lebih tahan terhadap payload webhook palsu.
 */
export async function fetchNotificationStatus(body: unknown) {
  const coreApi = new midtransClient.CoreApi(getMidtransConfig())
  return coreApi.transaction.notification(body) as Promise<{
    order_id: string
    transaction_id: string
    transaction_status: string
    fraud_status?: string
    payment_type?: string
    settlement_time?: string
    expiry_time?: string
  }>
}

export function mapMidtransStatus(transactionStatus: string, fraudStatus?: string): TransactionStatus {
  switch (transactionStatus) {
    case 'settlement':
      return 'completed'
    case 'capture':
      return fraudStatus === 'challenge' ? 'pending' : 'completed'
    case 'deny':
    case 'failure':
      return 'failed'
    case 'cancel':
      return 'cancelled'
    case 'expire':
      return 'expired'
    case 'refund':
    case 'partial_refund':
      return 'refunded'
    default:
      return 'pending'
  }
}
