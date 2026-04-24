-- Quick script to reset today's HoopGrids puzzle
-- Run this in Supabase SQL Editor to manually reset and fix stuck puzzles

DO $$
DECLARE
  puzzle_to_delete INTEGER;
  today_est DATE;
BEGIN
  -- Calculate today in EST (America/New_York timezone)
  -- This properly handles EST/EDT transitions
  today_est := (CURRENT_TIMESTAMP AT TIME ZONE 'America/New_York')::DATE;
  
  RAISE NOTICE 'Current EST date: %', today_est;
  RAISE NOTICE 'Resetting puzzle for today and yesterday (if stuck)...';
  
  -- Find any puzzles from today or yesterday that might be stuck
  FOR puzzle_to_delete IN 
    SELECT id FROM hoopgrid_puzzles 
    WHERE puzzle_date >= today_est - INTERVAL '1 day'
    ORDER BY puzzle_date DESC
  LOOP
    RAISE NOTICE 'Processing puzzle %', puzzle_to_delete;
    
    -- Delete all attempts for this puzzle
    DELETE FROM hoopgrid_attempts WHERE puzzle_id = puzzle_to_delete;
    RAISE NOTICE '  - Deleted attempts';
    
    -- Delete all completions for this puzzle (clears leaderboard)
    DELETE FROM hoopgrid_completions WHERE puzzle_id = puzzle_to_delete;
    RAISE NOTICE '  - Deleted completions';
    
    -- Delete the puzzle itself
    DELETE FROM hoopgrid_puzzles WHERE id = puzzle_to_delete;
    RAISE NOTICE '  - Deleted puzzle';
  END LOOP;
  
  RAISE NOTICE 'Successfully reset puzzle(s)!';
  RAISE NOTICE 'Visit the HoopGrids page - a new puzzle will be auto-generated for: %', today_est;
END $$;
