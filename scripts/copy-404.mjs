// GitHub Pages n'a pas de réécriture d'URL : 404.html = index.html permet de recharger /motiv/progres.
// Seul le 404.html racine compte : un rechargement sous /motiv/essai/… y arrive aussi et repart vers l'essai.
import { readFileSync, writeFileSync } from 'node:fs'

const redirect = "<script>if (location.pathname.startsWith('/motiv/essai/')) location.replace('/motiv/essai/')</script>"
writeFileSync('dist/404.html', readFileSync('dist/index.html', 'utf8').replace('<head>', `<head>${redirect}`))
