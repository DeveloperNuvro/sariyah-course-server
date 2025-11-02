# Blog SEO Fields Guide

## What are these SEO fields?

### 1. **Meta Title** (Basic SEO)
- **What it is**: The title that appears in search engine results (Google, Bing, etc.)
- **Where it appears**: Browser tab, search engine results
- **Example**: "How to Learn React in 2024 - Complete Guide"
- **Best practice**: 50-60 characters max, include your main keyword
- **If left empty**: Uses your blog post title (auto-generated)

### 2. **Meta Description** (Basic SEO)
- **What it is**: A short summary that appears under the title in search results
- **Where it appears**: Search engine results page (SERP)
- **Example**: "Learn React from scratch with this comprehensive guide. Master hooks, components, and modern React patterns in 30 days."
- **Best practice**: 150-160 characters, compelling description that encourages clicks
- **If left empty**: Uses your excerpt or first 160 characters of content (auto-generated)

### 3. **Meta Keywords** (Optional)
- **What it is**: Keywords related to your blog post
- **Example**: "react, javascript, frontend, tutorial, web development"
- **Note**: Search engines don't heavily rely on this anymore, but it can help
- **Best practice**: 5-10 relevant keywords, comma-separated

---

## Open Graph (OG) Fields - For Social Media Sharing

When someone shares your blog post on **Facebook, LinkedIn, Twitter/X**, these fields control how it looks:

### 4. **OG Title** (Open Graph Title)
- **What it is**: The title shown when your blog post is shared on social media
- **Where it appears**: 
  - Facebook posts
  - LinkedIn posts
  - Twitter/X cards
  - WhatsApp previews
  - Slack previews
- **Example**: "Master React in 30 Days - Free Course"
- **Best practice**: 60-95 characters, catchy and shareable
- **If left empty**: Uses your blog post title (auto-generated)

### 5. **OG Description** (Open Graph Description)
- **What it is**: The description/preview text shown when shared on social media
- **Where it appears**: Below the title in social media preview cards
- **Example**: "Join 10,000+ students learning React. Start building modern web apps today!"
- **Best practice**: 150-200 characters, engaging and informative
- **If left empty**: Uses your meta description (auto-generated)

### 6. **OG Image URL** (Open Graph Image)
- **What it is**: The image that appears when your blog post is shared on social media
- **Where it appears**: The large image in social media preview cards
- **Best practice**: 
  - **Recommended size**: 1200 x 630 pixels (Facebook/LinkedIn standard)
  - **Format**: JPG or PNG
  - **File size**: Under 1MB for fast loading
  - Should be relevant to your blog post
- **If left empty**: Uses your featured image (auto-generated)

**Why it matters**: A good OG image can increase click-through rates by 40%!

---

## Canonical URL

### 7. **Canonical URL**
- **What it is**: The "official" URL of your blog post
- **Why it matters**: 
  - Prevents duplicate content issues
  - Tells search engines which version is the "real" one
  - Important if you have multiple URLs pointing to the same content
- **Example**: 
  - Your post: `https://www.sariyahtech.com/blog/how-to-learn-react`
  - If someone copies your content and puts it at: `https://example.com/blog/react-guide`
  - The canonical URL tells Google: "The original is at sariyahtech.com"
- **When to use**: 
  - If you republish content from another site
  - If you have multiple URLs for the same post
  - If you're migrating from old URLs to new ones
- **If left empty**: Automatically uses your blog post URL

---

## Real-World Example

### Blog Post: "How to Learn React in 30 Days"

**Meta Title** (for Google):
```
How to Learn React in 30 Days - Complete Beginner Guide 2024
```

**Meta Description** (for Google):
```
Master React.js from scratch with our step-by-step guide. Learn hooks, components, and build real projects. Start your journey today!
```

**OG Title** (for Facebook/LinkedIn):
```
🚀 Learn React in 30 Days - Free Complete Guide
```

**OG Description** (for Facebook/LinkedIn):
```
Join 10,000+ developers learning React! Build real projects, master modern patterns, and land your dream job. Start now! 👨‍💻
```

**OG Image**:
```
https://www.sariyahtech.com/images/react-course-1200x630.jpg
```

**Canonical URL**:
```
https://www.sariyahtech.com/blog/how-to-learn-react-in-30-days
```

---

## How It Appears

### In Google Search:
```
How to Learn React in 30 Days - Complete Beginner Guide 2024
https://www.sariyahtech.com/blog/how-to-learn-react-in-30-days
Master React.js from scratch with our step-by-step guide. Learn hooks, components, and build real projects. Start your journey today!
```

### On Facebook/LinkedIn Share:
```
[OG Image: 1200x630 image]
🚀 Learn React in 30 Days - Free Complete Guide
Join 10,000+ developers learning React! Build real projects, master modern patterns, and land your dream job. Start now! 👨‍💻
```

---

## Quick Tips

1. **Meta Title & Description**: Focus on SEO keywords, clear value proposition
2. **OG Title & Description**: Make it shareable, use emojis, create curiosity
3. **OG Image**: Create custom images for important posts (use Canva, Figma)
4. **Canonical URL**: Usually leave empty (auto-generated), only set if you have duplicate content issues

---

## What Happens If You Leave Them Empty?

All fields have **auto-fallbacks**:
- **Meta Title** → Uses blog title
- **Meta Description** → Uses excerpt or first 160 chars of content
- **OG Title** → Uses Meta Title or blog title
- **OG Description** → Uses Meta Description or excerpt
- **OG Image** → Uses featured image
- **Canonical URL** → Uses your blog post URL automatically

**You don't have to fill everything!** Only fill them when you want **custom SEO optimization** or **special social media previews**.

