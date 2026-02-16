/**
 * Test Script for Steam API Integration
 * 
 * Run with: npx tsx scripts/test-steam-api.ts
 * (Install tsx: npm install -D tsx)
 */

import { getSteamGameDetails, processSteamData, POPULAR_STEAM_GAMES } from '../lib/steam'

async function testSingleGame() {
  console.log('🧪 Testing single game fetch...\n')
  
  const appId = POPULAR_STEAM_GAMES.ELDEN_RING
  console.log(`Fetching Elden Ring (App ID: ${appId})...`)
  
  const data = await getSteamGameDetails(appId)
  
  if (data) {
    console.log('\n✅ Success!')
    console.log('Raw Data:', JSON.stringify(data, null, 2))
    
    const processed = processSteamData(data)
    console.log('\n📦 Processed Data:')
    console.log(JSON.stringify(processed, null, 2))
  } else {
    console.error('❌ Failed to fetch game data')
  }
}

async function testMultipleGames() {
  console.log('\n🧪 Testing multiple games fetch...\n')
  
  const gameIds = [
    POPULAR_STEAM_GAMES.ELDEN_RING,
    POPULAR_STEAM_GAMES.HOLLOW_KNIGHT,
    POPULAR_STEAM_GAMES.CELESTE,
  ]
  
  for (const appId of gameIds) {
    console.log(`\nFetching App ID: ${appId}...`)
    const data = await getSteamGameDetails(appId)
    
    if (data) {
      console.log(`✅ ${data.name}`)
      console.log(`   Price: ${data.price_overview ? `₩${data.price_overview.final}` : 'Free'}`)
      console.log(`   Discount: ${data.price_overview?.discount_percent || 0}%`)
    } else {
      console.log(`❌ Failed to fetch`)
    }
    
    // Wait 1.5 seconds between requests
    await new Promise(resolve => setTimeout(resolve, 1500))
  }
}

async function main() {
  console.log('🎮 Steam API Test Script\n')
  console.log('=' .repeat(50))
  
  try {
    // Test 1: Single game
    await testSingleGame()
    
    console.log('\n' + '='.repeat(50))
    
    // Test 2: Multiple games
    await testMultipleGames()
    
    console.log('\n' + '='.repeat(50))
    console.log('\n✅ All tests completed!\n')
    
  } catch (error) {
    console.error('\n❌ Test failed:', error)
    process.exit(1)
  }
}

// Run tests
main()
