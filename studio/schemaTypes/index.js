import {defineArrayMember, defineField, defineType} from 'sanity'

/* A string in both languages. English is required; Polish can follow later. */
const localeString = defineType({
  name: 'localeString',
  title: 'Text (EN / PL)',
  type: 'object',
  fields: [
    defineField({name: 'en', title: 'English', type: 'string', validation: (r) => r.required()}),
    defineField({name: 'pl', title: 'Polski', type: 'string'}),
  ],
})

const localeText = defineType({
  name: 'localeText',
  title: 'Longer text (EN / PL)',
  type: 'object',
  fields: [
    defineField({name: 'en', title: 'English', type: 'text', rows: 3, validation: (r) => r.required()}),
    defineField({name: 'pl', title: 'Polski', type: 'text', rows: 3}),
  ],
})

/* One pull quote per article, set as a statement */
const pullQuote = defineType({
  name: 'pullQuote',
  title: 'Pull quote',
  type: 'object',
  fields: [defineField({name: 'text', title: 'Quote', type: 'string', validation: (r) => r.required()})],
  preview: {select: {title: 'text'}, prepare: ({title}) => ({title: `“${title}”`, subtitle: 'Pull quote'})},
})

/* The article body: paragraphs, headings, a lede, a closing line, numbered points and one pull quote */
const articleBlocks = defineType({
  name: 'articleBlocks',
  title: 'Body',
  type: 'array',
  of: [
    defineArrayMember({
      type: 'block',
      styles: [
        {title: 'Paragraph', value: 'normal'},
        {title: 'Opening line (lede)', value: 'lede'},
        {title: 'Heading', value: 'h2'},
        {title: 'Closing line', value: 'closer'},
      ],
      lists: [{title: 'Numbered points', value: 'number'}],
      marks: {
        decorators: [
          {title: 'Bold', value: 'strong'},
          {title: 'Italic', value: 'em'},
        ],
        annotations: [],
      },
    }),
    defineArrayMember({type: 'pullQuote'}),
  ],
  validation: (r) =>
    r.custom((blocks) => {
      const quotes = (blocks || []).filter((b) => b._type === 'pullQuote').length
      return quotes > 1 ? 'Use one pull quote per article.' : true
    }),
})

const articleBody = defineType({
  name: 'articleBody',
  title: 'Body (EN / PL)',
  type: 'object',
  fields: [
    defineField({name: 'en', title: 'English', type: 'articleBlocks', validation: (r) => r.required()}),
    defineField({
      name: 'pl',
      title: 'Polski',
      type: 'articleBlocks',
      description: 'Leave empty until the Polish version is ready. The site will show the English meanwhile.',
    }),
  ],
})

const article = defineType({
  name: 'article',
  title: 'Article',
  type: 'document',
  fields: [
    defineField({name: 'title', title: 'Title', type: 'localeString', description: 'No full stop: the site adds the red dot.'}),
    defineField({
      name: 'slug',
      title: 'Web address',
      type: 'slug',
      options: {source: 'title.en', maxLength: 80},
      validation: (r) => r.required(),
    }),
    defineField({name: 'subtitle', title: 'Subtitle', type: 'localeString'}),
    defineField({name: 'summary', title: 'Summary (shown in the list)', type: 'localeText'}),
    defineField({
      name: 'publishedAt',
      title: 'Publish date',
      type: 'date',
      initialValue: () => new Date().toISOString().slice(0, 10),
      validation: (r) => r.required(),
    }),
    defineField({name: 'number', title: 'Article number', type: 'number', validation: (r) => r.required().integer().positive()}),
    defineField({name: 'authors', title: 'Signed by', type: 'string', initialValue: 'Philip Jacobson and David Anson'}),
    defineField({
      name: 'topics',
      title: 'Topics',
      type: 'array',
      of: [{type: 'string'}],
      options: {
        layout: 'tags',
        list: ['Brand', 'Culture', 'Markets', 'Research', 'Technology'],
      },
      description: 'Used for the filters on All articles. Pick one or two.',
      validation: (r) => r.max(3),
    }),
    defineField({
      name: 'featured',
      title: 'Show as the letter on the home page',
      type: 'boolean',
      initialValue: false,
      description: 'Only one article should have this on.',
    }),
    defineField({name: 'body', title: 'Body', type: 'articleBody'}),
  ],
  orderings: [{title: 'Newest first', name: 'dateDesc', by: [{field: 'publishedAt', direction: 'desc'}]}],
  preview: {
    select: {title: 'title.en', date: 'publishedAt', number: 'number', pl: 'title.pl'},
    prepare: ({title, date, number, pl}) => ({
      title: title || 'Untitled',
      subtitle: `No. ${number ?? '?'} · ${date ?? 'no date'}${pl ? '' : ' · Polish missing'}`,
    }),
  },
})

export const schemaTypes = [localeString, localeText, pullQuote, articleBlocks, articleBody, article]
