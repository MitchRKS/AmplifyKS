// Test script for LegiScan API
const API_KEY = '18cf0e63a5cb8e7b5cd0e5102f664e2a';
const BASE_URL = 'https://api.legiscan.com';

async function testAPI() {
  console.log('Testing LegiScan API...\n');
  
  try {
    // Test 1: Get session list for Kansas
    console.log('Test 1: Fetching session list for Kansas...');
    const sessionUrl = `${BASE_URL}/?key=${API_KEY}&op=getSessionList&state=KS`;
    console.log('URL:', sessionUrl);
    
    const sessionResponse = await fetch(sessionUrl);
    const sessionData = await sessionResponse.json();
    
    console.log('Status:', sessionData.status);
    console.log('Sessions found:', sessionData.sessions?.length || 0);
    
    if (sessionData.sessions && sessionData.sessions.length > 0) {
      console.log('\nAvailable sessions:');
      sessionData.sessions.forEach(session => {
        console.log(`- ${session.session_name} (ID: ${session.session_id})`);
      });
      
      // Test 2: Get master list for most recent session
      const latestSession = sessionData.sessions[0];
      console.log(`\nTest 2: Fetching bills for session ${latestSession.session_name}...`);
      
      const billsUrl = `${BASE_URL}/?key=${API_KEY}&op=getMasterList&id=${latestSession.session_id}`;
      console.log('URL:', billsUrl);
      
      const billsResponse = await fetch(billsUrl);
      const billsData = await billsResponse.json();
      
      console.log('Status:', billsData.status);
      
      if (billsData.masterlist) {
        const bills = Object.values(billsData.masterlist);
        console.log('Bills found:', bills.length);
        
        if (bills.length > 0) {
          console.log('\nFirst 3 bills:');
          bills.slice(0, 3).forEach(bill => {
            console.log(`- ${bill.number}: ${bill.title}`);
          });
        }
      } else {
        console.log('No masterlist in response');
        console.log('Full response:', JSON.stringify(billsData, null, 2));
      }
    } else {
      console.log('No sessions found or error in response');
      console.log('Full response:', JSON.stringify(sessionData, null, 2));
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testAPI();
