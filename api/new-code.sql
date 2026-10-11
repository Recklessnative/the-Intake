-- Create an unlock code. Edit the four values, then run this file.
-- runs      = extra runs each player gets when they enter the code
-- uses_left = how many different players can redeem it (1 for a personal code)
INSERT INTO intake_codes (code, runs, uses_left, note, created_at)
VALUES ('COFFEE-2026', 5, 1, 'Donation from ...', UNIX_TIMESTAMP());
