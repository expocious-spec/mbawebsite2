// Diagnostic script to check HoopGrids puzzle status
const https = require('https');

const url = 'https://minecraftbasketball.com/api/minigames/hoopgrids/daily';

console.log('Checking current HoopGrids puzzle status...\n');

// Get current time in different timezones
const now = new Date();
console.log('=== CURRENT TIME ===');
console.log('UTC Time:', now.toISOString());
console.log('EST Time:', now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
console.log('Your Local Time:', now.toLocaleString());

// Calculate EST date using the CURRENT (potentially broken) method
const estDateBroken = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
const todayBroken = `${estDateBroken.getFullYear()}-${String(estDateBroken.getMonth() + 1).padStart(2, '0')}-${String(estDateBroken.getDate()).padStart(2, '0')}`;

// Calculate EST date using the CORRECT method
const formatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});
const parts = formatter.formatToParts(now);
const year = parts.find(p => p.type === 'year').value;
const month = parts.find(p => p.type === 'month').value;
const day = parts.find(p => p.type === 'day').value;
const todayCorrect = `${year}-${month}-${day}`;

console.log('\n=== EXPECTED PUZZLE DATE ===');
console.log('Current method calculates:', todayBroken);
console.log('Correct method calculates:', todayCorrect);
console.log('Match?', todayBroken === todayCorrect ? 'YES' : 'NO (BUG!)');

// Fetch current puzzle from API
console.log('\n=== FETCHING CURRENT PUZZLE FROM API ===');
https.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    try {
      const puzzle = JSON.parse(data);
      console.log('Puzzle ID:', puzzle.id);
      console.log('Puzzle Date:', puzzle.date);
      console.log('\n=== ANALYSIS ===');
      if (puzzle.date === todayCorrect) {
        console.log('✅ Puzzle date matches today (EST)');
      } else {
        console.log('❌ PROBLEM: Puzzle date does NOT match today!');
        console.log('   Expected:', todayCorrect);
        console.log('   Actual:', puzzle.date);
        console.log('   This means the puzzle has not been updated for today.');
      }
    } catch (error) {
      console.error('Error parsing response:', error.message);
      console.log('Raw response:', data);
    }
  });
}).on('error', (err) => {
  console.error('Error fetching puzzle:', err.message);
});
