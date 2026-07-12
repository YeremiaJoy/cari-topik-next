declare module 'midtrans-client' {
  export interface MidtransClientOptions {
    isProduction: boolean
    serverKey: string
    clientKey: string
  }

  export interface SnapCreateTransactionResult {
    token: string
    redirect_url: string
  }

  export class Snap {
    constructor(options: MidtransClientOptions)
    createTransaction(parameter: Record<string, unknown>): Promise<SnapCreateTransactionResult>
  }

  export class CoreApi {
    constructor(options: MidtransClientOptions)
    transaction: {
      notification(body: unknown): Promise<Record<string, unknown>>
    }
  }

  const Midtrans: { Snap: typeof Snap; CoreApi: typeof CoreApi }
  export default Midtrans
}
