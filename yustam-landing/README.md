# 🌐 Yustam Landing Page

> **Luxury marketing website with Play Store & App Store buttons**

[![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

---

## 🎯 Overview

The **Yustam Landing Page** is a stunning, SEO-optimized marketing website built with vanilla HTML, CSS, and JavaScript. It showcases the Yustam Marketplace with a luxury design, smooth animations, and clear calls-to-action.

### Key Features
- 🎨 **Luxury Design**: Glassmorphism, gradients, micro-animations
- 📱 **Fully Responsive**: Mobile, tablet, desktop optimized
- ⚡ **Lightning Fast**: No frameworks, pure vanilla JS
- 🔍 **SEO Optimized**: Meta tags, semantic HTML, sitemap
- 🎬 **Animations**: Scroll-triggered animations, parallax effects
- 📲 **App Download**: Direct links to Play Store & App Store

---

## 📁 Project Structure

```
yustam-landing/
├── index.html              # Main landing page
├── css/
│   ├── style.css          # Main stylesheet
│   ├── animations.css     # Animation definitions
│   └── responsive.css     # Media queries
├── js/
│   ├── main.js            # Main JavaScript
│   ├── animations.js      # Scroll animations
│   └── form.js            # Contact form handler
├── assets/
│   ├── images/
│   │   ├── hero-bg.jpg
│   │   ├── app-screenshot-1.png
│   │   ├── app-screenshot-2.png
│   │   └── logo.svg
│   ├── icons/
│   │   ├── playstore.svg
│   │   └── appstore.svg
│   └── fonts/
│       ├── Satoshi-Variable.woff2
│       └── ClashDisplay-Variable.woff2
├── sitemap.xml            # SEO sitemap
├── robots.txt             # Search engine directives
└── README.md              # This file
```

---

## 🚀 Getting Started

### Prerequisites
- Web browser (Chrome, Firefox, Safari, Edge)
- Text editor (VS Code recommended)
- Live server extension (for development)

### Installation

1. **Clone or download the project**
```bash
cd yustam-landing
```

2. **Open in browser**
```bash
# Using VS Code Live Server
# Right-click index.html → Open with Live Server

# Or simply open index.html in browser
open index.html
```

3. **No build step required!** Pure HTML/CSS/JS

---

## 🎨 Design System

### Color Palette
```css
:root {
  /* Primary Colors */
  --primary-orange: #F3731E;
  --primary-emerald: #0F6A53;
  
  /* Gradients */
  --gradient-primary: linear-gradient(135deg, #F3731E 0%, #FF8C42 100%);
  --gradient-emerald: linear-gradient(135deg, #0F6A53 0%, #10B981 100%);
  
  /* Neutrals */
  --white: #FFFFFF;
  --black: #0A0A0A;
  --gray-50: #F9FAFB;
  --gray-100: #F3F4F6;
  --gray-900: #111827;
  
  /* Glassmorphism */
  --glass-bg: rgba(255, 255, 255, 0.1);
  --glass-border: rgba(255, 255, 255, 0.2);
  --glass-blur: blur(10px);
}
```

### Typography
```css
/* Headings */
font-family: 'Clash Display', sans-serif;
font-weight: 700;

/* Body */
font-family: 'Satoshi', sans-serif;
font-weight: 400;
```

### Spacing
```css
--spacing-xs: 0.5rem;   /* 8px */
--spacing-sm: 1rem;     /* 16px */
--spacing-md: 1.5rem;   /* 24px */
--spacing-lg: 2rem;     /* 32px */
--spacing-xl: 3rem;     /* 48px */
--spacing-2xl: 4rem;    /* 64px */
```

---

## 📄 Page Sections

### 1. Hero Section
- Headline: "Africa's #1 Classifieds Marketplace"
- Subheadline: Feature highlights
- CTA buttons: Download on Play Store, Download on App Store
- Hero image: App screenshots with glassmorphism overlay

### 2. Features Section
- **For Buyers**: Browse, Search, Chat, Save
- **For Vendors**: List, Manage, Analytics, Grow
- Icon + Title + Description cards
- Hover animations

### 3. How It Works
- Step-by-step guide
- Numbered cards with icons
- Smooth scroll animations

### 4. Pricing Section
- All 5 subscription tiers
- Feature comparison table
- "Most Popular" badge on Pro plan
- CTA: "Get Started"

### 5. Testimonials
- Carousel of user reviews
- Star ratings
- User avatars
- Auto-play with pause on hover

### 6. App Screenshots
- Image carousel
- Mobile mockups
- Swipe/click navigation

### 7. Download CTA
- Large buttons for Play Store & App Store
- QR codes for mobile download
- "Available on Android & iOS"

### 8. Footer
- Quick links (About, Features, Pricing, Contact)
- Social media icons
- Copyright notice
- Privacy Policy, Terms of Service links

---

## 🎬 Animations

### Scroll Animations
```javascript
// Fade in on scroll
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('animate-in');
    }
  });
}, observerOptions);

document.querySelectorAll('.fade-in').forEach(el => {
  observer.observe(el);
});
```

### Micro-interactions
- Button hover: Scale + shadow
- Card hover: Lift + glow
- Link hover: Underline slide
- Image hover: Zoom

---

## 🔍 SEO Optimization

### Meta Tags
```html
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Yustam - Africa's #1 Classifieds Marketplace</title>
  <meta name="description" content="Buy and sell anything on Yustam. The most trusted classifieds marketplace in Africa with verified vendors and secure transactions.">
  <meta name="keywords" content="marketplace, classifieds, buy, sell, Africa, Nigeria, verified vendors">
  
  <!-- Open Graph -->
  <meta property="og:title" content="Yustam Marketplace">
  <meta property="og:description" content="Africa's #1 Classifieds Platform">
  <meta property="og:image" content="https://yustam.com.ng/assets/og-image.jpg">
  <meta property="og:url" content="https://yustam.com.ng">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Yustam Marketplace">
  <meta name="twitter:description" content="Africa's #1 Classifieds Platform">
  <meta name="twitter:image" content="https://yustam.com.ng/assets/twitter-card.jpg">
</head>
```

### Semantic HTML
```html
<header>
  <nav aria-label="Main navigation">...</nav>
</header>

<main>
  <section aria-labelledby="hero-heading">...</section>
  <section aria-labelledby="features-heading">...</section>
</main>

<footer>...</footer>
```

### Sitemap
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://yustam.com.ng/</loc>
    <lastmod>2025-11-26</lastmod>
    <priority>1.0</priority>
  </url>
</urlset>
```

---

## 📱 Responsive Design

### Breakpoints
```css
/* Mobile First */
@media (min-width: 640px) {  /* sm */
  /* Tablet styles */
}

@media (min-width: 1024px) { /* lg */
  /* Desktop styles */
}

@media (min-width: 1280px) { /* xl */
  /* Large desktop styles */
}
```

### Mobile Optimizations
- Touch-friendly buttons (min 44x44px)
- Hamburger menu
- Stacked layout
- Optimized images (WebP format)
- Lazy loading

---

## ⚡ Performance

### Optimizations
- **Minified CSS/JS**: Reduce file size
- **Image optimization**: WebP format, lazy loading
- **Font loading**: `font-display: swap`
- **Critical CSS**: Inline above-the-fold styles
- **Async scripts**: Non-blocking JavaScript

### Lighthouse Score Target
- Performance: 95+
- Accessibility: 100
- Best Practices: 100
- SEO: 100

---

## 📞 Contact Form

### Implementation
```javascript
document.getElementById('contact-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData);
  
  try {
    const response = await fetch('https://api.yustam.com.ng/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (response.ok) {
      showSuccess('Message sent successfully!');
      e.target.reset();
    } else {
      showError('Failed to send message. Please try again.');
    }
  } catch (error) {
    showError('Network error. Please check your connection.');
  }
});
```

---

## 🚀 Deployment

### Build (Optional)
```bash
# Minify CSS
npx cssnano css/style.css css/style.min.css

# Minify JS
npx terser js/main.js -o js/main.min.js

# Optimize images
npx imagemin assets/images/* --out-dir=assets/images/optimized
```

### Deploy
```bash
# Netlify
netlify deploy --prod --dir=.

# Vercel
vercel deploy

# GitHub Pages
git push origin main
```

---

## 📄 License

Copyright © 2025 Yustam Marketplace. All rights reserved.

---

**Luxury meets performance 🚀**
