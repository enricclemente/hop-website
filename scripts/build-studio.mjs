/* The House of Poland editor (Sanity Studio), served by the website at /studio.
   Runs after scripts/build.mjs on Vercel. Needs SANITY_PROJECT_ID and the studio's
   packages (installed by vercel.json's installCommand when that variable is set). */

import {execFileSync} from 'node:child_process'
import {existsSync, mkdirSync, writeFileSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const studio = join(root, 'studio')
const out = join(root, 'dist', 'studio')
const projectId = process.env.SANITY_PROJECT_ID

if (!projectId || !existsSync(join(studio, 'node_modules', '.bin', 'sanity'))) {
  mkdirSync(out, {recursive: true})
  writeFileSync(join(out, 'index.html'), '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Editor · HOP.</title><link rel="stylesheet" href="/assets/site.css"></head><body style="padding:48px;font-family:sans-serif"><p>The article editor is not connected yet.</p></body></html>\n')
  console.log('Studio: SANITY_PROJECT_ID not set (or packages missing), placeholder written')
} else {
  execFileSync(join(studio, 'node_modules', '.bin', 'sanity'), ['build', out, '--yes'], {
    cwd: studio,
    stdio: 'inherit',
    env: {...process.env, SANITY_STUDIO_PROJECT_ID: projectId, SANITY_STUDIO_DATASET: process.env.SANITY_DATASET || 'production'},
  })
  console.log('Studio: built to dist/studio')
}
