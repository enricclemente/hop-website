import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID || 'REPLACE_WITH_PROJECT_ID',
    dataset: process.env.SANITY_STUDIO_DATASET || 'production',
  },
  /* The editor lives at hoppartners.pl/studio, so its files are served from /studio/static */
  project: {basePath: '/studio'},
  studioHost: 'hop-house-of-poland',
})
