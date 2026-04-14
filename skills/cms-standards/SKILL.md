---
name: cms-standards
description: Expert reference for CMS architecture, content modeling, editorial workflows, and headless/hybrid implementation standards
tags: [cms, headless, content-modeling, editorial, strapi, contentful, sanity]
---

# CMS Standards — Expert Reference

## Core Mental Model

A CMS is a **content API** with an editorial UI attached. Design the content model first (what data exists, how it relates), the editorial experience second (how humans manage it), and the delivery layer third (how it renders).

The fatal mistake: designing the CMS to match the current front-end design. Designs change. Content outlives them. Model for **semantic meaning**, not visual presentation.

---

## Non-Negotiable Standards

1. **Content types are not page types**. A content type is a semantic entity (Article, Author, Product). A page is an assembly of content types. Never create a content type called "Homepage" or "About Page".
2. **Every content type has a unique, human-readable slug field**. Relying on IDs for references creates unmaintainable content.
3. **Media assets are typed and sized at upload**. Never store a raw `imageUrl` string — store a reference to a media asset with its own metadata (alt text, caption, focal point, MIME type, dimensions).
4. **Validation is set at the model level**, not just the UI. Required fields must be required in the schema, not enforced by editorial convention alone.
5. **Localization is architectural**, not a retrofit. If the product will ever support multiple locales, the CMS content model must support it from day one. Adding it later requires a migration.
6. **Rich text fields are a last resort**. Prefer structured fields (array of blocks, references) over unstructured rich text. Rich text fields become maintenance black holes.
7. **Preview environments are non-negotiable for editorial teams**. Editors must be able to see content before publishing. Build the preview endpoint before launch.

---

## Content Modeling Principles

### Separate Structure from Presentation

```
BAD content model:
  HeroSection {
    backgroundImage: Image
    headline: String
    buttonText: String
    buttonColor: String   ← presentation leak
    textAlignment: Enum   ← presentation leak
  }

GOOD content model:
  Hero {
    headline: String (required)
    subheadline: String
    image: Image (required)
    cta: Link             ← structured reference, not raw text+url
    variant: Enum('primary', 'secondary', 'dark')  ← semantic, not visual
  }
  // Presentation (colors, alignment) is a front-end concern
```

### References over Duplication

```
BAD: Duplicating author info in every article
  Article {
    authorName: String
    authorBio: String
    authorPhoto: Image
  }

GOOD: Reference to Author content type
  Article {
    author: Reference<Author> (required)
  }
  Author {
    name: String (required)
    bio: Text
    photo: Image
    slug: String (unique, required)
  }
```

### Block/Slice Pattern for Long-Form Content

Instead of one rich text blob:
```typescript
// Content is an array of typed blocks
type ArticleBody = Array<
  | { _type: 'paragraph'; text: PortableText }
  | { _type: 'image'; asset: ImageReference; caption: string; alt: string }
  | { _type: 'callout'; variant: 'info'|'warning'|'tip'; body: PortableText }
  | { _type: 'codeBlock'; code: string; language: string; filename?: string }
  | { _type: 'embedVideo'; url: string; provider: 'youtube'|'vimeo' }
>
```
Each block type is independently validatable, queryable, and renderable.

---

## Decision Rules

- If content will appear in more than one place → it must be a separate content type with references; never duplicate
- If a field stores a URL → it should be a structured `Link` type (`{ label, url, target }`) not a raw string
- If a field is a yes/no toggle → use a boolean; never use an enum with 2 values
- If a content type has > 20 fields → it models more than one thing; split it
- If two content types share > 5 fields → extract a shared type or use inheritance
- If the team asks for a "flexible" or "free-form" component → model the constraint tighter; flexibility without structure degrades into chaos
- If content has regional/locale variants → use locale as a content field, not a separate content type per locale
- If an image needs cropping for different contexts → store focal point data, not pre-cropped variants
- Never store HTML in a CMS field — store structured data, transform to HTML at render time
- Never create a content type per campaign or per client — model the abstraction, parameterize the instance
- If editorial workflow requires approval → implement `draft → review → published` states; never just `draft | published`
- If the client says "we might add French later" → add locale support now; retrofitting doubles the migration cost

---

## Editorial Workflow Standards

### Content States
```
draft → in_review → approved → published → archived
         ↑              |
         └── (request changes)
```

- **Draft**: visible only to author
- **In review**: locked for editing, visible to reviewers
- **Approved**: cleared for publish, scheduled or immediate
- **Published**: live; edits create a new draft (version)
- **Archived**: removed from delivery API, not deleted

### Versioning Requirements
- Every publish creates an immutable version snapshot
- Rollback to any previous version must be a 1-click operation
- Drafts do not overwrite published state — they exist in parallel

### Scheduled Publishing
Required for any editorial team. Implement at the CMS level, not via cron job in the app:
```
publishAt: DATETIME (nullable)
unpublishAt: DATETIME (nullable)
```

---

## Headless CMS Architecture

