// Test script for actual tRPC station endpoints
import { createCaller } from './src/server/api/root.js';
import { db } from './src/server/db.js';

// Create a mock context (simulating a logged-in user)
async function createTestContext() {
  // Get the test user we created earlier
  const user = await db.user.findFirst({
    where: { username: 'testuser' }
  });
  
  if (!user) {
    throw new Error('No test user found. Run test-station-api.js first.');
  }

  return {
    db,
    session: {
      user: { id: user.id },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    },
    headers: new Headers()
  };
}

async function testTRPCEndpoints() {
  console.log('🔗 Testing actual tRPC station endpoints...\n');
  
  try {
    const ctx = await createTestContext();
    const caller = createCaller(ctx);
    
    // Test 1: station.getMany
    console.log('1️⃣ Testing station.getMany():');
    const allStations = await caller.station.getMany({ limit: 10 });
    console.log(`   ✅ Found ${allStations.length} stations via tRPC`);
    allStations.forEach(s => console.log(`   - ${s.name} (${s.type})`));
    
    // Test 2: station.getById
    console.log('\n2️⃣ Testing station.getById():');
    if (allStations.length > 0 && allStations[0]) {
      const station = await caller.station.getById({ id: allStations[0].id });
      console.log(`   ✅ Retrieved: ${station.name}`);
      console.log(`   - Type: ${station.type}`);
      console.log(`   - Owner: ${station.owner?.username || 'No owner'}`);
      console.log(`   - Location: ${station.latitude}, ${station.longitude}`);
    }
    
    // Test 3: station.findNearby
    console.log('\n3️⃣ Testing station.findNearby():');
    const nearby = await caller.station.findNearby({
      latitude: 37.7749,  // San Francisco
      longitude: -122.4194,
      radiusKm: 50
    });
    console.log(`   ✅ Found ${nearby.length} stations near SF`);
    nearby.forEach(s => console.log(`   - ${s.name} (${s.distance?.toFixed(1)}km away)`));
    
    // Test 4: station.getMyStations (authenticated)
    console.log('\n4️⃣ Testing station.getMyStations():');
    const myStations = await caller.station.getMyStations({ limit: 10 });
    console.log(`   ✅ User owns ${myStations.length} stations`);
    myStations.forEach(s => console.log(`   - ${s.name} (${s.type})`));
    
    // Test 5: station.create (authenticated)
    console.log('\n5️⃣ Testing station.create():');
    const newStation = await caller.station.create({
      name: 'Test Station via tRPC',
      latitude: 37.8044,
      longitude: -122.2711,
      type: 'PUBLIC',
      tags: 'test automated',
      streamName: 'Test Stream',
      likes: 0
    });
    console.log(`   ✅ Created new station: ${newStation.name}`);
    console.log(`   - ID: ${newStation.id}`);
         console.log(`   - Owner: ${newStation.owner?.username || 'No owner'}`);
    
    console.log('\n🎉 All tRPC endpoints working correctly!');
    
  } catch (error) {
    console.error('❌ tRPC test failed:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error('   Stack:', error.stack.split('\n')[1]);
    }
  } finally {
    await db.$disconnect();
  }
}

testTRPCEndpoints(); 