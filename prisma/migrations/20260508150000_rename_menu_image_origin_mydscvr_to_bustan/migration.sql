-- Rename MenuItemImageOrigin enum value: 'mydscvr_ai' -> 'bustan_ai'
-- Required after the project rename from MyDscvr Eats to Bustan.
-- ALTER TYPE ... RENAME VALUE is non-blocking and updates existing rows in place.

ALTER TYPE "MenuItemImageOrigin" RENAME VALUE 'mydscvr_ai' TO 'bustan_ai';
