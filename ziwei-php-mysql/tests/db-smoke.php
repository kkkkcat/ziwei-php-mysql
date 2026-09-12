<?php
declare(strict_types=1);
require dirname(__DIR__) . '/src/bootstrap.php';

$pdo = db();
$pdo->beginTransaction();
try {
    $pdo->exec("INSERT INTO cases(name,birth_year,birth_month,birth_day,birth_hour,gender,calendar_type,is_leap_month,fix_leap,timezone,note) VALUES('CI Smoke',1990,6,15,10,'男','solar',0,1,'Asia/Taipei','smoke')");
    $id = (int)$pdo->lastInsertId();
    $st = $pdo->prepare('SELECT name,birth_year FROM cases WHERE id=?');
    $st->execute([$id]);
    $row = $st->fetch();
    if (!$row || $row['name'] !== 'CI Smoke' || (int)$row['birth_year'] !== 1990) {
        throw new RuntimeException('DB round-trip failed');
    }
    $pdo->rollBack();
    fwrite(STDOUT, "database smoke test passed\n");
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    throw $e;
}
