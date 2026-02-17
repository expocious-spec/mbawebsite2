-- Fix sflucx to have $0 coin worth as a rookie
UPDATE users 
SET coin_worth = 0 
WHERE minecraft_username = 'sflucx' 
  AND 'Rookie' = ANY(roles);

-- Verify the update
SELECT minecraft_username, username, coin_worth, roles 
FROM users 
WHERE minecraft_username = 'sflucx';
