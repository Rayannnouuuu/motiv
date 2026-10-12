// Regroupe supabase/functions/notify/index.ts (et la logique de src/ qu'il importe) en un seul fichier pour Deno.
import { build } from 'rolldown'

// Le serveur n'a besoin que de l'identité des exos : on retire tablatures et descriptions pour alléger.
const slimExercises = {
  name: 'slim-exercises',
  transform(code, id) {
    if (!/content[\\/]exercises[\\/].+\.json$/.test(id)) return null
    const list = JSON.parse(code).map(({ id, title, category, difficulty, targetBpm }) => ({ id, title, category, difficulty, targetBpm, description: '', pattern: [] }))
    return { code: JSON.stringify(list), moduleType: 'json' }
  },
}

await build({
  input: 'supabase/functions/notify/index.ts',
  external: [/^npm:/, /^jsr:/],
  platform: 'neutral',
  plugins: [slimExercises],
  output: { file: 'supabase/functions/notify/dist/index.js', format: 'esm', minify: true },
})
console.log('notify: supabase/functions/notify/dist/index.js')
