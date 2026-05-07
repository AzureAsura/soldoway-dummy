# Soldoway Design System

> Modern consumer marketplace — clean white base, bold black, warm accents. Inspired by the feel of sody.app: playful, image-forward, smooth, and approachable.

---

## 🎨 Color Palette

```css
/* globals.css — @theme block */
@theme {
  --color-brand:        #000000; /* Primary black */
  --color-brand-dark:   #1A1A1A; /* Hover / depth */
  --color-accent:       #F8D94F; /* Yellow — CTA, highlights, badges */
  --color-background:   #FFFFFF; /* Page background */
  --color-surface:      #F5F5F5; /* Subtle panels, input bg */
  --color-surface-dark: #111111; /* Dark section bg (footer, CTA band) */
  --color-border:       #E5E5E5; /* Soft border for cards */
  --color-border-dark:  #000000; /* Strong border for Bauhaus elements */
  --color-muted:        #737373; /* Secondary text, captions */
  --color-foreground:   #0A0A0A; /* Body text */
  --color-success:      #22C55E;
  --color-danger:       #EF4444;
}
```

| Token             | Hex       | Usage                                        |
|-------------------|-----------|----------------------------------------------|
| `brand`           | `#000000` | Primary buttons, logo, active states         |
| `brand-dark`      | `#1A1A1A` | Hover on brand elements                      |
| `accent`          | `#F8D94F` | CTA buttons, badges, highlight chips         |
| `background`      | `#FFFFFF` | Page background                              |
| `surface`         | `#F5F5F5` | Card backgrounds, input fields               |
| `surface-dark`    | `#111111` | Dark sections — footer, promo bands          |
| `border`          | `#E5E5E5` | Card borders, dividers (soft)                |
| `border-dark`     | `#000000` | Bauhaus-style strong borders                 |
| `muted`           | `#737373` | Labels, metadata, helper text                |
| `foreground`      | `#0A0A0A` | All body text                                |

---

## 📝 Typography

```css
@theme {
  --font-heading: 'Outfit', sans-serif;      /* All headings, display, nav */
  --font-body:    'Public Sans', sans-serif; /* Body, paragraphs, UI text */
  --font-mono:    'JetBrains Mono', monospace; /* Prices, codes, tags */
}
```

| Scale     | Class       | Size  | Weight | Usage                           |
|-----------|-------------|-------|--------|---------------------------------|
| Display   | `text-6xl`  | 60px  | 800    | Hero headline                   |
| H1        | `text-4xl`  | 36px  | 700    | Page title                      |
| H2        | `text-3xl`  | 30px  | 700    | Section heading                 |
| H3        | `text-xl`   | 20px  | 600    | Card title, feature heading     |
| Body Lg   | `text-lg`   | 18px  | 400    | Hero subtext, lead paragraph    |
| Body      | `text-base` | 16px  | 400    | Default body                    |
| Small     | `text-sm`   | 14px  | 400    | Labels, captions, metadata      |
| Tiny      | `text-xs`   | 12px  | 500    | Tags, badges, overlines         |

**Key rule:** headings use `font-heading` (Outfit), body uses `font-body` (Public Sans). Never mix.

---

## 🌑 Shadows

Sody uses soft, airy cards. We keep Bauhaus solid shadows for interactive/branded elements only, and use soft shadows for image cards.

```css
@theme {
  --shadow-solid:      4px 4px 0px 0px #000000;
  --shadow-solid-sm:   2px 2px 0px 0px #000000;
  --shadow-solid-lg:   6px 6px 0px 0px #000000;
  --shadow-card:       0 2px 12px 0 rgba(0,0,0,0.08);
  --shadow-card-hover: 0 8px 32px 0 rgba(0,0,0,0.14);
}
```

| Token               | Style  | Usage                                  |
|---------------------|--------|----------------------------------------|
| `shadow-solid-sm`   | Solid  | Small UI chips, tags                   |
| `shadow-solid`      | Solid  | Primary buttons, Bauhaus panels        |
| `shadow-solid-lg`   | Solid  | Featured / hero elements               |
| `shadow-card`       | Soft   | Image cards, listing cards             |
| `shadow-card-hover` | Soft   | Card hover — lifts gently              |

---

## 🔘 Button Component

