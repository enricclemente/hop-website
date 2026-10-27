import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {schemaTypes} from './schemaTypes'

export default defineConfig({
  name: 'house-of-poland',
  title: 'HOP. House of Poland',
  projectId: process.env.SANITY_STUDIO_PROJECT_ID || 'REPLACE_WITH_PROJECT_ID',
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
})
