import mongoose from 'mongoose';
import Product from '../models/product.model.js';
import slugify from 'slugify';

async function main() {
  const uri = process.env.SEED_MONGO_URI || 'mongodb://localhost:27017/sariyah';
  try {
    await mongoose.connect(uri);

    const title = 'Demo Ebook - Getting Started with AI';
    const slug = slugify(title, { lower: true, strict: true });

    const existing = await Product.findOne({ slug });
    if (existing) {
      console.log('Product already exists:', existing._id.toString());
      return;
    }

    const product = await Product.create({
      title,
      slug,
      description: 'A sample digital ebook to test the ecommerce flow. Includes a downloadable PDF.',
      price: 299,
      discountPrice: 99,
      thumbnail: 'https://picsum.photos/seed/ebook-demo/600/400',
      files: [
        {
          name: 'demo-ebook.pdf',
          url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
          sizeBytes: 85612,
          format: 'pdf',
        },
      ],
      // avoid tags field to bypass legacy text index on tags
      isPublished: true,
    });

    console.log('Seeded product:', product._id.toString(), product.slug);
  } catch (e) {
    console.error('SEED ERROR', e);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

main();


