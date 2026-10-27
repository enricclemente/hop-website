import {defineField, defineType} from 'sanity'

/* A message from the website contact form. Created by /api/contact, read in the Inbox. */
export const message = defineType({
  name: 'message',
  title: 'Message',
  type: 'document',
  fields: [
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {list: ['New', 'Replied', 'Archived'], layout: 'radio', direction: 'horizontal'},
      initialValue: 'New',
    }),
    defineField({name: 'name', title: 'Name', type: 'string', readOnly: true}),
    defineField({name: 'email', title: 'Email', type: 'string', readOnly: true}),
    defineField({name: 'company', title: 'Company', type: 'string', readOnly: true}),
    defineField({name: 'phone', title: 'Phone', type: 'string', readOnly: true}),
    defineField({name: 'partner', title: 'Wants to talk to', type: 'string', readOnly: true}),
    defineField({name: 'interests', title: 'Interested in', type: 'array', of: [{type: 'string'}], readOnly: true}),
    defineField({name: 'message', title: 'Message', type: 'text', rows: 8, readOnly: true}),
    defineField({name: 'lang', title: 'Language', type: 'string', readOnly: true}),
    defineField({name: 'receivedAt', title: 'Received', type: 'datetime', readOnly: true}),
    defineField({name: 'notes', title: 'Internal notes', type: 'text', rows: 3}),
  ],
  orderings: [{title: 'Newest first', name: 'receivedDesc', by: [{field: 'receivedAt', direction: 'desc'}]}],
  preview: {
    select: {name: 'name', company: 'company', status: 'status', at: 'receivedAt'},
    prepare: ({name, company, status, at}) => ({
      title: `${status === 'New' ? '● ' : ''}${name || 'Unknown'}${company ? ` · ${company}` : ''}`,
      subtitle: `${status || 'New'} · ${at ? new Date(at).toLocaleString('en-GB', {dateStyle: 'medium', timeStyle: 'short'}) : ''}`,
    }),
  },
})
