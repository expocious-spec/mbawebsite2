/**
 * Manual Puzzle Reset Script
 * 
 * This script will:
 * 1. Delete today's puzzle and all related attempts/completions
 * 2. Force the API to generate a new puzzle for today
 * 
 * Prerequisites:
 * - You must have Supabase credentials in your .env file
 * - Or you can run this via the admin panel on your website
 */

const https = require('https');

// Method 1: Reset via SQL (paste this into Supabase SQL Editor)
const resetSQL = `
-- Quick script to reset today's HoopGrids puzzle
-- Run this in Supabase SQL Editor

DO $$
DECLARE
  puzzle_to_delete INTEGER;
  today_est DATE;
BEGIN
  -- Calculate today in EST properly
  today_est := CURRENT_DATE AT TIME ZONE 'America/New_York';
  
  RAISE NOTICE 'Resetting puzzle for date: %', today_est;
  
  -- Find any puzzle for today or yesterday that might be stuck
  FOR puzzle_to_delete IN 
    SELECT id FROM hoopgrid_puzzles 
    WHERE puzzle_date >= today_est - INTERVAL '1 day'
  LOOP
    -- Delete all attempts for this puzzle
    DELETE FROM hoopgrid_attempts WHERE puzzle_id = puzzle_to_delete;
    RAISE NOTICE 'Deleted attempts for puzzle %', puzzle_to_delete;
    
    -- Delete all completions for this puzzle
    DELETE FROM hoopgrid_completions WHERE puzzle_id = puzzle_to_delete;
    RAISE NOTICE 'Deleted completions for puzzle %', puzzle_to_delete;
    
    -- Delete the puzzle itself
    DELETE FROM hoopgrid_puzzles WHERE id = puzzle_to_delete;
    RAISE NOTICE 'Deleted puzzle %', puzzle_to_delete;
  END LOOP;
  
  RAISE NOTICE 'Successfully reset puzzle(s)! Visit the HoopGrids page to generate a new one.';
END $$;
`;

console.log('\\n=== OPTION 1: Reset via Supabase SQL Editor (RECOMMENDED) ===');
console.log('\\n1. Go to your Supabase project');
console.log('2. Open the SQL Editor');
console.log('3. Paste and run the following SQL:\\n');
console.log(resetSQL);

console.log('\n=== OPTION 2: Reset via Admin API ===');
console.log('\nIf you have admin access to https://minecraftbasketball.com/admin:');
console.log('1. Log in as admin');
console.log('2. Go to the Minigames Admin section');
console.log('3. Click "Reset Today\'s Puzzle"');
console.log('\nOR run the reset-puzzle.ps1 script from the project root');

console.log('\\n=== After Reset ===');
console.log('1. Visit https://minecraftbasketball.com/minigames/hoopgrids');
console.log('2. The page will automatically generate a new puzzle for today');
console.log('3. Everyone can play the new puzzle (previous completions are cleared)');
