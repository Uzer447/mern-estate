import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';
import dotenv from 'dotenv';
import { faker } from '@faker-js/faker';
import User from './api/models/user.model.js';
import Listing from './api/models/listing.model.js';

dotenv.config();

// Property-related arrays remain the same as before
const propertyStyles = [
  'Colonial', 'Modern', 'Contemporary', 'Victorian', 'Mediterranean',
  'Craftsman', 'Ranch', 'Mid-Century Modern', 'Tudor', 'Cape Cod',
  'Art Deco', 'Georgian', 'Spanish Revival', 'Minimalist'
];

const amenities = [
  'Hardwood floors', 'Granite countertops', 'Stainless steel appliances',
  'Central air', 'Walk-in closets', 'Crown molding', 'Recessed lighting',
  'Custom cabinets', 'Smart home features', 'Energy efficient windows',
  'High ceilings', 'Open floor plan', 'Fireplace', 'Updated fixtures',
  'Kitchen island', 'Spa-like bathroom', 'Double vanity', 'Garden tub'
];

// Helper functions updated with correct Faker methods
const generateUniqueUsername = (firstName, lastName) => {
  const timestamp = Date.now().toString().slice(-4);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${firstName.toLowerCase()}${lastName.toLowerCase()}${timestamp}${random}`;
};

const generateUniqueEmail = (firstName, lastName) => {
  const timestamp = Date.now().toString().slice(-4);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}${timestamp}${random}@example.com`;
};

const generatePropertyDescription = (bedrooms, style, features) => {
  const description = `
${faker.lorem.paragraph(2)}

This stunning ${style} home features ${bedrooms} bedrooms and showcases:
${features.map(feature => `• ${feature}`).join('\n')}

${faker.lorem.paragraph(1)}

Location Highlights:
• ${faker.number.float({ min: 0.5, max: 5, precision: 0.1 })} miles to ${faker.location.city()} center
• Walking distance to ${faker.company.name()} Park
• Near ${faker.company.name()} Shopping Center
• Easy access to major highways

${faker.lorem.paragraph(1)}
  `.trim();

  return description;
};

const generatePropertyName = (style, type) => {
  const patterns = [
    `The ${faker.word.adjective()} ${style}`,
    `${faker.location.street()} ${style} ${type === 'sale' ? 'Estate' : 'Residence'}`,
    `${style} on ${faker.location.street()}`,
    `${faker.word.adjective({ length: { min: 5, max: 8 } })} ${style} Living`,
    `The ${style} at ${faker.location.street()}`,
  ];
  return patterns[Math.floor(Math.random() * patterns.length)];
};

const generatePrice = (type, bedrooms, isLuxury) => {
  const basePrice = type === 'sale'
    ? faker.number.int({ min: 200000, max: 2000000 })
    : faker.number.int({ min: 1000, max: 8000 });

  let finalPrice = basePrice;
  finalPrice += (bedrooms - 2) * (type === 'sale' ? 100000 : 500);
  if (isLuxury) finalPrice *= 1.5;
  return Math.round(finalPrice / 1000) * 1000;
};