```tsx
import { Button } from '@/components/core/Button'

// Variants
<Button variant="primary">Get Started</Button>     // Black bg, white text
<Button variant="accent">Download App</Button>      // Yellow bg, black text — main CTA
<Button variant="secondary">Learn More</Button>     // White bg, black border
<Button variant="ghost">Cancel</Button>             // No bg, hover surface
<Button variant="dark">Get Partner App</Button>     // Used on dark sections

// Sizes
<Button size="sm">Small</Button>   // py-2 px-4 text-sm
<Button size="md">Medium</Button>  // py-3 px-6 text-base (default)
<Button size="lg">Large</Button>   // py-4 px-8 text-lg
<Button size="xl">X-Large</Button> // py-5 px-10 text-xl — hero only

// With icon (Sody-style arrow CTA)
<Button variant="accent" size="lg">
  Get Soldoway App
  <ArrowRight className="w-5 h-5 ml-2" />
</Button>

// Full width
<Button variant="primary" size="lg" className="w-full">
  Book Now
</Button>
```

**Rounding rule:**
```tsx
// Pill CTA — primary style for all marketing buttons
className="rounded-full"

// Bauhaus element — only when using solid shadows
className="rounded-sm border-2 border-foreground shadow-solid"
```

---

## 📦 Card Component

```tsx
import { Card } from '@/components/core/Card'

// Standard content card — soft shadow, rounded
<Card>
  <h3 className="font-heading font-semibold text-xl">Feature Title</h3>
  <p className="text-muted text-base mt-2">Description here.</p>
</Card>

// No padding — full-bleed image card (Sody creator card style)
<Card noPadding className="rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover transition-shadow duration-200">
  <img src={image} className="w-full aspect-[3/4] object-cover" />
  <div className="p-3 flex items-center gap-2">
    <img src={avatar} className="w-8 h-8 rounded-full object-cover" />
    <span className="text-sm font-semibold font-heading">@username</span>
  </div>
</Card>

// Feature panel — video + text side by side (Sody feature section)
<div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
  <div className="rounded-3xl overflow-hidden aspect-[9/16] bg-surface max-w-xs mx-auto">
    <video autoPlay muted loop playsInline className="w-full h-full object-cover" />
  </div>
  <div>
    <h3 className="font-heading font-bold text-3xl">Feature Name</h3>
    <p className="text-muted text-lg mt-4 leading-relaxed">Description.</p>
  </div>
</div>
```

---

## 🖼 Image Grid / Auto-Scroll Masonry

Sody's most distinctive pattern — auto-scrolling image columns with creator attribution overlay.

```tsx
// Single scrolling column
<div className="flex flex-col gap-3 animate-scroll-up">
  {[...items, ...items].map((item, i) => ( // duplicate for infinite loop
    <div key={i} className="relative rounded-2xl overflow-hidden shadow-card">
      <img src={item.image} className="w-full object-cover aspect-[3/4]" />
      {/* Creator attribution chip */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5">
        <img src={item.avatar} className="w-5 h-5 rounded-full object-cover" />
        <span className="text-xs font-semibold font-heading">{item.handle}</span>
      </div>
    </div>
  ))}
</div>

// CSS — in globals.css
@keyframes scroll-up {
  0%   { transform: translateY(0); }
  100% { transform: translateY(-50%); }
}
.animate-scroll-up {
  animation: scroll-up 20s linear infinite;
}
.animate-scroll-down {
  animation: scroll-up 20s linear infinite reverse;
}

// Multi-column hero grid (3 columns, offset middle)
<div className="grid grid-cols-3 gap-3 h-[600px] overflow-hidden">
  <div className="animate-scroll-up">{/* col 1 */}</div>
  <div className="animate-scroll-down mt-[-80px]">{/* col 2 — offset */}</div>
  <div className="animate-scroll-up">{/* col 3 */}</div>
</div>
```

---

## 🏷 Badge / Chip Component

```tsx
// Category tag (soft)
<span className="
  inline-flex items-center
  bg-surface rounded-full
  px-3 py-1 text-xs font-semibold font-heading
  border border-border
">
  Category
</span>

// Accent badge (highlighted, Bauhaus)
<span className="
  inline-flex items-center
  bg-accent rounded-full
  px-3 py-1 text-xs font-bold font-heading
  border-2 border-foreground shadow-solid-sm
">
  New
</span>

// Count badge
<span className="
  bg-brand text-white
  rounded-full w-5 h-5
  flex items-center justify-center
  text-xs font-bold font-mono
">
  12
</span>
```

---

## 🔔 Alert / Banner

