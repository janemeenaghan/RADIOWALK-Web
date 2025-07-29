-- Delete all stations except the 2 most recent ones
DELETE FROM "Station" 
WHERE id NOT IN (
  SELECT id FROM "Station" 
  ORDER BY "createdAt" DESC 
  LIMIT 2
);