-- Six roll numbers are stored with four leading spaces.
--
-- '    22R21A0504' never matches .eq("roll_number", "22R21A0504"), so these
-- students get "Invalid roll number" no matter what they type. Trimming the
-- login input cannot help - the stored value is the dirty one.
--
-- Check the SELECTs before running the UPDATE.

-- expect the 6 rolls 22R21A0504 / 0505 / 0532 / 0595 / 05D7 / 05K7
SELECT roll_number, '[' || roll_number || ']' AS shows_the_padding
FROM students25
WHERE roll_number <> btrim(roll_number);

-- expect zero rows: trimming must not collide with an existing clean row
SELECT s.roll_number
FROM students25 s
WHERE s.roll_number <> btrim(s.roll_number)
  AND EXISTS (SELECT 1 FROM students25 t WHERE t.roll_number = btrim(s.roll_number));

UPDATE students25
SET roll_number = btrim(roll_number)
WHERE roll_number <> btrim(roll_number);

-- Worth adding once the above is clean, so padding cannot come back with the
-- next roster import. Left commented out: it will reject a bad import
-- outright, which is the point, but run it when someone is watching the
-- import rather than the night before fee week.
--
--   ALTER TABLE students25
--     ADD CONSTRAINT roll_number_is_trimmed CHECK (roll_number = btrim(roll_number));

-- NOTE: the 253 PG students (M.Tech / MBA, the R21E rolls) with email = NULL
-- are deliberately left alone - out of scope. They cannot log in until an
-- email is on file, since the auth call needs one.