```tsx
// Announcement bar (top of page — Sody "Download App" strip)
<div className="
  w-full bg-brand text-white
  py-2.5 px-4
  flex items-center justify-center gap-2
  text-sm font-semibold font-heading
">
  <span>✨ Soldoway is live!</span>
  <a className="underline underline-offset-2 hover:text-accent transition-colors">
    Download now →
  </a>
</div>

// Info card
<div className="
  flex items-start gap-3
  rounded-xl border border-border
  p-4 bg-surface
">
  <Info className="w-5 h-5 mt-0.5 shrink-0 text-muted" />
  <p className="text-sm font-body text-foreground">Info message here.</p>
</div>

// Error
<div className="
  flex items-start gap-3
  rounded-xl border border-danger/30
  p-4 bg-danger/5
">
  <AlertTriangle className="w-5 h-5 mt-0.5 text-danger shrink-0" />
  <p className="text-sm font-body text-danger">Something went wrong.</p>
</div>
```

---

## 🎭 Icons

```tsx
import {
  ArrowRight, ChevronDown, Menu, X,
  Star, MapPin, Clock, Search,
  Download, Check, Info, AlertTriangle
} from 'lucide-react'

// Size guide
<Search className="w-4 h-4" />        // Input icons
<ArrowRight className="w-5 h-5" />    // Button icons
<MapPin className="w-6 h-6" />        // Feature icons
<Star className="w-5 h-5 text-accent fill-accent" /> // Ratings — filled yellow
```

---

## 🧭 Navigation Bar

Sticky, white, clean — logo left, links center, dual CTA right. Mirrors Sody nav structure.

```tsx
<nav className="
  sticky top-0 z-50
  bg-white/95 backdrop-blur-md
  border-b border-border
  px-6 py-4
  flex items-center justify-between
">
  {/* Logo */}
  <a href="/" className="font-heading font-bold text-2xl tracking-tight">
    Soldoway
  </a>

  {/* Center links */}
  <div className="hidden md:flex items-center gap-8">
    {['Marketplace', 'Features', 'About'].map(link => (
      <a key={link} className="
        text-sm font-semibold font-heading text-muted
        hover:text-foreground transition-colors duration-150
      ">{link}</a>
    ))}
  </div>

  {/* Right CTAs */}
  <div className="flex items-center gap-3">
    <Button variant="secondary" size="sm" className="hidden md:flex">
      Get Partner App
    </Button>
    <Button variant="accent" size="sm">
      Get App
    </Button>
    <button className="md:hidden p-2">
      <Menu className="w-5 h-5" />
    </button>
  </div>
</nav>
```

---

## 🌚 Dark Section (CTA Band + Footer)

Sody uses full-bleed dark sections for the download CTA and footer.

```tsx
// Dark CTA band
<section className="bg-surface-dark text-white py-24 px-6">
  <div className="max-w-4xl mx-auto text-center">
    <h2 className="font-heading font-bold text-5xl mb-4">
      Ready to get started?
    </h2>
    <p className="text-white/60 text-lg font-body mb-10">
      Download Soldoway and start today.
    </p>
    <Button variant="accent" size="xl">
      Get Soldoway App <ArrowRight className="w-5 h-5 ml-2" />
    </Button>
    <div className="flex justify-center gap-4 mt-6">
      <AppStoreBadge theme="light" />
      <GooglePlayBadge theme="light" />
    </div>
  </div>
</section>

// Footer
<footer className="bg-surface-dark text-white border-t border-white/10">
  <div className="max-w-6xl mx-auto px-6 py-16 grid grid-cols-2 md:grid-cols-4 gap-10">
    <div className="col-span-2 md:col-span-1">
      <span className="font-heading font-bold text-xl">Soldoway</span>
      <p className="text-white/50 text-sm font-body mt-3 leading-relaxed">
        Short brand description here.
      </p>
      {/* Social icons row */}
    </div>
    <FooterColumn title="Connect" links={['Instagram', 'TikTok', 'LinkedIn']} />
    <FooterColumn title="Talk"    links={['WhatsApp', 'Email']} />
    <FooterColumn title="Get the App" links={['App Store', 'Google Play']} />
  </div>
  <div className="border-t border-white/10 py-5 px-6 text-center text-white/30 text-xs font-body">
    © 2026 Soldoway. All Rights Reserved.
  </div>
</footer>
```

---

## 🏗 Layout Patterns

