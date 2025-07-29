// Test script for the actual tRPC validateStream endpoint
// Run with: npx tsx test-trpc-validate-stream.js

import { createCaller } from './src/server/api/root.ts';

const testUrls = [
  // Real working streams from Radio Browser API (top voted)
  "https://mangoradio.stream.laut.fm/mangoradio", // MANGORADIO (Germany) - MP3 128k
  "http://onair.dancewave.online:8080/dance.mp3", // Dance Wave! (Hungary) - MP3 128k  
  "http://stream-uk1.radioparadise.com/aac-320", // Radio Paradise - AAC 320k
  "https://icecast.walmradio.com:8443/classic", // Classic Vinyl HD - MP3 320k
  
  // Invalid URLs for testing error handling
  "https://invalid-stream-url-that-does-not-exist.com/stream",
  "https://google.com", // Valid URL but not a stream
  "not-a-url-at-all", // Invalid URL format
];

async function testTrpcValidateStream() {
  console.log("🧪 Testing actual tRPC validateStream endpoint...\n");

  // Create a server-side tRPC caller with mock context
  const mockCtx = {
    db: null, // validateStream doesn't use database
    session: null, // public procedure
  };

  const caller = createCaller(mockCtx);

  for (const url of testUrls) {
    try {
      console.log(`\nTesting: ${url}`);
      
      // Call the actual tRPC endpoint
      const result = await caller.station.validateStream({ url });

      console.log(`✅ tRPC Result:`, result);

    } catch (error) {
      console.log(`❌ tRPC Error:`, {
        message: error.message,
        code: error.code || 'UNKNOWN',
        cause: error.cause?.message || 'None',
      });
    }

    // Small delay to be nice to servers
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log("\n✅ All tRPC tests completed!");
}

testTrpcValidateStream().catch(console.error);