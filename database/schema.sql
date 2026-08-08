CREATE DATABASE IF NOT EXISTS sport_tracker CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sport_tracker;

CREATE TABLE muscle_groups (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(120) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE exercises (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT NULL,
    primary_muscle_group_id INT UNSIGNED NULL,
    exercise_type VARCHAR(80) NULL,
    equipment VARCHAR(100) NULL,
    difficulty VARCHAR(50) NULL,
    instructions TEXT NULL,
    notes TEXT NULL,
    is_archived TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_exercise_primary_muscle FOREIGN KEY (primary_muscle_group_id) REFERENCES muscle_groups(id) ON DELETE SET NULL,
    INDEX idx_exercises_name (name),
    INDEX idx_exercises_archived (is_archived)
) ENGINE=InnoDB;

CREATE TABLE exercise_secondary_muscles (
    exercise_id INT UNSIGNED NOT NULL,
    muscle_group_id INT UNSIGNED NOT NULL,
    PRIMARY KEY (exercise_id, muscle_group_id),
    CONSTRAINT fk_secondary_exercise FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE,
    CONSTRAINT fk_secondary_muscle FOREIGN KEY (muscle_group_id) REFERENCES muscle_groups(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE workout_templates (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT NULL,
    color VARCHAR(20) NULL,
    estimated_duration SMALLINT UNSIGNED NULL,
    is_archived TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE workout_template_exercises (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    workout_template_id INT UNSIGNED NOT NULL,
    exercise_id INT UNSIGNED NOT NULL,
    position SMALLINT UNSIGNED NOT NULL DEFAULT 1,
    planned_sets SMALLINT UNSIGNED NULL,
    min_reps SMALLINT UNSIGNED NULL,
    max_reps SMALLINT UNSIGNED NULL,
    target_weight DECIMAL(7,2) NULL,
    rest_seconds SMALLINT UNSIGNED NULL,
    target_rir DECIMAL(3,1) NULL,
    target_rpe DECIMAL(3,1) NULL,
    tempo VARCHAR(30) NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_template_exercise_template FOREIGN KEY (workout_template_id) REFERENCES workout_templates(id) ON DELETE CASCADE,
    CONSTRAINT fk_template_exercise_exercise FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE RESTRICT,
    INDEX idx_template_exercise_position (workout_template_id, position)
) ENGINE=InnoDB;

CREATE TABLE training_programs (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT NULL,
    started_at DATE NULL,
    ended_at DATE NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 0,
    is_archived TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE weekly_schedule_days (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    training_program_id INT UNSIGNED NOT NULL,
    day_of_week TINYINT UNSIGNED NOT NULL,
    label VARCHAR(100) NULL,
    is_rest_day TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_schedule_day_program FOREIGN KEY (training_program_id) REFERENCES training_programs(id) ON DELETE CASCADE,
    UNIQUE KEY uq_program_day (training_program_id, day_of_week)
) ENGINE=InnoDB;

CREATE TABLE weekly_schedule_options (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    weekly_schedule_day_id INT UNSIGNED NOT NULL,
    workout_template_id INT UNSIGNED NOT NULL,
    label VARCHAR(100) NULL,
    position SMALLINT UNSIGNED NOT NULL DEFAULT 1,
    is_default TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_schedule_option_day FOREIGN KEY (weekly_schedule_day_id) REFERENCES weekly_schedule_days(id) ON DELETE CASCADE,
    CONSTRAINT fk_schedule_option_template FOREIGN KEY (workout_template_id) REFERENCES workout_templates(id) ON DELETE RESTRICT,
    UNIQUE KEY uq_day_template (weekly_schedule_day_id, workout_template_id)
) ENGINE=InnoDB;

CREATE TABLE workout_sessions (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    workout_template_id INT UNSIGNED NULL,
    training_program_id INT UNSIGNED NULL,
    template_name_snapshot VARCHAR(150) NULL,
    scheduled_date DATE NULL,
    started_at DATETIME NOT NULL,
    ended_at DATETIME NULL,
    status ENUM('in_progress','completed','abandoned') NOT NULL DEFAULT 'in_progress',
    duration_seconds INT UNSIGNED NULL,
    notes TEXT NULL,
    energy_level TINYINT UNSIGNED NULL,
    fatigue_level TINYINT UNSIGNED NULL,
    motivation_level TINYINT UNSIGNED NULL,
    pain_level TINYINT UNSIGNED NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_session_template FOREIGN KEY (workout_template_id) REFERENCES workout_templates(id) ON DELETE SET NULL,
    CONSTRAINT fk_session_program FOREIGN KEY (training_program_id) REFERENCES training_programs(id) ON DELETE SET NULL,
    INDEX idx_sessions_date (scheduled_date),
    INDEX idx_sessions_status (status)
) ENGINE=InnoDB;

CREATE TABLE workout_session_exercises (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    workout_session_id INT UNSIGNED NOT NULL,
    exercise_id INT UNSIGNED NULL,
    exercise_name_snapshot VARCHAR(150) NOT NULL,
    position SMALLINT UNSIGNED NOT NULL DEFAULT 1,
    planned_sets_snapshot SMALLINT UNSIGNED NULL,
    min_reps_snapshot SMALLINT UNSIGNED NULL,
    max_reps_snapshot SMALLINT UNSIGNED NULL,
    target_weight_snapshot DECIMAL(7,2) NULL,
    rest_seconds_snapshot SMALLINT UNSIGNED NULL,
    notes TEXT NULL,
    is_skipped TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_session_exercise_session FOREIGN KEY (workout_session_id) REFERENCES workout_sessions(id) ON DELETE CASCADE,
    CONSTRAINT fk_session_exercise_exercise FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE SET NULL,
    INDEX idx_session_exercise_position (workout_session_id, position)
) ENGINE=InnoDB;

CREATE TABLE workout_sets (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    workout_session_exercise_id INT UNSIGNED NOT NULL,
    set_number SMALLINT UNSIGNED NOT NULL,
    set_type VARCHAR(30) NULL,
    weight DECIMAL(7,2) NULL,
    repetitions SMALLINT UNSIGNED NULL,
    duration_seconds INT UNSIGNED NULL,
    distance DECIMAL(8,2) NULL,
    rir DECIMAL(3,1) NULL,
    rpe DECIMAL(3,1) NULL,
    is_completed TINYINT(1) NOT NULL DEFAULT 1,
    notes TEXT NULL,
    completed_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_set_session_exercise FOREIGN KEY (workout_session_exercise_id) REFERENCES workout_session_exercises(id) ON DELETE CASCADE,
    INDEX idx_sets_exercise (workout_session_exercise_id, set_number)
) ENGINE=InnoDB;

CREATE TABLE weekly_day_statuses (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    training_program_id INT UNSIGNED NOT NULL,
    weekly_schedule_day_id INT UNSIGNED NULL,
    workout_session_id INT UNSIGNED NULL,
    selected_workout_template_id INT UNSIGNED NULL,
    scheduled_date DATE NOT NULL,
    status ENUM('completed','missed','skipped','replaced') NOT NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_day_status_program FOREIGN KEY (training_program_id) REFERENCES training_programs(id) ON DELETE CASCADE,
    CONSTRAINT fk_day_status_schedule_day FOREIGN KEY (weekly_schedule_day_id) REFERENCES weekly_schedule_days(id) ON DELETE SET NULL,
    CONSTRAINT fk_day_status_session FOREIGN KEY (workout_session_id) REFERENCES workout_sessions(id) ON DELETE SET NULL,
    CONSTRAINT fk_day_status_template FOREIGN KEY (selected_workout_template_id) REFERENCES workout_templates(id) ON DELETE SET NULL,
    UNIQUE KEY uq_program_scheduled_date (training_program_id, scheduled_date)
) ENGINE=InnoDB;

CREATE TABLE body_measurements (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    measured_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    weight DECIMAL(6,2) NULL,
    body_fat_percentage DECIMAL(5,2) NULL,
    chest DECIMAL(6,2) NULL,
    waist DECIMAL(6,2) NULL,
    arm_left DECIMAL(6,2) NULL,
    arm_right DECIMAL(6,2) NULL,
    thigh_left DECIMAL(6,2) NULL,
    thigh_right DECIMAL(6,2) NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE daily_recovery_logs (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    log_date DATE NOT NULL,
    sleep_hours DECIMAL(4,2) NULL,
    sleep_quality TINYINT UNSIGNED NULL,
    fatigue_level TINYINT UNSIGNED NULL,
    stress_level TINYINT UNSIGNED NULL,
    motivation_level TINYINT UNSIGNED NULL,
    energy_level TINYINT UNSIGNED NULL,
    soreness_level TINYINT UNSIGNED NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_recovery_date (log_date)
) ENGINE=InnoDB;

INSERT INTO muscle_groups (name, slug) VALUES
('Pectoraux','pectoraux'),('Dos','dos'),('Épaules','epaules'),('Biceps','biceps'),('Triceps','triceps'),
('Quadriceps','quadriceps'),('Ischio-jambiers','ischio-jambiers'),('Fessiers','fessiers'),('Mollets','mollets'),('Abdominaux','abdominaux');

INSERT INTO exercises (name, primary_muscle_group_id, exercise_type, equipment) VALUES
('Développé couché', 1, 'Polyarticulaire', 'Barre'),
('Développé incliné haltères', 1, 'Polyarticulaire', 'Haltères'),
('Élévations latérales', 3, 'Isolation', 'Haltères'),
('Extension triceps à la poulie', 5, 'Isolation', 'Poulie'),
('Tractions', 2, 'Polyarticulaire', 'Poids du corps'),
('Rowing barre', 2, 'Polyarticulaire', 'Barre'),
('Curl incliné', 4, 'Isolation', 'Haltères'),
('Squat', 6, 'Polyarticulaire', 'Barre'),
('Soulevé de terre roumain', 7, 'Polyarticulaire', 'Barre'),
('Mollets debout', 9, 'Isolation', 'Machine');
