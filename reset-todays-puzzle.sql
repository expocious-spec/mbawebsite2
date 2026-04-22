-- Quick script to reset today's HoopGrids puzzle
-- Run this in Supabase SQL Editor to manually reset

-- Get today's date in EST
DO $$
DECLARE
  today_date DATE;
  puzzle_id_to_delete INTEGER;
BEGIN
  -- Calculate today in EST (adjust if needed based on your timezone)
  today_date := CURRENT_DATE;
  
  -- Get today's puzzle ID
  SELECT id INTO puzzle_id_to_delete
  FROM hoopgrid_puzzles
  WHERE puzzle_date = today_date;
  
  IF puzzle_id_to_delete IS NOT NULL THEN
    -- Delete all attempts for today
    DELETE FROM hoopgrid_attempts WHERE puzzle_id = puzzle_id_to_delete;
    RAISE NOTICE 'Deleted attempts for puzzle %', puzzle_id_to_delete;
    
    -- Delete all completions for today
    DELETE FROM hoopgrid_completions WHERE puzzle_id = puzzle_id_to_delete;
    RAISE NOTICE 'Deleted completions for puzzle %', puzzle_id_to_delete;
    
    -- Delete the puzzle itself
    DELETE FROM hoopgrid_puzzles WHERE id = puzzle_id_to_delete;
    RAISE NOTICE 'Deleted puzzle %', puzzle_id_to_delete;
    
    RAISE NOTICE 'Successfully reset todays puzzle!';
  ELSE
    RAISE NOTICE 'No puzzle found for today: %', today_date;
  END IF;
END $$;

-- A new puzzle will be automatically generated on next page load
