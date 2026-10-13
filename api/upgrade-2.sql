-- Only if you ran schema.sql before the morning call existed: a morning call is a small run with its own call limit.
ALTER TABLE intake_runs ADD COLUMN cap INT NULL;
