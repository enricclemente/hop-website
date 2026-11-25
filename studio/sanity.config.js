import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {schemaTypes} from './schemaTypes'

/* The House of Poland editor, served by the website at hoppartners.pl/studio.
   Publishing an article rebuilds the site (Sanity webhook → Vercel deploy hook). */
const projectId = process.env.SANITY_STUDIO_PROJECT_ID || 'REPLACE_WITH_PROJECT_ID'

export default defineConfig({
  name: 'house-of-poland',
  title: 'HOP. House of Poland',
  basePath: '/studio',
  projectId,
  dataset: process.env.SANITY_STUDIO_DATASET || 'production',
  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('House of Poland')
          .items([
            S.listItem()
              .title('Articles')
              .child(S.documentTypeList('article').title('Articles').defaultOrdering([{field: 'publishedAt', direction: 'desc'}])),
          ]),
    }),
  ],
  schema: {types: schemaTypes},
  document: {
    /* Only articles can be created here */
    newDocumentOptions: (prev) => prev.filter((t) => t.templateId === 'article'),
  },
})
