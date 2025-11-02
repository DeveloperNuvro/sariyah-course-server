/**
 * SEO Utilities
 * Provides functions for generating SEO-friendly content, structured data, and sitemaps
 */

/**
 * Generate structured data (JSON-LD) for a blog post
 */
export const generateBlogStructuredData = (blog, baseUrl = 'https://www.sariyahtech.com') => {
  const blogUrl = `${baseUrl}/blog/${blog.slug}`;
  const imageUrl = blog.ogImage || blog.featuredImage || `${baseUrl}/default-og-image.jpg`;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": blog.schemaType || "BlogPosting",
    "headline": blog.metaTitle || blog.title,
    "description": blog.metaDescription || blog.excerpt || '',
    "image": imageUrl,
    "datePublished": blog.publishedAt?.toISOString() || blog.createdAt?.toISOString(),
    "dateModified": blog.updatedAt?.toISOString(),
    "author": {
      "@type": "Person",
      "name": blog.author?.name || "Sariyah Tech",
      ...(blog.author?.avatar && { "image": blog.author.avatar }),
    },
    "publisher": {
      "@type": "Organization",
      "name": "Sariyah Tech",
      "logo": {
        "@type": "ImageObject",
        "url": `${baseUrl}/logo.png`
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": blogUrl
    }
  };

  if (blog.category) {
    structuredData.articleSection = blog.category.name;
  }

  if (blog.tags && blog.tags.length > 0) {
    structuredData.keywords = blog.metaKeywords?.join(', ') || blog.tags.join(', ');
  }

  if (blog.readingTime) {
    structuredData.timeRequired = `PT${blog.readingTime}M`;
  }

  return structuredData;
};

/**
 * Generate breadcrumb structured data
 */
export const generateBreadcrumbStructuredData = (items, baseUrl = 'https://www.sariyahtech.com') => {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": `${baseUrl}${item.url}`
    }))
  };
};

/**
 * Generate organization structured data
 */
export const generateOrganizationStructuredData = (baseUrl = 'https://www.sariyahtech.com') => {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Sariyah Tech",
    "url": baseUrl,
    "logo": `${baseUrl}/logo.png`,
    "sameAs": [
      // Add social media URLs if available
    ]
  };
};

/**
 * Generate website structured data
 */
export const generateWebsiteStructuredData = (baseUrl = 'https://www.sariyahtech.com') => {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Sariyah Tech",
    "url": baseUrl,
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `${baseUrl}/search?q={search_term_string}`
      },
      "query-input": "required name=search_term_string"
    }
  };
};

/**
 * Generate sitemap XML for blogs
 */
export const generateBlogSitemap = async (blogs, baseUrl = 'https://www.sariyahtech.com') => {
  const urls = blogs
    .filter(blog => blog.isPublished && blog.publishedAt)
    .map(blog => {
      const url = `${baseUrl}/blog/${blog.slug}`;
      const lastmod = blog.updatedAt?.toISOString().split('T')[0] || 
                     blog.publishedAt?.toISOString().split('T')[0] || 
                     new Date().toISOString().split('T')[0];
      
      let priority = '0.7';
      const daysSincePublished = blog.publishedAt 
        ? Math.floor((Date.now() - new Date(blog.publishedAt).getTime()) / (1000 * 60 * 60 * 24))
        : 999;
      
      if (daysSincePublished < 30) {
        priority = '0.9';
      } else if (daysSincePublished < 90) {
        priority = '0.8';
      }

      return {
        loc: url,
        lastmod,
        changefreq: 'weekly',
        priority
      };
    });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  return xml;
};

/**
 * Generate robots.txt content
 */
export const generateRobotsTxt = (baseUrl = 'https://www.sariyahtech.com') => {
  return `User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/

Sitemap: ${baseUrl}/sitemap.xml
Sitemap: ${baseUrl}/sitemap-blog.xml`;
};

/**
 * Validate and optimize meta title
 */
export const optimizeMetaTitle = (title, maxLength = 60) => {
  if (!title) return '';
  const optimized = title.trim().slice(0, maxLength);
  // Remove trailing punctuation if cut off
  return optimized.replace(/[.,;:!?]+$/, '');
};

/**
 * Validate and optimize meta description
 */
export const optimizeMetaDescription = (description, maxLength = 160) => {
  if (!description) return '';
  const optimized = description.trim().slice(0, maxLength);
  // Remove trailing punctuation if cut off, but keep sentences complete
  if (optimized.length === maxLength && !/[.!?]$/.test(optimized)) {
    const lastPeriod = optimized.lastIndexOf('.');
    if (lastPeriod > maxLength * 0.7) {
      return optimized.slice(0, lastPeriod + 1);
    }
  }
  return optimized;
};

/**
 * Generate canonical URL
 */
export const generateCanonicalUrl = (slug, baseUrl = 'https://www.sariyahtech.com') => {
  return `${baseUrl}/blog/${slug}`;
};

/**
 * Extract keywords from content (simple keyword extraction)
 */
export const extractKeywords = (content, maxKeywords = 10) => {
  if (!content) return [];
  
  // Remove HTML tags if present
  const text = content.replace(/<[^>]*>/g, ' ').toLowerCase();
  
  // Common stop words to exclude
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'should', 'could', 'may', 'might', 'must', 'can', 'this', 'that',
    'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they'
  ]);
  
  // Extract words (2+ characters)
  const words = text.match(/\b\w{2,}\b/g) || [];
  
  // Count frequency
  const wordCount = {};
  words.forEach(word => {
    if (!stopWords.has(word) && word.length > 2) {
      wordCount[word] = (wordCount[word] || 0) + 1;
    }
  });
  
  // Sort by frequency and return top keywords
  return Object.entries(wordCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords)
    .map(([word]) => word);
};