```tsx
// Page wrapper
<div className="min-h-screen bg-background font-body text-foreground">
  <AnnouncementBar />
  <Navbar />
  <main>{/* sections */}</main>
  <Footer />
</div>

// Hero — text left, masonry grid right (Sody pattern)
<section className="max-w-7xl mx-auto px-6 py-20 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
  <div>
    <h1 className="font-heading font-extrabold text-6xl leading-tight">
      Your headline here
    </h1>
    <p className="text-muted text-lg mt-5 leading-relaxed max-w-md">
      Supporting copy that explains the value.
    </p>
    <div className="flex flex-wrap gap-3 mt-8">
      <Button variant="accent" size="lg">
        Primary CTA <ArrowRight className="w-5 h-5 ml-2" />
      </Button>
      <Button variant="secondary" size="lg">Secondary</Button>
    </div>
    <div className="flex gap-3 mt-6">
      <AppStoreBadge />
      <GooglePlayBadge />
    </div>
  </div>
  <ImageMasonryGrid />
</section>

// Feature alternating layout (video + text, Sody features section)
<section className="max-w-5xl mx-auto px-6 py-24 space-y-32">
  {features.map((feature, i) => (
    <div key={feature.id} className={cn(
      "grid grid-cols-1 md:grid-cols-2 gap-16 items-center",
      i % 2 === 1 && "md:[&>*:first-child]:order-last"
    )}>
      <div className="rounded-3xl overflow-hidden aspect-[9/16] bg-surface max-w-xs mx-auto">
        <video autoPlay muted loop playsInline className="w-full h-full object-cover" />
      </div>
      <div>
        <h3 className="font-heading font-bold text-3xl">{feature.title}</h3>
        <p className="text-muted text-lg mt-4 leading-relaxed">{feature.description}</p>
      </div>
    </div>
  ))}
</section>

// Section container
<section className="max-w-6xl mx-auto px-6 py-20">
  {/* content */}
</section>

// Centered narrow copy
<div className="max-w-2xl mx-auto text-center px-6">
  {/* headings, lead copy */}
</div>
```

---

## 📐 Spacing & Rounding Scale

| Token          | Value   | Usage                                          |
|----------------|---------|------------------------------------------------|
| `rounded-sm`   | 2px     | Bauhaus elements, strong-border components     |
| `rounded-md`   | 6px     | Input fields, small chips                      |
| `rounded-xl`   | 12px    | Info panels, feature cards                     |
| `rounded-2xl`  | 16px    | Image cards, video panels                      |
| `rounded-3xl`  | 24px    | App mockup frames, phone bezels                |
| `rounded-full` | 9999px  | CTA buttons (pill), avatars, count badges      |

> Sody mixes pill buttons + heavily rounded cards. Use `rounded-full` for buttons and `rounded-2xl`/`rounded-3xl` for image/video containers. `rounded-sm` only for explicitly Bauhaus-branded UI.

---

## 🎯 Design Principles

### 1. Image-Forward
Content cards are primarily visual. Photos and videos lead, text supports. Use `aspect-[3/4]` for portrait creator/listing cards.

### 2. Pill CTAs
All marketing buttons use `rounded-full`. This is the consumer-app DNA — approachable, soft, inviting.

### 3. Two Worlds: Light & Dark
The UI exists in two modes: **white/light** (main content, marketplace) and **black/dark** (footer, download CTA). Transitions are always full-bleed — never partial dark panels inside a white section.

### 4. Accent = One Thing
Yellow (`#F8D94F`) is reserved for the single primary CTA per page — typically the "Get App" button. Never use it decoratively or for multiple elements simultaneously.

### 5. Soft Cards, Strong Brand Moments
Image cards → `shadow-card` + `rounded-2xl`. Brand/interactive UI → `border-2 border-foreground shadow-solid`. These two shadow systems should not mix.

### 6. Motion for Delight
Auto-scrolling image grids, smooth `transition-shadow duration-200` on card hover, and video-in-feature-sections add life. Keep motion subtle and purposeful.

---

## 🚫 Don't Use

| ❌ Avoid                             | ✅ Use Instead                              |
|--------------------------------------|----------------------------------------------|
| Blurred shadows on brand buttons     | `shadow-solid` (Bauhaus)                     |
| `rounded-lg` on image cards          | `rounded-2xl` or `rounded-3xl`               |
| `rounded-md` on CTA buttons          | `rounded-full` for pill buttons              |
| Multiple accent-colored elements     | One accent CTA per page only                 |
| Shadcn UI components                 | Custom atomic components                     |
| `any` in TypeScript                  | Strict types always                          |
| Relative imports (`../`)             | Absolute imports (`@/`)                      |
| Raw text over images                 | Use `bg-white/90 backdrop-blur-sm` chips     |
| Tailwind blur shadows (`shadow-lg`)  | `shadow-card` or `shadow-solid` only         |

---


