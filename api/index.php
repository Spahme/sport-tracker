<?php

declare(strict_types=1);

ini_set('display_errors', '1');
ini_set('display_startup_errors', '1');
error_reporting(E_ALL);

require __DIR__.'/db.php';
$config = require __DIR__.'/config.php';

if (($config['cors']['enabled'] ?? false) === true) {
    header('Access-Control-Allow-Origin: '.($config['cors']['allow_origin'] ?? '*'));
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}
header('Content-Type: application/json; charset=utf-8');

function json_ok(mixed $data, int $code = 200): never
{
    http_response_code($code);
    echo json_encode(['ok' => true, 'data' => $data], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
function json_err(string $message, int $code = 400, mixed $details = null): never
{
    http_response_code($code);
    $p = ['ok' => false, 'error' => ['message' => $message]];
    if ($details !== null) {
        $p['error']['details'] = $details;
    } echo json_encode($p, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
function read_json(): array
{
    $raw = file_get_contents('php://input') ?: '';
    if ($raw === '') {
        return [];
    } $d = json_decode($raw, true);
    if (!is_array($d)) {
        json_err('JSON invalide', 400);
    }

    return $d;
}
function req_str(mixed $v, string $f, int $max = 150): string
{
    if (!is_string($v) || trim($v) === '') {
        json_err("Champ '$f' requis", 422);
    } $s = trim($v);
    if (mb_strlen($s) > $max) {
        json_err("Champ '$f' trop long", 422);
    }

    return $s;
}
function null_str(mixed $v, int $max = 65535): ?string
{
    if ($v === null || !is_string($v) || trim($v) === '') {
        return null;
    }

    return mb_substr(trim($v), 0, $max);
}
function null_int(mixed $v): ?int
{
    return ($v === null || $v === '') ? null : (is_numeric($v) ? (int) $v : json_err('Nombre entier invalide', 422));
}
function null_float(mixed $v): ?float
{
    return ($v === null || $v === '') ? null : (is_numeric($v) ? (float) $v : json_err('Nombre invalide', 422));
}
function bool_val(mixed $v): int
{
    return filter_var($v, FILTER_VALIDATE_BOOL) ? 1 : 0;
}
function exists(PDO $pdo, string $table, int $id): void
{
    $s = $pdo->prepare("SELECT id FROM $table WHERE id=:id");
    $s->execute([':id' => $id]);
    if (!$s->fetch()) {
        json_err('Ressource introuvable', 404);
    }
}
function weekday_name(int $n): string
{
    return ['', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'][$n] ?? '';
}
function iso_week_bounds(?string $date = null): array
{
    $d = new DateTimeImmutable($date ?: 'today');
    $m = $d->modify('monday this week');

    return [$m, $m->modify('+6 days')];
}

function sync_missed_training_days(PDO $pdo, array $program): void
{
    $start = new DateTimeImmutable($program['started_at'] ?: 'today');
    $today = new DateTimeImmutable('today');
    $end = $today->modify('-1 day');

    if (!empty($program['ended_at'])) {
        $programEnd = new DateTimeImmutable($program['ended_at']);
        if ($programEnd < $end) {
            $end = $programEnd;
        }
    }
    if ($start > $end) {
        return;
    }

    $schedule = $pdo->prepare("SELECT d.id,d.day_of_week FROM weekly_schedule_days d WHERE d.training_program_id=:p AND d.is_rest_day=0 AND EXISTS(SELECT 1 FROM weekly_schedule_options o WHERE o.weekly_schedule_day_id=d.id)");
    $schedule->execute([':p' => $program['id']]);
    $byWeekday = [];
    foreach ($schedule->fetchAll() as $day) {
        $byWeekday[(int) $day['day_of_week']] = (int) $day['id'];
    }
    if (!$byWeekday) {
        return;
    }

    $insert = $pdo->prepare("INSERT IGNORE INTO weekly_day_statuses(training_program_id,weekly_schedule_day_id,scheduled_date,status) VALUES(:p,:day,:date,'missed')");
    for ($date = $start; $date <= $end; $date = $date->modify('+1 day')) {
        $weekday = (int) $date->format('N');
        if (isset($byWeekday[$weekday])) {
            $insert->execute([':p' => $program['id'], ':day' => $byWeekday[$weekday], ':date' => $date->format('Y-m-d')]);
        }
    }
}

function ensure_unplanned_sessions_schema(PDO $pdo): void
{
    $columnExists = static function () use ($pdo): bool {
        return (bool) $pdo
            ->query("SHOW COLUMNS FROM workout_sessions LIKE 'is_unplanned'")
            ->fetch();
    };

    if ($columnExists()) {
        return;
    }

    try {
        $pdo->exec("ALTER TABLE workout_sessions ADD COLUMN is_unplanned TINYINT(1) NOT NULL DEFAULT 0 AFTER pain_level");
    } catch (Throwable $e) {
        // Une autre requête a pu terminer la migration entre les deux contrôles.
        if ($columnExists()) {
            return;
        }

        json_err(
            'Mise à jour de la base nécessaire. Importe database/migrations/2026-08-08-unplanned-sessions.sql dans phpMyAdmin OVH.',
            503
        );
    }
}

try {
    $pdo = db();
} catch (Throwable $e) {
    json_err('Erreur DB (connexion)', 500, $e->getMessage());
}

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$scriptDir = rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? ''), '/');
$path = ($scriptDir !== '' && str_starts_with($uri, $scriptDir)) ? substr($uri, strlen($scriptDir)) : $uri;
$parts = array_values(array_filter(explode('/', trim($path, '/'))));
$r = $parts[0] ?? '';
$id = (isset($parts[1]) && ctype_digit($parts[1])) ? (int) $parts[1] : null;
$sub = $parts[2] ?? null;
$subId = (isset($parts[3]) && ctype_digit($parts[3])) ? (int) $parts[3] : null;

if ($r === '') {
    json_ok(['name' => 'Sport Tracker API', 'version' => '1.0.0']);
}

if ($r === 'muscle-groups') {
    if ($method === 'GET') {
        json_ok($pdo->query('SELECT * FROM muscle_groups ORDER BY name')->fetchAll());
    }
    $in = read_json();
    if ($method === 'POST') {
        $name = req_str($in['name'] ?? null, 'name', 100);
        $slug = strtolower(trim(preg_replace('/[^a-z0-9]+/i', '-', iconv('UTF-8', 'ASCII//TRANSLIT', $name) ?: $name), '-'));
        $s = $pdo->prepare('INSERT INTO muscle_groups(name,slug) VALUES(:n,:s)');
        $s->execute([':n' => $name, ':s' => $slug]);
        json_ok(['id' => (int) $pdo->lastInsertId()], 201);
    }
    if ($method === 'DELETE' && $id) {
        $s = $pdo->prepare('DELETE FROM muscle_groups WHERE id=:id');
        $s->execute([':id' => $id]);
        json_ok(['id' => $id]);
    }
    json_err('Route non trouvée', 404);
}

if ($r === 'exercises') {
    if ($method === 'GET' && $id === null) {
        $q = trim($_GET['q'] ?? '');
        $arch = isset($_GET['archived']) ? (int) $_GET['archived'] : 0;
        $sql = 'SELECT e.*,mg.name primary_muscle_group FROM exercises e LEFT JOIN muscle_groups mg ON mg.id=e.primary_muscle_group_id WHERE e.is_archived=:a';
        $p = [':a' => $arch];
        if ($q !== '') {
            $sql .= ' AND e.name LIKE :q';
            $p[':q'] = "%$q%";
        } $sql .= ' ORDER BY e.name';
        $s = $pdo->prepare($sql);
        $s->execute($p);
        json_ok($s->fetchAll());
    }
    if ($method === 'GET' && $id && $sub === null) {
        $s = $pdo->prepare('SELECT e.*,mg.name primary_muscle_group FROM exercises e LEFT JOIN muscle_groups mg ON mg.id=e.primary_muscle_group_id WHERE e.id=:id');
        $s->execute([':id' => $id]);
        $row = $s->fetch();
        if (!$row) {
            json_err('Exercice introuvable', 404);
        }json_ok($row);
    }
    if ($method === 'GET' && $id && $sub === 'records') {
        exists($pdo, 'exercises', $id);
        $base = "FROM workout_sets ws JOIN workout_session_exercises wse ON wse.id=ws.workout_session_exercise_id JOIN workout_sessions s ON s.id=wse.workout_session_id WHERE wse.exercise_id=:id AND ws.is_completed=1 AND s.status='completed'";
        $queries = [
            'max_weight' => "SELECT ws.weight,ws.repetitions,s.scheduled_date $base AND ws.weight IS NOT NULL ORDER BY ws.weight DESC,ws.repetitions DESC LIMIT 1",
            'max_repetitions' => "SELECT ws.weight,ws.repetitions,s.scheduled_date $base AND ws.repetitions IS NOT NULL ORDER BY ws.repetitions DESC,ws.weight DESC LIMIT 1",
            'best_set_volume' => "SELECT ws.weight,ws.repetitions,(ws.weight*ws.repetitions) value,s.scheduled_date $base AND ws.weight IS NOT NULL AND ws.repetitions IS NOT NULL ORDER BY value DESC LIMIT 1",
            'best_estimated_one_rep_max' => "SELECT ws.weight,ws.repetitions,(ws.weight*(1+ws.repetitions/30)) value,s.scheduled_date $base AND ws.weight IS NOT NULL AND ws.repetitions BETWEEN 1 AND 15 ORDER BY value DESC LIMIT 1",
        ];
        $out = [];
        foreach ($queries as $k => $sql) {
            $s = $pdo->prepare($sql);
            $s->execute([':id' => $id]);
            $out[$k] = $s->fetch() ?: null;
        } json_ok(['exercise_id' => $id, 'records' => $out]);
    }
    if ($method === 'GET' && $id && $sub === 'history') {
        exists($pdo, 'exercises', $id);
        $s = $pdo->prepare("SELECT s.id session_id,s.scheduled_date,s.started_at,s.template_name_snapshot,ws.id set_id,ws.set_number,ws.weight,ws.repetitions,ws.rir,ws.rpe,ws.completed_at FROM workout_sets ws JOIN workout_session_exercises wse ON wse.id=ws.workout_session_exercise_id JOIN workout_sessions s ON s.id=wse.workout_session_id WHERE wse.exercise_id=:id AND ws.is_completed=1 AND s.status='completed' ORDER BY COALESCE(s.scheduled_date,DATE(s.started_at)) DESC,s.started_at DESC,ws.set_number ASC LIMIT 500");
        $s->execute([':id' => $id]);
        json_ok($s->fetchAll());
    }
    $in = read_json();
    if ($method === 'POST' && $id === null) {
        $s = $pdo->prepare('INSERT INTO exercises(name,description,primary_muscle_group_id,exercise_type,equipment,difficulty,instructions,notes) VALUES(:n,:d,:m,:t,:e,:df,:i,:no)');
        $s->execute([':n' => req_str($in['name'] ?? null, 'name'), ':d' => null_str($in['description'] ?? null), ':m' => null_int($in['primary_muscle_group_id'] ?? null), ':t' => null_str($in['exercise_type'] ?? null, 80), ':e' => null_str($in['equipment'] ?? null, 100), ':df' => null_str($in['difficulty'] ?? null, 50), ':i' => null_str($in['instructions'] ?? null), ':no' => null_str($in['notes'] ?? null)]);
        json_ok(['id' => (int) $pdo->lastInsertId()], 201);
    }
    if (($method === 'PUT' || $method === 'PATCH') && $id && $sub === null) {
        exists($pdo, 'exercises', $id);
        $s = $pdo->prepare('UPDATE exercises SET name=:n,description=:d,primary_muscle_group_id=:m,exercise_type=:t,equipment=:e,difficulty=:df,instructions=:i,notes=:no WHERE id=:id');
        $s->execute([':id' => $id, ':n' => req_str($in['name'] ?? null, 'name'), ':d' => null_str($in['description'] ?? null), ':m' => null_int($in['primary_muscle_group_id'] ?? null), ':t' => null_str($in['exercise_type'] ?? null, 80), ':e' => null_str($in['equipment'] ?? null, 100), ':df' => null_str($in['difficulty'] ?? null, 50), ':i' => null_str($in['instructions'] ?? null), ':no' => null_str($in['notes'] ?? null)]);
        json_ok(['id' => $id]);
    }
    if ($method === 'PATCH' && $id && $sub === 'archive') {
        $s = $pdo->prepare('UPDATE exercises SET is_archived=1-is_archived WHERE id=:id');
        $s->execute([':id' => $id]);
        json_ok(['id' => $id]);
    }
    if ($method === 'DELETE' && $id) {
        $s = $pdo->prepare('UPDATE exercises SET is_archived=1 WHERE id=:id');
        $s->execute([':id' => $id]);
        json_ok(['id' => $id]);
    }
    json_err('Route exercises non trouvée', 404);
}

if ($r === 'workout-templates') {
    if ($method === 'GET' && $id === null) {
        $s = $pdo->query('SELECT wt.*,COUNT(wte.id) exercise_count FROM workout_templates wt LEFT JOIN workout_template_exercises wte ON wte.workout_template_id=wt.id WHERE wt.is_archived=0 GROUP BY wt.id ORDER BY wt.name');
        json_ok($s->fetchAll());
    }
    if ($method === 'GET' && $id) {
        $s = $pdo->prepare('SELECT * FROM workout_templates WHERE id=:id');
        $s->execute([':id' => $id]);
        $t = $s->fetch();
        if (!$t) {
            json_err('Séance introuvable', 404);
        }$s = $pdo->prepare('SELECT wte.*,e.name exercise_name FROM workout_template_exercises wte JOIN exercises e ON e.id=wte.exercise_id WHERE wte.workout_template_id=:id ORDER BY wte.position');
        $s->execute([':id' => $id]);
        $t['exercises'] = $s->fetchAll();
        json_ok($t);
    }
    $in = read_json();
    if ($method === 'POST' && $id === null) {
        $s = $pdo->prepare('INSERT INTO workout_templates(name,description,color,estimated_duration) VALUES(:n,:d,:c,:e)');
        $s->execute([':n' => req_str($in['name'] ?? null, 'name'), ':d' => null_str($in['description'] ?? null), ':c' => null_str($in['color'] ?? null, 20), ':e' => null_int($in['estimated_duration'] ?? null)]);
        json_ok(['id' => (int) $pdo->lastInsertId()], 201);
    }
    if ($method === 'PUT' && $id && $sub === null) {
        exists($pdo, 'workout_templates', $id);
        $s = $pdo->prepare('UPDATE workout_templates SET name=:n,description=:d,color=:c,estimated_duration=:e WHERE id=:id');
        $s->execute([':id' => $id, ':n' => req_str($in['name'] ?? null, 'name'), ':d' => null_str($in['description'] ?? null), ':c' => null_str($in['color'] ?? null, 20), ':e' => null_int($in['estimated_duration'] ?? null)]);
        json_ok(['id' => $id]);
    }
    if ($method === 'PUT' && $id && $sub === 'exercises') {
        exists($pdo, 'workout_templates', $id);
        $items = $in['exercises'] ?? [];
        if (!is_array($items)) {
            json_err('exercises invalide', 422);
        }$pdo->beginTransaction();
        try {
            $pdo->prepare('DELETE FROM workout_template_exercises WHERE workout_template_id=:id')->execute([':id' => $id]);
            $s = $pdo->prepare('INSERT INTO workout_template_exercises(workout_template_id,exercise_id,position,planned_sets,min_reps,max_reps,target_weight,rest_seconds,target_rir,target_rpe,tempo,notes) VALUES(:w,:e,:p,:ps,:min,:max,:tw,:rs,:rir,:rpe,:te,:n)');
            foreach ($items as $i => $x) {
                $s->execute([':w' => $id, ':e' => (int) $x['exercise_id'], ':p' => (int) ($x['position'] ?? $i + 1), ':ps' => null_int($x['planned_sets'] ?? null), ':min' => null_int($x['min_reps'] ?? null), ':max' => null_int($x['max_reps'] ?? null), ':tw' => null_float($x['target_weight'] ?? null), ':rs' => null_int($x['rest_seconds'] ?? null), ':rir' => null_float($x['target_rir'] ?? null), ':rpe' => null_float($x['target_rpe'] ?? null), ':te' => null_str($x['tempo'] ?? null, 30), ':n' => null_str($x['notes'] ?? null)]);
            } $pdo->commit();
            json_ok(['id' => $id]);
        } catch (Throwable $e) {
            $pdo->rollBack();
            json_err('Erreur mise à jour séance', 500, $e->getMessage());
        }
    }
    if ($method === 'DELETE' && $id) {
        $pdo->prepare('UPDATE workout_templates SET is_archived=1 WHERE id=:id')->execute([':id' => $id]);
        json_ok(['id' => $id]);
    }
    json_err('Route workout-templates non trouvée', 404);
}

if ($r === 'training-programs') {
    if ($method === 'GET' && $id === null) {
        json_ok($pdo->query('SELECT * FROM training_programs ORDER BY is_active DESC,created_at DESC')->fetchAll());
    }
    if ($method === 'GET' && $id && $sub === 'weekly-schedule') {
        exists($pdo, 'training_programs', $id);
        $s = $pdo->prepare('SELECT * FROM weekly_schedule_days WHERE training_program_id=:id ORDER BY day_of_week');
        $s->execute([':id' => $id]);
        $days = $s->fetchAll();
        $q = $pdo->prepare('SELECT wso.*,wt.name workout_name,wt.estimated_duration FROM weekly_schedule_options wso JOIN workout_templates wt ON wt.id=wso.workout_template_id WHERE wso.weekly_schedule_day_id=:id ORDER BY wso.position');
        foreach ($days as &$d) {
            $q->execute([':id' => $d['id']]);
            $d['options'] = $q->fetchAll();
        }$map = [];
        foreach ($days as $d) {
            $map[(int) $d['day_of_week']] = $d;
        }$out = [];
        for ($i = 1; $i <= 7; ++$i) {
            $out[] = $map[$i] ?? ['id' => null, 'training_program_id' => $id, 'day_of_week' => $i, 'label' => null, 'is_rest_day' => 0, 'options' => []];
        }json_ok($out);
    }
    $in = read_json();
    if ($method === 'POST' && $id === null) {
        $s = $pdo->prepare('INSERT INTO training_programs(name,description,started_at,is_active) VALUES(:n,:d,:s,:a)');
        $s->execute([':n' => req_str($in['name'] ?? null, 'name'), ':d' => null_str($in['description'] ?? null), ':s' => null_str($in['started_at'] ?? null, 10), ':a' => bool_val($in['is_active'] ?? false)]);
        $new = (int) $pdo->lastInsertId();
        if (bool_val($in['is_active'] ?? false)) {
            $pdo->prepare('UPDATE training_programs SET is_active=(id=:id)')->execute([':id' => $new]);
        }json_ok(['id' => $new], 201);
    }
    if ($method === 'PATCH' && $id && $sub === 'activate') {
        exists($pdo, 'training_programs', $id);
        $pdo->beginTransaction();
        $pdo->exec('UPDATE training_programs SET is_active=0');
        $pdo->prepare('UPDATE training_programs SET is_active=1,started_at=COALESCE(started_at,CURDATE()) WHERE id=:id')->execute([':id' => $id]);
        $pdo->commit();
        json_ok(['id' => $id]);
    }
    if ($method === 'PUT' && $id && $sub === 'weekly-schedule') {
        $days = $in['days'] ?? [];
        if (!is_array($days)) {
            json_err('days invalide', 422);
        }$pdo->beginTransaction();
        try {
            $pdo->prepare('DELETE FROM weekly_schedule_days WHERE training_program_id=:id')->execute([':id' => $id]);
            $dayStmt = $pdo->prepare('INSERT INTO weekly_schedule_days(training_program_id,day_of_week,label,is_rest_day) VALUES(:p,:d,:l,:r)');
            $optStmt = $pdo->prepare('INSERT INTO weekly_schedule_options(weekly_schedule_day_id,workout_template_id,label,position,is_default) VALUES(:d,:w,:l,:p,:df)');
            foreach ($days as $d) {
                $dayStmt->execute([':p' => $id, ':d' => (int) $d['day_of_week'], ':l' => null_str($d['label'] ?? null, 100), ':r' => bool_val($d['is_rest_day'] ?? false)]);
                $dayId = (int) $pdo->lastInsertId();
                foreach (($d['options'] ?? []) as $i => $o) {
                    $optStmt->execute([':d' => $dayId, ':w' => (int) $o['workout_template_id'], ':l' => null_str($o['label'] ?? null, 100), ':p' => (int) ($o['position'] ?? $i + 1), ':df' => bool_val($o['is_default'] ?? false)]);
                }
            }$pdo->commit();
            json_ok(['id' => $id]);
        } catch (Throwable $e) {
            $pdo->rollBack();
            json_err('Erreur planning', 500, $e->getMessage());
        }
    }
    json_err('Route training-programs non trouvée', 404);
}

if ($r === 'current-week' && $method === 'GET') {
    $p = $pdo->query('SELECT * FROM training_programs WHERE is_active=1 LIMIT 1')->fetch();
    if (!$p) {
        json_ok(['program' => null, 'days' => []]);
    }
    sync_missed_training_days($pdo, $p);
    [$start,$end] = iso_week_bounds($_GET['date'] ?? null);
    $s = $pdo->prepare('SELECT * FROM weekly_schedule_days WHERE training_program_id=:id');
    $s->execute([':id' => $p['id']]);
    $daysBy = [];
    foreach ($s->fetchAll() as $d) {
        $daysBy[(int) $d['day_of_week']] = $d;
    }
    $opt = $pdo->prepare('SELECT wso.*,wt.name workout_name,wt.estimated_duration,(SELECT COUNT(*) FROM workout_template_exercises x WHERE x.workout_template_id=wt.id) exercise_count FROM weekly_schedule_options wso JOIN workout_templates wt ON wt.id=wso.workout_template_id WHERE wso.weekly_schedule_day_id=:id ORDER BY wso.position');
    $status = $pdo->prepare('SELECT * FROM weekly_day_statuses WHERE training_program_id=:p AND scheduled_date=:d');
    $out = [];
    for ($i = 1; $i <= 7; ++$i) {
        $date = $start->modify('+'.($i - 1).' days')->format('Y-m-d');
        $d = $daysBy[$i] ?? null;
        $options = [];
        if ($d) {
            $opt->execute([':id' => $d['id']]);
            $options = $opt->fetchAll();
        }$status->execute([':p' => $p['id'], ':d' => $date]);
        $st = $status->fetch() ?: null;
        $out[] = ['date' => $date, 'day_of_week' => $i, 'day_name' => weekday_name($i), 'label' => $d['label'] ?? null, 'is_rest_day' => (bool) ($d['is_rest_day'] ?? false), 'schedule_day_id' => $d['id'] ?? null, 'options' => $options, 'status' => $st];
    }
    json_ok(['program' => $p, 'week_start' => $start->format('Y-m-d'), 'week_end' => $end->format('Y-m-d'), 'days' => $out]);
}

if ($r === 'workout-sessions') {
    if ($method === 'GET' && $id === null) {
        $s = $pdo->query('SELECT ws.*,COUNT(DISTINCT wse.id) exercise_count,COUNT(wst.id) set_count,COALESCE(SUM(wst.weight*wst.repetitions),0) volume FROM workout_sessions ws LEFT JOIN workout_session_exercises wse ON wse.workout_session_id=ws.id LEFT JOIN workout_sets wst ON wst.workout_session_exercise_id=wse.id GROUP BY ws.id ORDER BY ws.started_at DESC LIMIT 100');
        json_ok($s->fetchAll());
    }
    if ($method === 'GET' && $id) {
        $s = $pdo->prepare('SELECT * FROM workout_sessions WHERE id=:id');
        $s->execute([':id' => $id]);
        $session = $s->fetch();
        if (!$session) {
            json_err('Séance introuvable', 404);
        }$s = $pdo->prepare('SELECT * FROM workout_session_exercises WHERE workout_session_id=:id ORDER BY position');
        $s->execute([':id' => $id]);
        $ex = $s->fetchAll();
        $q = $pdo->prepare('SELECT * FROM workout_sets WHERE workout_session_exercise_id=:id ORDER BY set_number');
        foreach ($ex as &$e) {
            $q->execute([':id' => $e['id']]);
            $e['sets'] = $q->fetchAll();
        }$session['exercises'] = $ex;
        json_ok($session);
    }
    $in = read_json();
    if ($method === 'POST' && $id === null) {
        ensure_unplanned_sessions_schema($pdo);
        $templateId = null_int($in['workout_template_id'] ?? null);
        if (!$templateId) {
            json_err('workout_template_id requis', 422);
        }$scheduled = null_str($in['scheduled_date'] ?? date('Y-m-d'), 10);
        $scheduledDate = DateTimeImmutable::createFromFormat('!Y-m-d', (string) $scheduled);
        if (!$scheduledDate || $scheduledDate->format('Y-m-d') !== $scheduled) {
            json_err('Date de séance invalide', 422);
        }
        if ($scheduledDate < new DateTimeImmutable('today')) {
            json_err('Impossible de démarrer une séance à une date passée', 409);
        }
        $isUnplanned = bool_val($in['is_unplanned'] ?? false);
        $program = $pdo->query('SELECT id FROM training_programs WHERE is_active=1 LIMIT 1')->fetchColumn() ?: null;
        if (!$isUnplanned && $program) {
            $planned = $pdo->prepare('SELECT 1 FROM weekly_schedule_days d JOIN weekly_schedule_options o ON o.weekly_schedule_day_id=d.id WHERE d.training_program_id=:p AND d.day_of_week=WEEKDAY(:date)+1 AND d.is_rest_day=0 AND o.workout_template_id=:template LIMIT 1');
            $planned->execute([':p' => $program, ':date' => $scheduled, ':template' => $templateId]);
            $isUnplanned = $planned->fetchColumn() ? 0 : 1;
        } elseif (!$program) {
            $isUnplanned = 1;
        }
        $s = $pdo->prepare('SELECT * FROM workout_templates WHERE id=:id');
        $s->execute([':id' => $templateId]);
        $t = $s->fetch();
        if (!$t) {
            json_err('Séance type introuvable', 404);
        }$pdo->beginTransaction();
        try {
            $s = $pdo->prepare('INSERT INTO workout_sessions(workout_template_id,training_program_id,template_name_snapshot,scheduled_date,started_at,is_unplanned) VALUES(:w,:p,:n,:d,NOW(),:u)');
            $s->execute([':w' => $templateId, ':p' => $program, ':n' => $t['name'], ':d' => $scheduled, ':u' => $isUnplanned]);
            $sid = (int) $pdo->lastInsertId();
            $src = $pdo->prepare('SELECT wte.*,e.name FROM workout_template_exercises wte JOIN exercises e ON e.id=wte.exercise_id WHERE workout_template_id=:id ORDER BY position');
            $src->execute([':id' => $templateId]);
            $ins = $pdo->prepare('INSERT INTO workout_session_exercises(workout_session_id,exercise_id,exercise_name_snapshot,position,planned_sets_snapshot,min_reps_snapshot,max_reps_snapshot,target_weight_snapshot,rest_seconds_snapshot,notes) VALUES(:s,:e,:n,:p,:ps,:min,:max,:tw,:rs,:no)');
            foreach ($src->fetchAll() as $e) {
                $ins->execute([':s' => $sid, ':e' => $e['exercise_id'], ':n' => $e['name'], ':p' => $e['position'], ':ps' => $e['planned_sets'], ':min' => $e['min_reps'], ':max' => $e['max_reps'], ':tw' => $e['target_weight'], ':rs' => $e['rest_seconds'], ':no' => $e['notes']]);
            }$pdo->commit();
            json_ok(['id' => $sid], 201);
        } catch (Throwable $e) {
            $pdo->rollBack();
            json_err('Erreur démarrage séance', 500, $e->getMessage());
        }
    }
    if ($method === 'POST' && $id && $sub === 'complete') {
        ensure_unplanned_sessions_schema($pdo);
        exists($pdo, 'workout_sessions', $id);
        $s = $pdo->prepare("UPDATE workout_sessions SET status='completed',ended_at=NOW(),duration_seconds=TIMESTAMPDIFF(SECOND,started_at,NOW()),notes=:n,energy_level=:e,fatigue_level=:f,motivation_level=:m,pain_level=:p WHERE id=:id");
        $s->execute([':id' => $id, ':n' => null_str($in['notes'] ?? null), ':e' => null_int($in['energy_level'] ?? null), ':f' => null_int($in['fatigue_level'] ?? null), ':m' => null_int($in['motivation_level'] ?? null), ':p' => null_int($in['pain_level'] ?? null)]);
        $ss = $pdo->prepare('SELECT training_program_id,workout_template_id,scheduled_date,is_unplanned FROM workout_sessions WHERE id=:id');
        $ss->execute([':id' => $id]);
        $x = $ss->fetch();
        if ($x['training_program_id'] && $x['scheduled_date'] && !$x['is_unplanned']) {
            $d = $pdo->prepare('SELECT id FROM weekly_schedule_days WHERE training_program_id=:p AND day_of_week=WEEKDAY(:date)+1');
            $d->execute([':p' => $x['training_program_id'], ':date' => $x['scheduled_date']]);
            $dayId = $d->fetchColumn() ?: null;
            $up = $pdo->prepare("INSERT INTO weekly_day_statuses(training_program_id,weekly_schedule_day_id,workout_session_id,selected_workout_template_id,scheduled_date,status) VALUES(:p,:d,:s,:w,:date,'completed') ON DUPLICATE KEY UPDATE workout_session_id=VALUES(workout_session_id),selected_workout_template_id=VALUES(selected_workout_template_id),status='completed'");
            $up->execute([':p' => $x['training_program_id'], ':d' => $dayId, ':s' => $id, ':w' => $x['workout_template_id'], ':date' => $x['scheduled_date']]);
        }json_ok(['id' => $id]);
    }
    if ($method === 'POST' && $id && $sub === 'stop') {
        exists($pdo, 'workout_sessions', $id);
        $s = $pdo->prepare("UPDATE workout_sessions SET status='abandoned',ended_at=NOW(),duration_seconds=TIMESTAMPDIFF(SECOND,started_at,NOW()) WHERE id=:id AND status='in_progress'");
        $s->execute([':id' => $id]);
        if ($s->rowCount() === 0) {
            json_err('Seule une séance en cours peut être stoppée', 409);
        }
        json_ok(['id' => $id, 'status' => 'abandoned']);
    }
    if ($method === 'DELETE' && $id && $sub === null) {
        exists($pdo, 'workout_sessions', $id);
        $pdo->beginTransaction();
        try {
            $pdo->prepare('DELETE FROM weekly_day_statuses WHERE workout_session_id=:id')->execute([':id' => $id]);
            $pdo->prepare('DELETE FROM workout_sessions WHERE id=:id')->execute([':id' => $id]);
            $pdo->commit();
            json_ok(['id' => $id]);
        } catch (Throwable $e) {
            $pdo->rollBack();
            json_err('Erreur lors de la suppression de la séance', 500, $e->getMessage());
        }
    }
    json_err('Route workout-sessions non trouvée', 404);
}

if ($r === 'workout-session-exercises' && $id && $sub === 'sets') {
    if ($method === 'POST') {
        exists($pdo, 'workout_session_exercises', $id);
        $in = read_json();
        $q = $pdo->prepare('SELECT COALESCE(MAX(set_number),0)+1 FROM workout_sets WHERE workout_session_exercise_id=:id');
        $q->execute([':id' => $id]);
        $num = (int) $q->fetchColumn();
        $s = $pdo->prepare('INSERT INTO workout_sets(workout_session_exercise_id,set_number,set_type,weight,repetitions,duration_seconds,distance,rir,rpe,is_completed,notes,completed_at) VALUES(:e,:n,:t,:w,:r,:d,:di,:rir,:rpe,1,:no,NOW())');
        $s->execute([':e' => $id, ':n' => $num, ':t' => null_str($in['set_type'] ?? null, 30), ':w' => null_float($in['weight'] ?? null), ':r' => null_int($in['repetitions'] ?? null), ':d' => null_int($in['duration_seconds'] ?? null), ':di' => null_float($in['distance'] ?? null), ':rir' => null_float($in['rir'] ?? null), ':rpe' => null_float($in['rpe'] ?? null), ':no' => null_str($in['notes'] ?? null)]);
        json_ok(['id' => (int) $pdo->lastInsertId(), 'set_number' => $num], 201);
    }
}
if ($r === 'workout-sets' && $id) {
    if ($method === 'PUT') {
        $in = read_json();
        $s = $pdo->prepare('UPDATE workout_sets SET weight=:w,repetitions=:r,rir=:rir,rpe=:rpe,notes=:n WHERE id=:id');
        $s->execute([':id' => $id, ':w' => null_float($in['weight'] ?? null), ':r' => null_int($in['repetitions'] ?? null), ':rir' => null_float($in['rir'] ?? null), ':rpe' => null_float($in['rpe'] ?? null), ':n' => null_str($in['notes'] ?? null)]);
        json_ok(['id' => $id]);
    }
    if ($method === 'DELETE') {
        $pdo->prepare('DELETE FROM workout_sets WHERE id=:id')->execute([':id' => $id]);
        json_ok(['id' => $id]);
    }
}

if ($r === 'weekly-day-statuses') {
    $date = $parts[1] ?? null;
    if (!$date || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        json_err('Date invalide', 422);
    }
    if ($method === 'PUT') {
        $in = read_json();
        $allowed = ['missed', 'skipped', 'replaced'];
        $status = $in['status'] ?? '';
        if (!in_array($status, $allowed, true)) {
            json_err('Statut invalide', 422);
        }$p = $pdo->query('SELECT id FROM training_programs WHERE is_active=1 LIMIT 1')->fetchColumn();
        if (!$p) {
            json_err('Aucun programme actif', 409);
        }$d = $pdo->prepare('SELECT id FROM weekly_schedule_days WHERE training_program_id=:p AND day_of_week=WEEKDAY(:d)+1');
        $d->execute([':p' => $p, ':d' => $date]);
        $day = $d->fetchColumn() ?: null;
        $s = $pdo->prepare('INSERT INTO weekly_day_statuses(training_program_id,weekly_schedule_day_id,scheduled_date,status,notes) VALUES(:p,:day,:d,:s,:n) ON DUPLICATE KEY UPDATE status=VALUES(status),notes=VALUES(notes)');
        $s->execute([':p' => $p, ':day' => $day, ':d' => $date, ':s' => $status, ':n' => null_str($in['notes'] ?? null)]);
        json_ok(['date' => $date, 'status' => $status]);
    }
    if ($method === 'DELETE') {
        $p = $pdo->query('SELECT id FROM training_programs WHERE is_active=1 LIMIT 1')->fetchColumn();
        $s = $pdo->prepare('DELETE FROM weekly_day_statuses WHERE training_program_id=:p AND scheduled_date=:d');
        $s->execute([':p' => $p, ':d' => $date]);
        json_ok(['date' => $date]);
    }
}

if ($r === 'statistics' && $sub === null) {
    if ($id === null && ($parts[1] ?? '') === 'dashboard') {
    }
}
if (
    $r === 'statistics'
    && ($parts[1] ?? '') === 'dashboard'
    && $method === 'GET'
) {
    $activeProgram = $pdo->query('SELECT * FROM training_programs WHERE is_active=1 LIMIT 1')->fetch();
    if ($activeProgram) {
        sync_missed_training_days($pdo, $activeProgram);
    }
    [$start, $end] = iso_week_bounds();

    $stmt = $pdo->prepare(
        "
        SELECT
            COUNT(DISTINCT se.id) AS sessions,
            COALESCE(SUM(se.duration_seconds), 0) AS duration,
            COALESCE(SUM(
                CASE
                    WHEN ws.is_completed = 1
                    THEN COALESCE(ws.weight, 0) * COALESCE(ws.repetitions, 0)
                    ELSE 0
                END
            ), 0) AS volume
        FROM workout_sessions se
        LEFT JOIN workout_session_exercises wse
            ON wse.workout_session_id = se.id
        LEFT JOIN workout_sets ws
            ON ws.workout_session_exercise_id = wse.id
        WHERE se.status = 'completed'
          AND se.scheduled_date BETWEEN :start AND :end
        "
    );

    $stmt->execute([
        ':start' => $start->format('Y-m-d'),
        ':end' => $end->format('Y-m-d'),
    ]);

    $week = $stmt->fetch();

    $lastStmt = $pdo->query(
        "
        SELECT
            id,
            template_name_snapshot,
            scheduled_date,
            duration_seconds
        FROM workout_sessions
        WHERE status = 'completed'
        ORDER BY scheduled_date DESC, id DESC
        LIMIT 1
        "
    );

    json_ok([
        'week' => $week,
        'last_session' => $lastStmt->fetch() ?: null,
    ]);
}
if ($r === 'body-measurements') {
    if ($method === 'GET') {
        json_ok($pdo->query('SELECT * FROM body_measurements ORDER BY measured_at DESC')->fetchAll());
    }
    if ($method === 'POST') {
        $in = read_json();
        $s = $pdo->prepare('INSERT INTO body_measurements(measured_at,weight,body_fat_percentage,chest,waist,arm_left,arm_right,thigh_left,thigh_right,notes) VALUES(COALESCE(:d,NOW()),:w,:bf,:c,:wa,:al,:ar,:tl,:tr,:n)');
        $s->execute([':d' => null_str($in['measured_at'] ?? null, 19), ':w' => null_float($in['weight'] ?? null), ':bf' => null_float($in['body_fat_percentage'] ?? null), ':c' => null_float($in['chest'] ?? null), ':wa' => null_float($in['waist'] ?? null), ':al' => null_float($in['arm_left'] ?? null), ':ar' => null_float($in['arm_right'] ?? null), ':tl' => null_float($in['thigh_left'] ?? null), ':tr' => null_float($in['thigh_right'] ?? null), ':n' => null_str($in['notes'] ?? null)]);
        json_ok(['id' => (int) $pdo->lastInsertId()], 201);
    }
}
if ($r === 'recovery-logs') {
    if ($method === 'GET') {
        json_ok($pdo->query('SELECT * FROM daily_recovery_logs ORDER BY log_date DESC')->fetchAll());
    }
    if ($method === 'POST') {
        $in = read_json();
        $s = $pdo->prepare('INSERT INTO daily_recovery_logs(log_date,sleep_hours,sleep_quality,fatigue_level,stress_level,motivation_level,energy_level,soreness_level,notes) VALUES(:d,:sh,:sq,:f,:st,:m,:e,:so,:n) ON DUPLICATE KEY UPDATE sleep_hours=VALUES(sleep_hours),sleep_quality=VALUES(sleep_quality),fatigue_level=VALUES(fatigue_level),stress_level=VALUES(stress_level),motivation_level=VALUES(motivation_level),energy_level=VALUES(energy_level),soreness_level=VALUES(soreness_level),notes=VALUES(notes)');
        $s->execute([':d' => req_str($in['log_date'] ?? date('Y-m-d'), 'log_date', 10), ':sh' => null_float($in['sleep_hours'] ?? null), ':sq' => null_int($in['sleep_quality'] ?? null), ':f' => null_int($in['fatigue_level'] ?? null), ':st' => null_int($in['stress_level'] ?? null), ':m' => null_int($in['motivation_level'] ?? null), ':e' => null_int($in['energy_level'] ?? null), ':so' => null_int($in['soreness_level'] ?? null), ':n' => null_str($in['notes'] ?? null)]);
        json_ok(['date' => $in['log_date'] ?? date('Y-m-d')], 201);
    }
}
json_err('Ressource non trouvée', 404);
