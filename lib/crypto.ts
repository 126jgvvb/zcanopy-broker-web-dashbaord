const ENCRYPTION_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || 'sBXZBcqwKPmzNv+ifnUFdgVkh01jgTqDgGALrBgMIRLmQbcwJtc6Vb4W+axZRe+w';

if (process.env.NEXT_PUBLIC_ENCRYPTION_KEY) {
  console.log('[crypto] Using NEXT_PUBLIC_ENCRYPTION_KEY from environment');
} else {
  console.log('[crypto] NEXT_PUBLIC_ENCRYPTION_KEY not set, using fallback key');
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function arrayBufferToString(buf: ArrayBuffer): string {
  return new TextDecoder().decode(buf);
}

let cryptoKey: CryptoKey | null = null;

async function getCryptoKey(): Promise<CryptoKey | null> {
  if (!ENCRYPTION_KEY) return null;
  if (cryptoKey) return cryptoKey;
  let keyBytes: Uint8Array;
  if (/^[0-9a-fA-F]{64}$/.test(ENCRYPTION_KEY)) {
    keyBytes = hexToBytes(ENCRYPTION_KEY);
  } else {
    keyBytes = base64ToBytes(ENCRYPTION_KEY);
  }
  if (keyBytes.length !== 32) {
    keyBytes = keyBytes.slice(0, 32);
  }
  cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes as unknown as BufferSource,
    { name: 'AES-GCM' },
    false,
    ['decrypt'],
  );
  return cryptoKey;
}

export async function decryptResponse(data: any): Promise<any> {
  if (!data || !data.encrypted || !data.payload) {
    return data;
  }

  const key = await getCryptoKey();
  if (!key) {
    console.error('[decryptResponse] No crypto key available');
    return data;
  }

  try {
    const buffer = base64ToBytes(data.payload);
    const iv = buffer.slice(0, 12);
    const authTag = buffer.slice(12, 28);
    const ciphertext = buffer.slice(28);

    const combined = new Uint8Array(ciphertext.length + authTag.length);
    combined.set(ciphertext, 0);
    combined.set(authTag, ciphertext.length);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      combined,
    );
    const text = arrayBufferToString(decrypted);
    console.log('[decryptResponse] Decrypted payload', text);
    return JSON.parse(text);
  } catch (error) {
    console.error('[decryptResponse] Decryption failed', error);
    return data;
  }
}
