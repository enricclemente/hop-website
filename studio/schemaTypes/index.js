import {defineArrayMember, defineField, defineType} from 'sanity'

/* House of Poland articles. Written for editors, not developers: every box says what it does
   and where it shows on the website. English is required; Polish is optional and the site
   shows the English until the Polish is filled in. */

const localeString = defineType({
  name: 'localeString',
  title: 'Text (EN / PL)',
  type: 'object',
  options: {columns: 1},
  fields: [
    defineField({name: 'en', title: 'English', type: 'string'}),
    defineField({name: 'pl', title: 'Polski (optional)', type: 'string'}),
  ],
})

const localeText = defineType({
  name: 'localeText',
  title: 'Text (EN / PL)',
  type: 'object',
  fields: [
    defineField({name: 'en', title: 'English', type: 'text', rows: 3}),
    defineField({name: 'pl', title: 'Polski (optional)', type: 'text', rows: 3}),
  ],
})

/* A picture inside the text */
const bodyImage = defineArrayMember({
  type: 'image',
  title: 'Picture',
  options: {hotspot: true},
  fields: [
    defineField({name: 'alt', title: 'Describe the picture (for blind readers and Google)', type: 'string', validation: (r) => r.required()}),
    defineField({name: 'caption', title: 'Caption (optional)', type: 'string'}),
  ],
})

/* The article text: paragraphs, an intro paragraph, headings, pull quotes, lists, bold, italic and links */
const articleText = defineType({
  name: 'articleText',
  title: 'Text',
  type: 'array',
  of: [
    defineArrayMember({
      type: 'block',
      styles: [
        {title: 'Paragraph', value: 'normal'},
        {title: 'Intro paragraph (larger)', value: 'lede'},
        {title: 'Heading', value: 'h2'},
        {title: 'Pull quote (big statement)', value: 'blockquote'},
      ],
      lists: [
        {title: 'Bullet list', value: 'bullet'},
        {title: 'Numbered list', value: 'number'},
      ],
      marks: {
        decorators: [
          {title: 'Bold', value: 'strong'},
          {title: 'Italic', value: 'em'},
        ],
        annotations: [
          {
            name: 'link',
            type: 'object',
            title: 'Link',
            fields: [defineField({name: 'href', title: 'Web address (https://…)', type: 'url', validation: (r) => r.uri({allowRelative: true, scheme: ['http', 'https', 'mailto']})})],
          },
        ],
      },
    }),
    bodyImage,
  ],
})

const PARTNERS = [
  {title: 'Philip Jacobson', value: 'philip'},
  {title: 'David Anson', value: 'david'},
]

const article = defineType({
  name: 'article',
  title: 'Article',
  type: 'document',
  groups: [
    {name: 'en', title: 'English', default: true},
    {name: 'pl', title: 'Polski'},
    {name: 'settings', title: 'Settings'},
  ],
  fields: [
    /* ---- English ---- */
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'en',
      description: 'Short and strong, e.g. “Say hop.” End with a full stop: the site turns it into the red dot.',
      validation: (r) => r.required().max(90),
    }),
    defineField({
      name: 'italic',
      title: 'Word in italics (optional)',
      type: 'string',
      group: 'en',
      description: 'One word from the title to set in italics, like “hop” in “Say hop.” Leave empty for none.',
      validation: (r) => r.custom((w, ctx) => (!w || (ctx.document?.title || '').includes(w) ? true : 'This word must appear in the title exactly as typed.')),
    }),
    defineField({
      name: 'summary',
      title: 'Summary',
      type: 'text',
      rows: 3,
      group: 'en',
      description: 'One or two sentences. Shown under the title, on the articles page and in Google.',
      validation: (r) => r.required().max(220),
    }),
    defineField({name: 'body', title: 'Text', type: 'articleText', group: 'en', validation: (r) => r.required()}),
    defineField({
      name: 'closing',
      title: 'Closing line (optional)',
      type: 'string',
      group: 'en',
      description: 'A short last line shown big at the end, e.g. “Brand is a sport. Play to win.” Leave empty to skip.',
    }),

    /* ---- Polish ---- */
    defineField({name: 'titlePl', title: 'Tytuł', type: 'string', group: 'pl', description: 'Leave the Polish empty until it is ready: the site shows the English meanwhile.'}),
    defineField({name: 'italicPl', title: 'Słowo kursywą (opcjonalnie)', type: 'string', group: 'pl'}),
    defineField({name: 'summaryPl', title: 'Streszczenie', type: 'text', rows: 3, group: 'pl'}),
    defineField({name: 'bodyPl', title: 'Tekst', type: 'articleText', group: 'pl'}),
    defineField({name: 'closingPl', title: 'Zdanie końcowe (opcjonalnie)', type: 'string', group: 'pl'}),

    /* ---- Settings ---- */
    defineField({
      name: 'image',
      title: 'Main picture',
      type: 'image',
      group: ['en', 'settings'],
      options: {hotspot: true},
      description: 'Landscape works best (at least 1600 px wide). Click the crop icon to choose the part that must always show.',
      fields: [
        defineField({name: 'alt', title: 'Describe the picture (for blind readers and Google)', type: 'string', validation: (r) => r.required()}),
        defineField({name: 'altPl', title: 'Opis zdjęcia (opcjonalnie)', type: 'string'}),
      ],
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'label',
      title: 'Label',
      type: 'string',
      group: 'settings',
      description: 'The small word above the title on the articles page.',
      options: {list: ['Article', 'Letter', 'Opinion', 'Research', 'News', 'About']},
      initialValue: 'Article',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'authors',
      title: 'Written by',
      type: 'array',
      group: 'settings',
      of: [{type: 'string'}],
      options: {list: PARTNERS, layout: 'grid'},
      initialValue: ['philip', 'david'],
      validation: (r) => r.required().min(1),
    }),
    defineField({
      name: 'slug',
      title: 'Web address',
      type: 'slug',
      group: 'settings',
      description: 'Click “Generate”. The article will live at hoppartners.pl/articles/<this>.',
      options: {source: 'title', maxLength: 70},
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'publishedAt',
      title: 'Date',
      type: 'date',
      group: 'settings',
      description: 'Shown on the article. Newest articles come first.',
      initialValue: () => new Date().toISOString().slice(0, 10),
      validation: (r) => r.required(),
    }),
  ],
  orderings: [{title: 'Newest first', name: 'dateDesc', by: [{field: 'publishedAt', direction: 'desc'}]}],
  preview: {
    select: {title: 'title', date: 'publishedAt', media: 'image', pl: 'titlePl'},
    prepare: ({title, date, media, pl}) => ({
      title: title || 'Untitled',
      subtitle: `${date || 'no date'}${pl ? ' · EN + PL' : ' · English only'}`,
      media,
    }),
  },
})

export const schemaTypes = [localeString, localeText, articleText, article]
