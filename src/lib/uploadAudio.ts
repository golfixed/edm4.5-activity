import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage, isFirebaseConfigured } from './firebase'

/**
 * Upload an audio File to Firebase Storage under /audio/<gameId>/<slot>.
 * Returns the public download URL.
 * Falls back to base64 data URL if Firebase Storage is not configured.
 */
export async function uploadAudio(
  file: File,
  gameId: string,
  slot: 'soundStart' | 'soundTick' | 'soundTimeUp'
): Promise<string> {
  if (!isFirebaseConfigured || !storage) {
    // Fallback: base64
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const path = `audio/${gameId}/${slot}`
  const fileRef = storageRef(storage, path)
  await uploadBytes(fileRef, file)
  return getDownloadURL(fileRef)
}

/** Delete an audio file from Firebase Storage (best-effort). */
export async function deleteAudio(
  gameId: string,
  slot: 'soundStart' | 'soundTick' | 'soundTimeUp'
): Promise<void> {
  if (!isFirebaseConfigured || !storage) return
  try {
    await deleteObject(storageRef(storage, `audio/${gameId}/${slot}`))
  } catch {
    // File may not exist — ignore
  }
}
