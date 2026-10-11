-- Only if you ran schema.sql before this file existed: a week now counts once it was played.
ALTER TABLE intake_runs ADD COLUMN counted TINYINT NOT NULL DEFAULT 0;
UPDATE intake_runs SET counted = 1;
