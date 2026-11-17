import { safeStorage, app } from 'electron'
import { randomBytes, createCipheriv, createDecipheriv, scryptSync, timingSafeEqual } from 'node:crypto'
import { join } from 'node:path'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import type { InstarVaultArchive, InstarVaultPayload } from '../../shared/types'

export class CryptoManager {
  private masterKey: Buffer | null = null

  private getFallbackKeyPath(): string {
    return join(app.getPath('userData'), '.master_entropy')
  }

  // Obtain or derive the 256-bit Master Encryption Key (MEK)
  public getMasterKey(): Buffer {
    if (this.masterKey) {
      return this.masterKey
    }

    const keyPath = this.getFallbackKeyPath()

    if (safeStorage.isEncryptionAvailable()) {
      try {
        if (existsSync(keyPath)) {
          const encryptedKey = readFileSync(keyPath)
          const decryptedBase64 = safeStorage.decryptString(encryptedKey)
          this.masterKey = Buffer.from(decryptedBase64, 'base64')
          return this.masterKey
        } else {
          const freshKey = randomBytes(32)
          const encryptedBuffer = safeStorage.encryptString(freshKey.toString('base64'))
          writeFileSync(keyPath, encryptedBuffer, { mode: 0o600 })
          this.masterKey = freshKey
          return freshKey
        }
      } catch (err) {
        console.warn('[CryptoManager] safeStorage operation failed, falling back to scrypt-derived key', err)
      }
    }

    // Fallback key derivation for minimal WMs without Secret Service daemon
    if (existsSync(keyPath)) {
      const rawEntropy = readFileSync(keyPath)
      this.masterKey = scryptSync(rawEntropy, 'instar_salt_fallback', 32, { N: 16384, r: 8, p: 1 })
    } else {
      const freshEntropy = randomBytes(64)
      writeFileSync(keyPath, freshEntropy, { mode: 0o600 })
      this.masterKey = scryptSync(freshEntropy, 'instar_salt_fallback', 32, { N: 16384, r: 8, p: 1 })
    }

    return this.masterKey
  }

  // AES-256-GCM field encryption: returns base64 "iv.authTag.ciphertext"
  public encryptField(plaintext: string): string {
    const key = this.getMasterKey()
    const iv = randomBytes(12) // 96-bit IV
    const cipher = createCipheriv('aes-256-gcm', key, iv)

    const ciphertext = Buffer.concat([
      cipher.update(Buffer.from(plaintext, 'utf-8')),
      cipher.final()
    ])
    const authTag = cipher.getAuthTag() // 128-bit tag

    return `${iv.toString('base64')}.${authTag.toString('base64')}.${ciphertext.toString('base64')}`
  }

  // AES-256-GCM field decryption
  public decryptField(encryptedPayload: string): string {
    const parts = encryptedPayload.split('.')
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted payload structure')
    }

    const [ivB64, tagB64, cipherB64] = parts
    const iv = Buffer.from(ivB64, 'base64')
    const authTag = Buffer.from(tagB64, 'base64')
    const ciphertext = Buffer.from(cipherB64, 'base64')

    const key = this.getMasterKey()
    const decipher = createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(authTag)

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final()
    ])

    return decrypted.toString('utf-8')
  }

  // Scrypt-based PIN / Passphrase hashing
  public hashPin(pin: string): string {
    const salt = randomBytes(16).toString('hex')
    const derivedKey = scryptSync(pin, salt, 32, { N: 16384, r: 8, p: 1 })
    return `${salt}:${derivedKey.toString('hex')}`
  }

  // Constant-time PIN verification
  public verifyPin(pin: string, storedHash: string): boolean {
    const [salt, keyHex] = storedHash.split(':')
    if (!salt || !keyHex) return false

    const expectedBuffer = Buffer.from(keyHex, 'hex')
    const actualBuffer = scryptSync(pin, salt, 32, { N: 16384, r: 8, p: 1 })

    if (expectedBuffer.length !== actualBuffer.length) return false
    return timingSafeEqual(expectedBuffer, actualBuffer)
  }

  // Export encrypted .instar-vault archive
  public exportEncryptedVault(payload: InstarVaultPayload, passphrase: string): string {
    const salt = randomBytes(16)
    const derivedVaultKey = scryptSync(passphrase, salt, 32, { N: 32768, r: 8, p: 1 })
    const iv = randomBytes(12)

    const cipher = createCipheriv('aes-256-gcm', derivedVaultKey, iv)
    const jsonString = JSON.stringify(payload)

    const ciphertext = Buffer.concat([
      cipher.update(Buffer.from(jsonString, 'utf-8')),
      cipher.final()
    ])
    const authTag = cipher.getAuthTag()

    const archive: InstarVaultArchive = {
      signature: 'INSTAR_VAULT_V1',
      salt: salt.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      ciphertext: ciphertext.toString('base64')
    }

    return JSON.stringify(archive, null, 2)
  }

  // Import and verify encrypted .instar-vault archive
  public importEncryptedVault(archiveJson: string, passphrase: string): InstarVaultPayload {
    const archive = JSON.parse(archiveJson) as InstarVaultArchive
    if (archive.signature !== 'INSTAR_VAULT_V1') {
      throw new Error('Unsupported vault signature. File is corrupted or from an incompatible version.')
    }

    const salt = Buffer.from(archive.salt, 'base64')
    const iv = Buffer.from(archive.iv, 'base64')
    const authTag = Buffer.from(archive.authTag, 'base64')
    const ciphertext = Buffer.from(archive.ciphertext, 'base64')

    const derivedVaultKey = scryptSync(passphrase, salt, 32, { N: 32768, r: 8, p: 1 })
    const decipher = createDecipheriv('aes-256-gcm', derivedVaultKey, iv)
    decipher.setAuthTag(authTag)

    const decryptedBuffer = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final()
    ])

    return JSON.parse(decryptedBuffer.toString('utf-8')) as InstarVaultPayload
  }
}

export const cryptoManager = new CryptoManager()
