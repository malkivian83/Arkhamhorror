import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { argon2id, hash, verify } from 'argon2'

export const token = () => randomBytes(32).toString('base64url')
export const digest = (value: string) => createHash('sha256').update(value).digest('hex')
export const csrfFor = (value: string) => digest(`csrf:${value}`)
export const equal = (a: string, b: string) => {
  const left = Buffer.from(a),
    right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}
export const hashPassword = (password: string) =>
  hash(password, { type: argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 })
export const verifyPassword = (encoded: string, password: string) => verify(encoded, password)
export class ApiError extends Error {
  constructor(
    readonly code: string,
    readonly statusCode = 400,
  ) {
    super(code)
  }
}
export function requireValue(
  condition: unknown,
  code = 'invalid',
  status = 400,
): asserts condition {
  if (!condition) throw new ApiError(code, status)
}
