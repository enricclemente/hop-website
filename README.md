# HOP. website

Static site on **Vercel**. House of Poland articles come from **Sanity**.

```
public/            the website (HTML, CSS, JS, fonts)
  index.html         master page: hero, intro, who we are, contact, what we do, how we work
  house-of-poland.html   House of Poland landing: latest article, recent ones, link to the archive
  articles.html      All articles: search, topic and author filters, sort, grouped by month
  article.html       article reading page (article.html#slug)
  contact.html       contact page with the form
  assets/articles.js sample articles, used until Sanity is connected
api/contact.js     Vercel function: emails form messages via Resend
studio/            Sanity Studio: where you write and publish articles
scripts/build.mjs  Vercel build: copies public/ to dist/ and pulls articles from Sanity
vercel.json        Vercel settings
```

## Current state: wireframe

- Black and white on purpose. Brand colours are already in the CSS: remove `class="wf"` from `<html>` on each page to switch.
- English copy is from the brief. Contact intro and How we work are lorem ipsum.
- Polish is generated placeholder text. Real Polish goes in `PL_COPY` in `assets/site.js` (site copy) and in the Polish fields in Sanity (articles).
- Two SAMPLE articles exist to test the list. They disappear once Sanity is connected.
- Partner photo and LinkedIn URLs are placeholders.

## 1. Sanity (one time, about 15 minutes)

1. Create a free account at sanity.io and a project. Note the **project ID**. Use dataset `production`, visibility **public**.
2. In `studio/`, copy `.env.example` to `.env` and paste the project ID.
3. Run `npm install`, then `npm run deploy`. The editor goes live at `https://hop-house-of-poland.sanity.studio`.
4. Invite Philip and David under sanity.io/manage → Members.

Writing an article: title without a full stop (the site adds the red dot), one pull quote, numbered points with the first words in bold. Polish fields can wait; the site shows English until they're filled.

## 2. Vercel (one time)

1. Push this folder to a GitHub repo and import it in Vercel. The settings are read from `vercel.json`.
2. Settings → Environment Variables: add `SANITY_PROJECT_ID` (and `SANITY_DATASET=production`). Redeploy.
3. Settings → Git → **Deploy Hooks**: create a hook and copy its URL.
4. In sanity.io/manage → API → **Webhooks**: add that URL, trigger on create/update/delete, filter `_type == "article"`.

Publishing in Sanity now rebuilds the site in about a minute.

5. Settings → Domains: add `hoppartners.com` and `www.hoppartners.com`, then add the DNS records Vercel shows. Keep your existing email (MX) records.

## 3. Contact form email (one time)

1. Create a free account at resend.com and verify the domain `hoppartners.com` (it gives you DNS records to add).
2. In Vercel, add environment variables:
   - `RESEND_API_KEY`: from Resend
   - `CONTACT_TO`: `philip@hoppartners.com,david@hoppartners.com`
   - `CONTACT_FROM`: `HOP. Website <website@hoppartners.com>`
3. Redeploy. Messages arrive with the visitor as Reply-To. If they choose Philip or David, that person is listed first.

Spam protection: a hidden honeypot field, a minimum time on the page, and a rate limit.

## Local preview

`node scripts/build.mjs` then serve `dist/` with any static server.

## Before launch

- [ ] Final Polish copy (site and letter)
- [ ] Contact intro and How we work copy
- [ ] Partner photo: `public/assets/partners.jpg`, then swap the placeholder in `index.html`
- [ ] LinkedIn URLs
- [ ] Privacy notice
- [ ] Remove `class="wf"` for brand colours
- [ ] Polish URLs (`/pl/...`) for search engines, if you want Polish pages indexed separately
