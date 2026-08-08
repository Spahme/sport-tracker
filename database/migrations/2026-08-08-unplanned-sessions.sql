USE sport_tracker;

ALTER TABLE workout_sessions
    ADD COLUMN is_unplanned TINYINT(1) NOT NULL DEFAULT 0 AFTER pain_level;
