// Populate comprehensive test stations for RADIOWALK testing
import { PrismaClient, StationType } from '@prisma/client';

const db = new PrismaClient();

async function populateTestStations() {
  console.log('🏗️  Populating comprehensive RADIOWALK test stations...\n');

  try {
    // 1. Create users
    console.log('👥 Creating test users...');
    
    // Use the real user ID from Google sign-in
    const testUser = await db.user.findUnique({
      where: { id: 'cmdk5d2y800006ip6i4n94vo2' },
    });

    if (!testUser) {
      throw new Error('Real user not found. Please sign in with Google first.');
    }

    const otherUser = await db.user.upsert({
      where: { username: 'otheruser' },
      update: {},
      create: {
        username: 'otheruser', 
        email: 'other@example.com',
        emailVerified: new Date(),
      },
    });

    console.log(`   ✅ Real user (Jane): ${testUser.id}`);
    console.log(`   ✅ otheruser: ${otherUser.id}`);

    // 2. Clear existing stations
    console.log('\n🧹 Clearing existing stations...');
    await db.station.deleteMany({});
    console.log('   ✅ Cleared');

    // 3. Create comprehensive test matrix
    console.log('\n🏗️  Creating test stations...');

    const stations = [
      // PUBLIC STATIONS - In Range (should always show)
      {
        name: 'SF Downtown Public',
        latitude: 37.7849, longitude: -122.4194, // ~1km
        type: StationType.PUBLIC,
        streamName: 'Downtown FM',
        tags: 'public downtown close',
        likes: 25,
        ownerId: testUser.id,
      },
      {
        name: 'SF Mission Public', 
        latitude: 37.7549, longitude: -122.4194, // ~2km
        type: StationType.PUBLIC,
        streamName: 'Mission Beat',
        tags: 'public mission medium',
        likes: 18,
        ownerId: testUser.id,
      },
      {
        name: 'SF Sunset Public',
        latitude: 37.7749, longitude: -122.4594, // ~3km
        type: StationType.PUBLIC, 
        streamName: 'Sunset Radio',
        tags: 'public sunset far',
        likes: 12,
        ownerId: otherUser.id,
      },
      {
        name: 'SF Edge Public',
        latitude: 37.7749, longitude: -122.4644, // ~4.5km
        type: StationType.PUBLIC,
        streamName: 'Edge FM',
        tags: 'public edge boundary',
        likes: 8,
        ownerId: otherUser.id,
      },

      // PUBLIC STATIONS - Out of Range (should never show)
      {
        name: 'Oakland Public',
        latitude: 37.7749, longitude: -122.3394, // ~8km
        type: StationType.PUBLIC,
        streamName: 'Oakland Radio',
        tags: 'public oakland outofrange',
        likes: 30,
        ownerId: testUser.id,
      },

      // PRIVATE STATIONS - In Range, Owned by testuser
      {
        name: 'My Private Close',
        latitude: 37.7849, longitude: -122.4094, // ~1km
        type: StationType.PRIVATE,
        streamName: 'Personal Close',
        tags: 'private owned close',
        likes: 5,
        ownerId: testUser.id,
      },
      {
        name: 'My Private Far',
        latitude: 37.7349, longitude: -122.4194, // ~4km
        type: StationType.PRIVATE,
        streamName: 'Personal Far',
        tags: 'private owned far',
        likes: 3,
        ownerId: testUser.id,
      },

      // PRIVATE STATIONS - In Range, Owned by otheruser, will be shared with testuser
      {
        name: 'Shared Private Medium',
        latitude: 37.7949, longitude: -122.4194, // ~2km
        type: StationType.PRIVATE,
        streamName: 'Shared Medium',
        tags: 'private shared medium',
        likes: 7,
        ownerId: otherUser.id,
      },
      {
        name: 'Shared Private Edge',
        latitude: 37.7749, longitude: -122.4744, // ~5km (edge case)
        type: StationType.PRIVATE,
        streamName: 'Shared Edge',
        tags: 'private shared edge',
        likes: 2,
        ownerId: otherUser.id,
      },

      // PRIVATE STATIONS - In Range, Owned by otheruser, NOT shared (should NEVER show)
      {
        name: 'Not Accessible Private',
        latitude: 37.7649, longitude: -122.4094, // ~2km
        type: StationType.PRIVATE,
        streamName: 'No Access',
        tags: 'private notshared',
        likes: 15,
        ownerId: otherUser.id,
      },

      // PRIVATE STATIONS - Out of Range, Owned by testuser (should NEVER show due to distance)
      {
        name: 'My Private Out of Range',
        latitude: 37.8249, longitude: -122.4194, // ~6km
        type: StationType.PRIVATE,
        streamName: 'Personal Out',
        tags: 'private owned outofrange',
        likes: 1,
        ownerId: testUser.id,
      },
    ];

    // Create stations
    const createdStations = [];
    for (const stationData of stations) {
      const station = await db.station.create({
        data: stationData,
      });
      createdStations.push(station);
      
      const distance = calculateDistance(37.7749, -122.4194, station.latitude, station.longitude);
      const ownerName = station.ownerId === testUser.id ? 'testuser' : 'otheruser';
      console.log(`   ✅ ${station.name} (${station.type}) - ${distance.toFixed(1)}km - Owner: ${ownerName}`);
    }

    // 4. Add sharing relationships
    console.log('\n🤝 Setting up sharing relationships...');
    
    const sharedStations = createdStations.filter(s => 
      s.name.includes('Shared') && s.ownerId === otherUser.id
    );

    for (const station of sharedStations) {
      await db.station.update({
        where: { id: station.id },
        data: {
          sharedUsers: {
            connect: { id: testUser.id },
          },
        },
      });
      console.log(`   ✅ Shared "${station.name}" with testuser`);
    }

    console.log('\n🎉 Test matrix created successfully!');
    console.log('\n📊 Expected results when logged in as testuser:');
    console.log('   PUBLIC mode: 4 stations (SF Downtown, Mission, Sunset, Edge)');
    console.log('   PRIVATE mode: 4 stations (My Private Close/Far, Shared Medium/Edge)'); 
    console.log('   BOTH mode: 8 stations total');
    console.log('   Out of range: 2 stations hidden (Oakland, My Private Out of Range)');
    console.log('   Not accessible: 1 station hidden (Not Accessible Private)');

  } catch (error) {
    console.error('❌ Error creating test stations:', error);
  } finally {
    await db.$disconnect();
  }
}

// Utility function to calculate distance
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

populateTestStations(); 