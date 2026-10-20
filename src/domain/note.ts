/** Note libre à enregistrer : sans espaces autour, absente si vide. */
export const noteOf = (s: string) => (s.trim() ? { note: s.trim() } : {})
