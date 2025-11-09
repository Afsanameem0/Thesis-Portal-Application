import mongoose from 'mongoose';
import User from '../models/User.js';
import Group from '../models/Group.js';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
  try {
    const CONNECTION_URL = "mongodb+srv://tasminahmedoni909:tasminoni12@cluster0.ifbev34.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
    await mongoose.connect(CONNECTION_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

const fixGroupSeats = async () => {
  try {
    console.log('Checking for group seat allocation issues...');
    
    // Find all faculty members
    const faculty = await User.find({ role: 'faculty' });
    console.log(`Found ${faculty.length} faculty members`);
    
    for (const f of faculty) {
      console.log(`\nChecking faculty: ${f.name} (${f._id})`);
      console.log(`Current supervisees: ${f.supervisees.length}`);
      
      const groupIds = [];
      const individualStudentIds = [];
      
      // Check each supervisee ID
      for (const id of f.supervisees) {
        try {
          const group = await Group.findById(id);
          if (group) {
            console.log(`  Found group: ${group.name} (${id})`);
            groupIds.push(id);
          } else {
            // Check if it's a student
            const student = await User.findById(id);
            if (student && student.role === 'student') {
              console.log(`  Found individual student: ${student.name} (${id})`);
              individualStudentIds.push(id);
            } else {
              console.log(`  Unknown ID: ${id}`);
            }
          }
        } catch (error) {
          console.log(`  Error checking ID ${id}:`, error.message);
        }
      }
      
      console.log(`  Summary: ${individualStudentIds.length} individual students, ${groupIds.length} groups`);
      console.log(`  Total seats used: ${individualStudentIds.length + groupIds.length}`);
      console.log(`  Faculty capacity: ${f.seatCapacity}`);
    }
    
    console.log('\nGroup seat allocation check completed!');
  } catch (error) {
    console.error('Error fixing group seats:', error);
  }
};

const main = async () => {
  await connectDB();
  await fixGroupSeats();
  process.exit(0);
};

main(); 