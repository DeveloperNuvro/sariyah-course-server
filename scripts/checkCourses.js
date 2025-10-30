import mongoose from 'mongoose';
import Course from '../models/course.model.js';

async function main() {
  const uri = process.env.CHECK_MONGO_URI || 'mongodb://localhost:27017/sariyah';
  try {
    await mongoose.connect(uri);
    const total = await Course.countDocuments({});
    const published = await Course.countDocuments({ isPublished: true });
    const latest = await Course.find({}).sort({ createdAt: -1 }).limit(5).select('title isPublished createdAt');
    console.log(JSON.stringify({ total, published, latest }, null, 2));
  } catch (e) {
    console.error('ERROR', e.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

main();


