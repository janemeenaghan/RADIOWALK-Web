// Simple test script for validateStream functionality
// Run with: node test-validate-stream.js

const testUrls = [
  // Real working streams from Radio Browser API (top voted)
  "https://mangoradio.stream.laut.fm/mangoradio", // MANGORADIO (Germany) - MP3 128k
  "http://onair.dancewave.online:8080/dance.mp3", // Dance Wave! (Hungary) - MP3 128k  
  "https://reyfm.stream37.radiohost.de/reyfm-original_mp3-192?upd-meta=0&upd-scheme=https&_art=dD0xNzUzNDk5Njc1JmQ9YjA3MzQyYzZiYjhkOWRjZmY2OWY", // REYFM - MP3 192k
  "http://stream-uk1.radioparadise.com/aac-320", // Radio Paradise - AAC 320k
  "https://icecast.walmradio.com:8443/classic", // Classic Vinyl HD - MP3 320k
  
  // Invalid URLs for testing error handling
  "https://invalid-stream-url-that-does-not-exist.com/stream",
  "https://google.com", // Valid URL but not a stream
  "not-a-url-at-all", // Invalid URL format
];

async function validateStream(url) {
  try {
    console.log(`\nTesting: ${url}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, { 
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': 'RadioWalk/1.0',
      },
    });

    clearTimeout(timeoutId);

    const contentType = response.headers.get('content-type') || '';
    const isAudioStream = contentType.includes('audio/') || 
                        contentType.includes('application/ogg') ||
                        contentType.includes('video/mp2t');

    const result = { 
      valid: response.ok,
      contentType,
      isAudioStream,
      status: response.status,
      statusText: response.statusText,
    };

    console.log(`✅ Result:`, result);
    return result;

  } catch (error) {
    const result = { 
      valid: false,
      contentType: null,
      isAudioStream: false,
      status: null,
      statusText: error.message,
    };
    console.log(`❌ Error:`, result);
    return result;
  }
}

async function runTests() {
  console.log("🧪 Testing validateStream function with real radio streams...\n");
  
  for (const url of testUrls) {
    await validateStream(url);
    // Small delay to be nice to servers
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log("\n✅ All tests completed!");
}

runTests().catch(console.error);