// Main seeding function
export const seedDatabase = async () => {
  try {
    // await mongoose.connect(process.env.MONGO_URI);
    // console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Listing.deleteMany({});

    // Create users with retry mechanism
    const users = [];
    const numUsers = 50;
    const usedUsernames = new Set();
    const usedEmails = new Set();

    console.log('Creating users...');
    for (let i = 0; i < numUsers; i++) {
      let retries = 0;
      let user = null;
      
      while (!user && retries < 3) {
        try {
          const firstName = faker.person.firstName();
          const lastName = faker.person.lastName();
          
          let username = generateUniqueUsername(firstName, lastName);
          let email = generateUniqueEmail(firstName, lastName);
          
          while (usedUsernames.has(username)) {
            username = generateUniqueUsername(firstName, lastName);
          }
          while (usedEmails.has(email)) {
            email = generateUniqueEmail(firstName, lastName);
          }
          
          usedUsernames.add(username);
          usedEmails.add(email);
          
          user = new User({
            username,
            email,
            password: bcryptjs.hashSync('password123', 10),
            avatar: faker.image.avatar()
          });

          const savedUser = await user.save();
          users.push(savedUser);
          
          if (i % 10 === 0) {
            console.log(`Created ${i} users...`);
          }
        } catch (error) {
          retries++;
          if (retries === 3) {
            throw new Error(`Failed to create user after ${retries} attempts`);
          }
        }
      }
    }

    // Create listings with improved error handling
    const listings = [];
    const numListings = 200;

    console.log('Creating listings...');
    for (let i = 0; i < numListings; i++) {
      try {
        const type = Math.random() > 0.6 ? 'sale' : 'rent';
        const style = propertyStyles[Math.floor(Math.random() * propertyStyles.length)];
        const bedrooms = faker.number.int({ min: 1, max: 6 });
        const bathrooms = Math.max(1, Math.round(bedrooms * 0.7));
        const isLuxury = Math.random() > 0.8;
        
        const numAmenities = faker.number.int({ min: 4, max: 8 });
        const selectedAmenities = faker.helpers.arrayElements(amenities, numAmenities);
        
        const regularPrice = generatePrice(type, bedrooms, isLuxury);
        const hasDiscount = Math.random() > 0.7;
        const discountPrice = hasDiscount 
          ? Math.round(regularPrice * faker.number.float({ min: 0.85, max: 0.95 }) / 1000) * 1000
          : regularPrice;

        const listing = new Listing({
          name: generatePropertyName(style, type),
          description: generatePropertyDescription(bedrooms, style, selectedAmenities),
          address: `${faker.location.buildingNumber()} ${faker.location.street()}, ${faker.location.city()}, ${faker.location.state()} ${faker.location.zipCode()}`,
          regularPrice,
          discountPrice,
          bathrooms,
          bedrooms,
          furnished: Math.random() > 0.5,
          parking: Math.random() > 0.3,
          type,
          offer: hasDiscount,
          imageUrls: [
            faker.image.urlLoremFlickr({ category: 'house' }),
            faker.image.urlLoremFlickr({ category: 'interior' }),
            faker.image.urlLoremFlickr({ category: 'kitchen' }),
            faker.image.urlLoremFlickr({ category: 'bedroom' }),
            isLuxury ? faker.image.urlLoremFlickr({ category: 'pool' }) : null,
          ].filter(Boolean),
          userRef: users[Math.floor(Math.random() * users.length)]._id
        });

        const savedListing = await listing.save();
        listings.push(savedListing);
        
        if (i % 20 === 0) {
          console.log(`Created ${i} listings...`);
        }
      } catch (error) {
        console.error(`Error creating listing ${i}:`, error.message);
        continue;
      }
    }

    // Generate statistics
    const saleListings = listings.filter(l => l.type === 'sale');
    const rentListings = listings.filter(l => l.type === 'rent');
    
    console.log('\nSeeding Summary:');
    console.log(`✓ Created ${users.length} users`);
    console.log(`✓ Created ${listings.length} listings`);
    
    console.log('\nQuick Statistics:');
    console.log(`• Average sale price: $${Math.round(saleListings.reduce((acc, curr) => acc + curr.regularPrice, 0) / saleListings.length).toLocaleString()}`);
    console.log(`• Average rent price: $${Math.round(rentListings.reduce((acc, curr) => acc + curr.regularPrice, 0) / rentListings.length).toLocaleString()}`);
    console.log(`• Properties with offers: ${listings.filter(l => l.offer).length}`);
    console.log(`• Furnished properties: ${listings.filter(l => l.furnished).length}`);
    console.log(`• Properties with parking: ${listings.filter(l => l.parking).length}\n`);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');

  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};