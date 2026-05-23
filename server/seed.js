const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Tournament = require('./models/Tournament');
const Player = require('./models/Player');
const Team = require('./models/Team');

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/cricket_auction';

const seedDatabase = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('MongoDB Connected for Seeding');

        // Clear existing data
        await User.deleteMany({});
        await Tournament.deleteMany({});
        await Player.deleteMany({});
        await Team.deleteMany({});
        console.log('Dummy data deleted.');

        // Create Super Admin
        const password = 'admin'; // You can change this
        const hashedPassword = await bcrypt.hash(password, 10);

        const adminUser = new User({
            username: 'admin',
            password: hashedPassword,
            role: 'superadmin'
        });

        await adminUser.save();
        console.log('Super Admin Created:');
        console.log('Username: admin');
        console.log('Password: admin');

        process.exit();
    } catch (error) {
        console.error('Seeding Error:', error);
        process.exit(1);
    }
};

seedDatabase();
