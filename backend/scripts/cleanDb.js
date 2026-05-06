const mongoose = require('mongoose');
const path     = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const clean = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const collections = [
      'cachedmessages',
      'cachedcalls',
      'reports',
      'pendingmessages',
      'phonenumbers',
    ];

    for (const col of collections) {
      try {
        const result = await mongoose.connection.collection(col).deleteMany({});
        console.log(`✓ Cleared ${col}: ${result.deletedCount} documents removed`);
      } catch (e) {
        console.log(`⚠ Skipped (not found): ${col}`);
      }
    }

    console.log('\n✅ Database cleaned successfully!');
    console.log('✅ Users collection preserved.');
    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

clean();