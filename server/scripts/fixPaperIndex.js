import mongoose from 'mongoose';
import Paper from '../models/Paper.js';

// Try different connection strings
const CONNECTION_URLS = [
  "mongodb+srv://tasminahmedoni909:tasminoni12@cluster0.ifbev34.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0",
  "mongodb+srv://tasminahmedoni909:tasminoni12@cluster0.ifbev34.mongodb.net/academic_thesis_portal?retryWrites=true&w=majority",
  "mongodb://localhost:27017/academic_thesis_portal" // Local fallback
];

const fixPaperIndex = async () => {
  for (let i = 0; i < CONNECTION_URLS.length; i++) {
    try {
      console.log(`Attempting to connect to MongoDB (attempt ${i + 1})...`);
      await mongoose.connect(CONNECTION_URLS[i], {
        serverSelectionTimeoutMS: 10000, // Timeout after 10s
        socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
        family: 4 // Use IPv4, skip trying IPv6
      });
      console.log('Connected to database');

      // List all indexes to see what exists
      console.log('Listing existing indexes...');
      const indexes = await Paper.collection.indexes();
      console.log('Existing indexes:', indexes.map(idx => idx.name));

      // Drop all text indexes
      console.log('Dropping existing text indexes...');
      for (const index of indexes) {
        if (index.name.includes('text')) {
          try {
            await Paper.collection.dropIndex(index.name);
            console.log(`Dropped index: ${index.name}`);
          } catch (dropError) {
            console.log(`Could not drop index ${index.name}:`, dropError.message);
          }
        }
      }

      // Create the new index
      console.log('Creating new text index...');
      await Paper.collection.createIndex(
        { title: 'text', abstract: 'text', keywords: 'text' },
        { name: 'title_text_abstract_text_keywords_text' }
      );
      console.log('New index created successfully');

      console.log('Index fix completed successfully!');
      await mongoose.disconnect();
      console.log('Disconnected from database');
      return; // Exit if successful
    } catch (error) {
      console.error(`MongoDB connection attempt ${i + 1} failed:`, error.message);
      if (i === CONNECTION_URLS.length - 1) {
        console.log("All connection attempts failed. Could not fix index.");
      }
    }
  }
};

fixPaperIndex();
