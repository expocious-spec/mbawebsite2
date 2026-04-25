// Test the current (broken) EST date calculation
const now = new Date();

console.log('=== CURRENT BROKEN METHOD ===');
const estDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
const today = `${estDate.getFullYear()}-${String(estDate.getMonth() + 1).padStart(2, '0')}-${String(estDate.getDate()).padStart(2, '0')}`;

console.log('Current UTC time:', now.toISOString());
console.log('EST string from toLocaleString:', now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
console.log('Parsed back to Date:', estDate.toISOString());
console.log('Calculated "today":', today);

console.log('\n=== CORRECT METHOD ===');
// Correct way: Use Intl.DateTimeFormat to get date parts
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
const correctToday = `${year}-${month}-${day}`;

console.log('Correct EST date:', correctToday);

console.log('\n=== COMPARISON ===');
console.log('Broken method gives:', today);
console.log('Correct method gives:', correctToday);
console.log('Are they the same?', today === correctToday ? 'YES' : 'NO - THIS IS THE BUG!');
