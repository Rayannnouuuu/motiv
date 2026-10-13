/** Une session supabase est enregistrée sur cet appareil (clé « sb-<projet>-auth-token »). */
export function hasStoredSession(): boolean {
  try {
    for (let i = 0; i < localStorage.length; i++) if (/^sb-.+-auth-token$/.test(localStorage.key(i) ?? '')) return true
  } catch {
    // stockage indisponible
  }
  return false
}
