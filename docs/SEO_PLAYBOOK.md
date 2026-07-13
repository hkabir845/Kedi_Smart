# SEO Playbook - Kedi Smart Platform

## URL Structure

### Clean URLs with Slugs

All content entities use slug-based URLs:

- Knowledge Hub: `/pets/[category]/[topicSlug]`
- Blog: `/blog/[slug]`
- Products: `/product/[slug]`
- Marketplace: `/marketplace/[listingId]` (or slug if added)

### Canonical URLs

- Always set canonical URL to avoid duplicate content
- Use `SEOSetting` model for entity-specific overrides
- Default: Current page URL

## Meta Tags

### Required Meta Tags

Every page should include:

```html
<title>{meta_title || default_title}</title>
<meta name="description" content="{meta_description || default_description}" />
<link rel="canonical" href="{canonical_url || current_url}" />
```

### OpenGraph Tags

```html
<meta property="og:title" content="{meta_title}" />
<meta property="og:description" content="{meta_description}" />
<meta property="og:image" content="{og_image_url || default_image}" />
<meta property="og:url" content="{canonical_url}" />
<meta property="og:type" content="article|product|website" />
```

### Twitter Cards

```html
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="{meta_title}" />
<meta name="twitter:description" content="{meta_description}" />
<meta name="twitter:image" content="{og_image_url}" />
```

## JSON-LD Schema Markup

### BlogPosting (Blog Posts)

```json
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "{title}",
  "description": "{excerpt}",
  "image": "{cover_image_url}",
  "author": {
    "@type": "Person",
    "name": "{author_name}"
  },
  "datePublished": "{published_at}",
  "dateModified": "{updated_at}"
}
```

### Product (E-commerce)

```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "{title}",
  "description": "{description}",
  "image": "{images}",
  "brand": {
    "@type": "Brand",
    "name": "{brand}"
  },
  "offers": {
    "@type": "Offer",
    "price": "{price}",
    "priceCurrency": "{currency}",
    "availability": "https://schema.org/InStock"
  }
}
```

### FAQPage (Content Topics)

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "{faq.question}",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "{faq.answer}"
      }
    }
  ]
}
```

### Article (Vet-Verified Content)

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "{title}",
  "description": "{excerpt}",
  "image": "{cover_image_url}",
  "author": {
    "@type": "Organization",
    "name": "Kedi Smart"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Kedi Smart",
    "logo": {
      "@type": "ImageObject",
      "url": "{logo_url}"
    }
  },
  "datePublished": "{published_at}",
  "dateModified": "{updated_at}"
}
```

### MedicalWebPage (Disease/Treatment Guides)

For vet-verified disease/treatment content:

```json
{
  "@context": "https://schema.org",
  "@type": "MedicalWebPage",
  "headline": "{title}",
  "description": "{excerpt}",
  "medicalAudience": {
    "@type": "Patient"
  }
}
```

## Implementation Strategy

### Server-Side Rendering (SSR)

- Use Next.js Server Components for SEO pages
- Fetch data server-side
- Generate meta tags and JSON-LD server-side

### SEO Settings Model

Use `SEOSetting` model to override defaults:

```python
SEOSetting(
    entity_type="topic",
    entity_id=topic.id,
    meta_title="Custom Title",
    meta_description="Custom description",
    canonical_url="https://kedismart.com/custom-url",
    og_image_url="https://kedismart.com/custom-image.jpg",
    noindex=False
)
```

### Noindex Rules

- Private pet profiles: `noindex=True` by default
- NFC scan pages: `noindex=True` (privacy protection)
- Draft content: `noindex=True`
- Admin override: Allow admin to set `noindex` via SEO settings

## Internal Linking

### Content → Products

- Topic pages link to relevant products
- Use anchor text like "Recommended Products"
- Link to product pages with relevant keywords

### Products → Content

- Product pages link to relevant care guides
- Use anchor text like "Care Guide" or "Learn More"

### Topic → Topics

- Related topics section
- Category pages list all topics

### Blog → Content

- Blog posts link to relevant topics
- Use contextual links within content

## Sitemap

### Dynamic Sitemap Generation

Generate sitemap for:

1. **Public Pages**
   - Home
   - Knowledge hub categories
   - Published topics
   - Published blog posts
   - Published products
   - Vet profiles
   - Published marketplace listings

2. **Exclude**
   - Private pet profiles
   - Draft content
   - Admin pages
   - User dashboards

### Implementation

```typescript
// app/sitemap.ts
export default async function sitemap() {
  // Fetch all public URLs
  const topics = await fetchTopics()
  const posts = await fetchBlogPosts()
  const products = await fetchProducts()
  
  return [
    ...topics.map(topic => ({
      url: `https://kedismart.com/pets/${topic.category.slug}/${topic.slug}`,
      lastModified: topic.updated_at,
      changeFrequency: 'weekly',
      priority: 0.8,
    })),
    // ... more entries
  ]
}
```

## Robots.txt

```
User-agent: *
Allow: /
Disallow: /admin
Disallow: /dashboard
Disallow: /api
Disallow: /scan/

Sitemap: https://kedismart.com/sitemap.xml
```

## Performance Best Practices

1. **Image Optimization**
   - Use Next.js Image component
   - Serve WebP format
   - Lazy loading for below-fold images

2. **Page Speed**
   - Server-side rendering for SEO pages
   - Minimize client-side JavaScript
   - Code splitting for non-critical JS

3. **Core Web Vitals**
   - LCP: Optimize images, reduce render-blocking resources
   - FID: Minimize JavaScript execution time
   - CLS: Set image dimensions, avoid layout shifts

## URL Patterns

### Knowledge Hub
- Category: `/pets/cats`, `/pets/dogs`
- Topic: `/pets/cats/cat-care-basics`

### Blog
- List: `/blog`
- Post: `/blog/cat-nutrition-guide`

### Shop
- Category: `/shop/pet-food`
- Product: `/product/premium-cat-food`

### Vets
- List: `/vets`
- Profile: `/vets/123`

### Marketplace
- List: `/marketplace`
- Listing: `/marketplace/456`

### NFC Scan
- Scan Page: `/scan/ABC123DEF456`

## Monitoring

- Use Google Search Console
- Monitor indexing status
- Track search performance
- Monitor Core Web Vitals
- Check for crawl errors

## Content Guidelines

1. **Title Tags**: 50-60 characters
2. **Meta Descriptions**: 150-160 characters
3. **Headings**: Use H1 for page title, H2/H3 for sections
4. **Alt Text**: Descriptive alt text for all images
5. **Keywords**: Natural keyword usage, avoid stuffing
6. **Content Quality**: Original, valuable, comprehensive content
