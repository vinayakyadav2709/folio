// BYOK key encryption via better-auth/crypto (AES-256-GCM; IV + envelope
// handled by the lib — CLAUDE.md rule 7: no hand-rolled crypto).
// Encryption runs in mutations; decryption runs ONLY inside actions.
// Never log the plaintext key.
import { symmetricEncrypt, symmetricDecrypt } from 'better-auth/crypto'

const getSecret = (): string => {
  const secret = process.env.AI_KEY_SECRET
  if (!secret) throw new Error('AI_KEY_SECRET is not set')
  return secret
}

export const encryptKey = (plaintext: string): Promise<string> =>
  symmetricEncrypt({ key: getSecret(), data: plaintext })

export const decryptKey = (encoded: string): Promise<string> =>
  symmetricDecrypt({ key: getSecret(), data: encoded })
