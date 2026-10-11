// GitHub Pages n'a pas de réécriture d'URL : 404.html = index.html permet de recharger /motiv/progres.
import { copyFileSync } from 'node:fs'

copyFileSync('dist/index.html', 'dist/404.html')
