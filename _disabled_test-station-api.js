// Simple test script for station API
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function addDummyData() {
  console.log('🔄 Adding dummy station data...');
  
  // Create a dummy user first
  const user = await db.user.create({
    data: {
      username: 'testuser',
      email: 'test@example.com',
      emailVerified: true,
    },
  });
  
  // Create dummy stations
  const stations = await Promise.all([
    db.station.create({
      data: {
        name: 'KQED San Francisco',
        latitude: 37.7749,
        longitude: -122.4194,
        type: 'PUBLIC',
        tags: 'news public radio',
        streamLink: 'https://stream.kqed.org/kqed',
        streamName: 'KQED 88.5 FM',
        favicon: 'https://kqed.org/favicon.ico',
        likes: 42,
        ownerId: user.id,
      },
    }),
    db.station.create({
      data: {
        name: 'Jazz Station NYC',
        latitude: 40.7128,
        longitude: -74.0060,
        type: 'PRIVATE',
        tags: 'jazz music smooth',
        streamLink: 'https://example.com/jazz-stream',
        streamName: 'NYC Jazz 24/7',
        likes: 18,
        ownerId: user.id,
      },
    }),
    db.station.create({
      data: {
        name: 'Berkeley Community Radio',
        latitude: 37.8715,
        longitude: -122.2730,
        type: 'PUBLIC',
        tags: 'community local berkeley',
        streamLink: 'https://example.com/berkeley-stream',
        streamName: 'Berkeley FM',
        likes: 7,
        ownerId: user.id,
      },
    }),
  ]);
  
  console.log('✅ Created dummy data:');
  console.log(`   User: ${user.username} (${user.id})`);
  console.log(`   Stations: ${stations.length} created`);
  return { user, stations };
}

async function testStationAPI() {
  try {
    console.log('\n🧪 Testing Station API...\n');
    
    // Test 1: Get all stations
    console.log('1️⃣ Testing getMany (all stations):');
    const allStations = await db.station.findMany({
      include: { owner: true, sharedUsers: true },
      orderBy: { createdAt: 'desc' },
    });
    console.log(`   Found ${allStations.length} stations`);
    allStations.forEach(s => console.log(`   - ${s.name} (${s.type}) at ${s.latitude}, ${s.longitude}`));
    
    // Test 2: Get station by ID
    console.log('\n2️⃣ Testing getById:');
    const firstStation = allStations[0];
    if (firstStation) {
      const station = await db.station.findUnique({
        where: { id: firstStation.id },
        include: { owner: true, sharedUsers: true },
      });
      if (station) {
        console.log(`   Station: ${station.name}`);
        console.log(`   Owner: ${station.owner?.username}`);
        console.log(`   Type: ${station.type}`);
        console.log(`   Shared with: ${station.sharedUsers.length} users`);
      } else {
        console.log(`   Station not found`);
      }
    }
    
    // Test 3: Find nearby stations (SF area)
    console.log('\n3️⃣ Testing findNearby (SF area, 50km radius):');
    const sfLat = 37.7749;
    const sfLng = -122.4194;
    const radiusDegrees = 50 / 111; // Rough conversion
    
    const nearbyStations = await db.station.findMany({
      where: {
        latitude: { gte: sfLat - radiusDegrees, lte: sfLat + radiusDegrees },
        longitude: { gte: sfLng - radiusDegrees, lte: sfLng + radiusDegrees },
      },
      include: { owner: true, sharedUsers: true },
    });
    
    console.log(`   Found ${nearbyStations.length} stations near SF`);
    nearbyStations.forEach(s => {
      const distance = Math.sqrt(
        Math.pow(s.latitude - sfLat, 2) + Math.pow(s.longitude - sfLng, 2)
      ) * 111; // Rough km calculation
      console.log(`   - ${s.name} (~${distance.toFixed(1)}km away)`);
    });
    
  } catch (error) {
    console.error('❌ Error testing API:', error);
  }
}

async function main() {
  try {
    // Check if data already exists
    const existingStations = await db.station.count();
    if (existingStations === 0) {
      await addDummyData();
    } else {
      console.log(`📊 Database already has ${existingStations} stations`);
    }
    
    await testStationAPI();
    
  } catch (error) {
    console.error('💥 Script failed:', error);
  } finally {
    await db.$disconnect();
  }
}

main(); 