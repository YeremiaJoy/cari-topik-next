import type { PaymentService, SnapCharge, TransactionStatus } from '../types'
import { api } from './client'

export function createHttpPaymentService(): PaymentService {
  return {
    createCharge: (plan) =>
      api<SnapCharge>('/api/payment', { method: 'POST', body: JSON.stringify({ plan }) }),
    getStatus: (referenceId) =>
      api<{ status: TransactionStatus }>(`/api/payment/status?ref=${encodeURIComponent(referenceId)}`),
  }
}
