export class HttpError extends Error {
  statusCode: number
  code: string
  resetAt?: string
  constructor(statusCode: number, code: string, message: string, resetAt?: string) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.resetAt = resetAt
  }
}
