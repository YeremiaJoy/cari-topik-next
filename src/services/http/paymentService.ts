import type { PaymentService, SnapCharge } from '../types'
import { api } from './client'

export function createHttpPaymentService(): PaymentService {
  return {
    createCharge: (plan) =>
      api<SnapCharge>('/api/payment', { method: 'POST', body: JSON.stringify({ plan }) }),
  }
}
