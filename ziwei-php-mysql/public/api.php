<?php
declare(strict_types=1);
require __DIR__ . '/../src/bootstrap.php';

$action = $_GET['action'] ?? 'health';

try {
    if ($action === 'health') {
        require_method('GET');
        db()->query('SELECT 1')->fetchColumn();
        json_response(['ok' => true, 'service' => 'ziwei-php-mysql', 'time' => date(DATE_ATOM)]);
    }

    if ($action === 'list') {
        require_method('GET');
        $q = clean_string($_GET['q'] ?? '', 100);
        if ($q !== '') {
            $st = db()->prepare('SELECT id,name,birth_year,birth_month,birth_day,birth_hour,gender,calendar_type,is_leap_month,fix_leap,timezone,note,created_at,updated_at FROM cases WHERE name LIKE ? ORDER BY updated_at DESC,id DESC LIMIT 300');
            $st->execute(['%' . $q . '%']);
        } else {
            $st = db()->query('SELECT id,name,birth_year,birth_month,birth_day,birth_hour,gender,calendar_type,is_leap_month,fix_leap,timezone,note,created_at,updated_at FROM cases ORDER BY updated_at DESC,id DESC LIMIT 300');
        }
        json_response(['ok' => true, 'data' => $st->fetchAll()]);
    }

    if ($action === 'get') {
        require_method('GET');
        $id = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT);
        if (!$id) json_response(['ok' => false, 'error' => 'ID 無效'], 422);
        $st = db()->prepare('SELECT * FROM cases WHERE id=?');
        $st->execute([$id]);
        $row = $st->fetch();
        if (!$row) json_response(['ok' => false, 'error' => '找不到命例'], 404);
        if (!empty($row['chart_json'])) $row['chart_json'] = json_decode((string)$row['chart_json'], true);
        if (!empty($row['settings_json'])) $row['settings_json'] = json_decode((string)$row['settings_json'], true);
        json_response(['ok' => true, 'data' => $row]);
    }

    if ($action === 'save') {
        require_method('POST');
        $in = json_body();
        $v = validate_case($in);
        $id = filter_var($in['id'] ?? null, FILTER_VALIDATE_INT);

        $settings = db()->query('SELECT algorithm,year_divide,horoscope_divide,age_divide,day_divide,language FROM app_settings WHERE id=1')->fetch() ?: [];
        $settingsJson = json_encode($settings, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
        if ($id) {
            $sql = 'UPDATE cases SET name=?,birth_year=?,birth_month=?,birth_day=?,birth_hour=?,gender=?,calendar_type=?,is_leap_month=?,fix_leap=?,timezone=?,note=?,engine_name=?,engine_version=?,settings_json=?,chart_json=? WHERE id=?';
            $st = db()->prepare($sql);
            $st->execute([$v['name'],$v['birth_year'],$v['birth_month'],$v['birth_day'],$v['birth_hour'],$v['gender'],$v['calendar_type'],$v['is_leap_month'],$v['fix_leap'],$v['timezone'],$v['note'],'iztro','2.6.1',$settingsJson,$v['chart_json'],$id]);
        } else {
            $sql = 'INSERT INTO cases(name,birth_year,birth_month,birth_day,birth_hour,gender,calendar_type,is_leap_month,fix_leap,timezone,note,engine_name,engine_version,settings_json,chart_json) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)';
            $st = db()->prepare($sql);
            $st->execute([$v['name'],$v['birth_year'],$v['birth_month'],$v['birth_day'],$v['birth_hour'],$v['gender'],$v['calendar_type'],$v['is_leap_month'],$v['fix_leap'],$v['timezone'],$v['note'],'iztro','2.6.1',$settingsJson,$v['chart_json']]);
            $id = (int)db()->lastInsertId();
        }
        json_response(['ok' => true, 'id' => (int)$id]);
    }

    if ($action === 'delete') {
        require_method('DELETE', 'POST');
        $id = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT);
        if (!$id) json_response(['ok' => false, 'error' => 'ID 無效'], 422);
        $st = db()->prepare('DELETE FROM cases WHERE id=?');
        $st->execute([$id]);
        json_response(['ok' => true]);
    }


    if ($action === 'backup') {
        require_method('GET');
        $cases = db()->query('SELECT * FROM cases ORDER BY id ASC')->fetchAll();
        foreach ($cases as &$case) {
            if (!empty($case['chart_json'])) {
                $case['chart_json'] = json_decode((string)$case['chart_json'], true);
            }
            if (!empty($case['settings_json'])) {
                $case['settings_json'] = json_decode((string)$case['settings_json'], true);
            }
        }
        unset($case);
        $settings = db()->query('SELECT * FROM app_settings WHERE id=1')->fetch() ?: [];
        json_response([
            'ok' => true,
            'data' => [
                'format' => 'ziwei-php-mysql-backup',
                'schema_version' => 1,
                'exported_at' => date(DATE_ATOM),
                'settings' => $settings,
                'cases' => $cases,
            ],
        ]);
    }

    if ($action === 'restore') {
        require_method('POST');
        $in = json_body();
        $backup = $in['backup'] ?? null;
        $mode = (string)($in['mode'] ?? 'merge');
        if (!is_array($backup) || ($backup['format'] ?? '') !== 'ziwei-php-mysql-backup' || (int)($backup['schema_version'] ?? 0) !== 1) {
            json_response(['ok' => false, 'error' => '備份檔格式或版本不支援'], 422);
        }
        if (!in_array($mode, ['merge', 'replace'], true)) {
            json_response(['ok' => false, 'error' => '匯入模式無效'], 422);
        }
        $cases = $backup['cases'] ?? [];
        if (!is_array($cases) || count($cases) > 10000) {
            json_response(['ok' => false, 'error' => '備份命例數量異常'], 422);
        }
        $pdo = db();
        $pdo->beginTransaction();
        try {
            if ($mode === 'replace') {
                $pdo->exec('DELETE FROM cases');
            }
            $sql = 'INSERT INTO cases(name,birth_year,birth_month,birth_day,birth_hour,gender,calendar_type,is_leap_month,fix_leap,timezone,note,engine_name,engine_version,settings_json,chart_json) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)';
            $st = $pdo->prepare($sql);
            $imported = 0;
            foreach ($cases as $case) {
                if (!is_array($case)) continue;
                $v = validate_case([
                    'name' => $case['name'] ?? '匿名',
                    'birth_year' => $case['birth_year'] ?? null,
                    'birth_month' => $case['birth_month'] ?? null,
                    'birth_day' => $case['birth_day'] ?? null,
                    'birth_hour' => $case['birth_hour'] ?? null,
                    'gender' => $case['gender'] ?? '',
                    'calendar_type' => $case['calendar_type'] ?? 'solar',
                    'is_leap_month' => $case['is_leap_month'] ?? 0,
                    'fix_leap' => $case['fix_leap'] ?? 1,
                    'timezone' => $case['timezone'] ?? 'Asia/Taipei',
                    'note' => $case['note'] ?? '',
                    'chart_json' => $case['chart_json'] ?? null,
                ]);
                $engineName = clean_string($case['engine_name'] ?? 'iztro', 32) ?: 'iztro';
                $engineVersion = clean_string($case['engine_version'] ?? '2.6.1', 32) ?: '2.6.1';
                $caseSettings = $case['settings_json'] ?? null;
                $caseSettingsJson = is_array($caseSettings) ? json_encode($caseSettings, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR) : null;
                $st->execute([$v['name'],$v['birth_year'],$v['birth_month'],$v['birth_day'],$v['birth_hour'],$v['gender'],$v['calendar_type'],$v['is_leap_month'],$v['fix_leap'],$v['timezone'],$v['note'],$engineName,$engineVersion,$caseSettingsJson,$v['chart_json']]);
                $imported++;
            }
            $settings = $backup['settings'] ?? null;
            if (is_array($settings)) {
                $algorithm = in_array(($settings['algorithm'] ?? ''), ['default','zhongzhou'], true) ? $settings['algorithm'] : 'default';
                $year = in_array(($settings['year_divide'] ?? ''), ['normal','exact'], true) ? $settings['year_divide'] : 'normal';
                $horoscope = in_array(($settings['horoscope_divide'] ?? ''), ['normal','exact'], true) ? $settings['horoscope_divide'] : 'normal';
                $age = in_array(($settings['age_divide'] ?? ''), ['normal','birthday'], true) ? $settings['age_divide'] : 'normal';
                $day = in_array(($settings['day_divide'] ?? ''), ['current','forward'], true) ? $settings['day_divide'] : 'forward';
                $stSet = $pdo->prepare('UPDATE app_settings SET algorithm=?,year_divide=?,horoscope_divide=?,age_divide=?,day_divide=? WHERE id=1');
                $stSet->execute([$algorithm,$year,$horoscope,$age,$day]);
            }
            $pdo->commit();
            json_response(['ok' => true, 'imported' => $imported]);
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            throw $e;
        }
    }

    if ($action === 'settings') {
        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET') {
            $row = db()->query('SELECT * FROM app_settings WHERE id=1')->fetch();
            json_response(['ok' => true, 'data' => $row ?: []]);
        }
        require_method('POST');
        $in = json_body();
        $algorithm = in_array(($in['algorithm'] ?? ''), ['default','zhongzhou'], true) ? $in['algorithm'] : 'default';
        $year = in_array(($in['year_divide'] ?? ''), ['normal','exact'], true) ? $in['year_divide'] : 'normal';
        $horoscope = in_array(($in['horoscope_divide'] ?? ''), ['normal','exact'], true) ? $in['horoscope_divide'] : 'normal';
        $age = in_array(($in['age_divide'] ?? ''), ['normal','birthday'], true) ? $in['age_divide'] : 'normal';
        $day = in_array(($in['day_divide'] ?? ''), ['current','forward'], true) ? $in['day_divide'] : 'forward';
        $st = db()->prepare('UPDATE app_settings SET algorithm=?,year_divide=?,horoscope_divide=?,age_divide=?,day_divide=? WHERE id=1');
        $st->execute([$algorithm,$year,$horoscope,$age,$day]);
        json_response(['ok' => true]);
    }

    json_response(['ok' => false, 'error' => 'Unknown action'], 404);
} catch (ValidationException $e) {
    json_response(['ok' => false, 'error' => $e->getMessage()], 422);
} catch (PDOException $e) {
    $debug = envv('APP_DEBUG', '0') === '1';
    json_response(['ok' => false, 'error' => $debug ? ('資料庫錯誤：' . $e->getMessage()) : '資料庫暫時無法使用'], 500);
} catch (Throwable $e) {
    $debug = envv('APP_DEBUG', '0') === '1';
    json_response(['ok' => false, 'error' => $debug ? $e->getMessage() : '伺服器錯誤'], 500);
}