```
┌──────────────────┐     Content API      ┌──────────────────┐
│   CMS Backend    │ ─── (REST/GraphQL) ──▶│  Frontend Apps   │
│  (Contentful /   │                       │  (Next.js, etc.) │
│   Sanity / etc.) │                       └──────────────────┘
└──────────────────┘
        │                                  ┌──────────────────┐
        └─── Webhooks ────────────────────▶│  Build / Cache   │
                                           │  Invalidation    │
                                           └──────────────────┘
```

**Webhook events to always handle**:
- `entry.publish` → invalidate cache for affected pages
- `entry.unpublish` → invalidate + redirect or 404
- `asset.upload` → process image transformations
- `entry.delete` → check for broken references before allowing

### Cache Invalidation Strategy
- Tag-based invalidation (Vercel/CDN) preferred over time-based TTL
- Each content entry must produce a cache tag: `article-{slug}`, `author-{id}`
- On publish webhook: invalidate all pages that reference the entry

---

## Common Mistakes

### Mistake 1: Page-based content types
```
BAD:
  HomepageHero {}
  AboutPageHero {}
  PricingPageHero {}

GOOD:
  Hero {}  // used on any page, via reference
```

### Mistake 2: Rich text for structured data
```
BAD:
  Product {
    description: RichText  // editors paste in bullets with prices
  }

GOOD:
  Product {
    description: Text (plain, max 500 chars)
    features: Array<String>
    specifications: Array<{ label: String, value: String }>
  }
```

### Mistake 3: Hardcoding locale in content type names
```
BAD:
  ArticleEN {}
  ArticleFR {}
  ArticleDE {}

GOOD:
  Article {}  // with locale field and i18n plugin/configuration
```

### Mistake 4: Storing presentation config in content
```
BAD:
  Banner {
    backgroundColor: String  // "#FF0000"
    fontColor: String
    padding: String          // "large"
  }

GOOD:
  Banner {
    text: String (required)
    variant: Enum('primary', 'warning', 'info')  // semantic, not visual
  }
```

### Mistake 5: No alt text enforcement
```
BAD:
  Image {
    url: String
    alt: String  // optional
  }

GOOD:
  Image {
    asset: Asset (required)
    alt: String (required, min 1 char)
    caption: String (optional)
  }
```

---

## Good vs Bad Output

**BAD** content model for a blog:
```javascript
// One content type, everything in it
BlogPost {
  title: String,
  body: RichText,  // author name, bio, photo pasted in
  category: String,  // free text — "Tech", "tech", "Technology" all coexist
  relatedPostUrls: RichText,  // editors paste links in
  heroImageUrl: String  // no alt text, no metadata
}
```

**GOOD** content model:
```javascript
Article {
  title:       String (required, max: 80)
  slug:        String (required, unique, pattern: /^[a-z0-9-]+$/)
  author:      Reference<Author> (required)
  category:    Reference<Category> (required)
  publishedAt: DateTime (required)
  hero:        Image (required)  // Image type with alt, caption, focalPoint
  summary:     String (required, max: 160)  // used for SEO + card previews
  body:        Array<ContentBlock>  // typed block array
  relatedArticles: Array<Reference<Article>> (max: 3)
  seo: {
    metaTitle:       String (max: 60)
    metaDescription: String (max: 160)
    ogImage:         Image
  }
}

Author {
  name:  String (required)
  slug:  String (required, unique)
  bio:   String (max: 300)
  photo: Image (required)
  role:  String
}

Category {
  name: String (required)
  slug: String (required, unique)
  description: String
}
```

---

## CMS Selection Criteria

| Requirement | Recommendation |
|---|---|
| Non-technical editors, complex workflow | Contentful, Prismic |
| Developer-centric, custom schemas | Sanity |
| Self-hosted, open source | Strapi, Directus |
| Simple blog/marketing | Contentlayer + Git |
| E-commerce + content | Sanity + Shopify, or Contentful + Shopify |
| Real-time collaboration | Sanity |
| Strict compliance / data residency | Self-hosted (Strapi, Directus) |

**Never choose a CMS because the team knows it** without verifying it meets the content model requirements. Familiarity is not architecture.

---

## Vocabulary

- **Content type**: schema definition for a category of content (Article, Product, Author)
- **Entry**: a single instance of a content type
- **Reference**: a pointer from one entry to another (avoids duplication)
- **Block / Slice**: a typed unit within a structured body field
- **Portable Text**: Sanity's open standard for structured rich text (serializable, queryable)
- **Webhook**: HTTP callback fired when CMS content changes
- **Preview mode**: rendering draft content in the front end before publish
- **Focal point**: the important area of an image, used to guide responsive cropping
- **Structured content**: content modeled as typed fields and references, not HTML blobs
- **Delivery API**: read-only content API used by front-end apps
- **Management API**: read-write API used by the editorial UI and migrations
- **Content mesh**: architecture where multiple specialized CMS/API sources are composed at the front end
- **ISR** (Incremental Static Regeneration): Next.js pattern for revalidating cached pages on demand via webhook
