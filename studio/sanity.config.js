import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {schemaTypes} from './schemaTypes'
import {message} from './schemaTypes/message'

const projectId = process.env.SANITY_STUDIO_PROJECT_ID || 'REPLACE_WITH_PROJECT_ID'

/* Two spaces in one editor:
   - House of Poland: articles, in the public "production" dataset the website reads.
   - Inbox: contact form messages, in the private "inbox" dataset. Never public. */
export default defineConfig([
  {
    name: 'house-of-poland',
    title: 'House of Poland',
    basePath: '/articles',
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
  },
  {
    name: 'inbox',
    title: 'Inbox',
    basePath: '/inbox',
    projectId,
    dataset: 'inbox',
    plugins: [
      structureTool({
        structure: (S) =>
          S.list()
            .title('Inbox')
            .items([
              S.listItem().title('New').child(
                S.documentList().title('New').filter('_type == "message" && status == "New"').defaultOrdering([{field: 'receivedAt', direction: 'desc'}]),
              ),
              S.listItem().title('All messages').child(
                S.documentTypeList('message').title('All messages').defaultOrdering([{field: 'receivedAt', direction: 'desc'}]),
              ),
            ]),
      }),
    ],
    schema: {types: [message]},
    document: {newDocumentOptions: () => []}, // messages only come from the website
  },
])
