<?php declare(strict_types=1); ?>
<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="color-scheme" content="light">
  <meta name="theme-color" content="#2d6cdf">
  <link rel="manifest" href="manifest.webmanifest">
  <link rel="icon" href="assets/icons/icon-192.png">
  <title>紫微斗數排盤系統</title>
  <link rel="stylesheet" href="assets/style.css?v=1.1.0">
</head>
<body>
  <header class="window-bar">
    <div class="window-name">紫微斗數排盤系統</div>
    <div class="window-actions">
      <button id="printBtn" class="icon-btn" title="列印／另存 PDF">⎙</button>
      <button id="closeBtn" class="icon-btn close" title="關閉視窗">×</button>
    </div>
  </header>

  <div class="app-shell">
    <header class="topbar">
      <button id="drawerOpen" class="link-btn">◀ 命例 <span id="caseCount" class="badge">0</span></button>
      <h1>紫微斗數排盤系統</h1>
      <div class="top-actions"><button id="installBtn" class="link-btn hidden">安裝 App</button><button id="settingsOpen" class="link-btn">設定 ▶</button></div>
    </header>

    <aside id="drawer" class="drawer" aria-hidden="true">
      <div class="drawer-head"><strong>命例管理</strong><button id="drawerClose" class="icon-btn">×</button></div>
      <div class="drawer-tools">
        <button id="newCaseBtn" class="btn primary mini">＋ 新命例</button>
        <button id="backupBtn" class="btn secondary mini">備份</button>
        <button id="restoreBtn" class="btn secondary mini">匯入</button>
        <input id="restoreFile" type="file" accept="application/json,.json" class="hidden">
      </div>
      <div class="drawer-search"><input id="caseSearch" placeholder="搜尋姓名"></div>
      <div id="caseList" class="case-list"></div>
    </aside>
    <div id="drawerMask" class="drawer-mask"></div>

    <aside id="settings" class="settings" aria-hidden="true">
      <div class="drawer-head"><strong>排盤設定</strong><button id="settingsClose" class="icon-btn">×</button></div>
      <div class="settings-body">
        <label>安星算法<select id="setAlgorithm"><option value="default">通行版</option><option value="zhongzhou">中州派</option></select></label>
        <label>年分界<select id="setYearDivide"><option value="normal">農曆正月初一</option><option value="exact">立春</option></select></label>
        <label>運限分界<select id="setHoroscopeDivide"><option value="normal">農曆分界</option><option value="exact">節氣分界</option></select></label>
        <label>小限年齡分界<select id="setAgeDivide"><option value="normal">自然年</option><option value="birthday">生日</option></select></label>
        <label>晚子時<select id="setDayDivide"><option value="forward">算次日</option><option value="current">算當日</option></select></label>
        <button id="settingsSave" class="btn primary">儲存設定</button>
        <p class="muted small">不同流派的四化、亮度與分界規則可能不同。此處把算法設定持久化，避免同一命例在不同規則間混用。</p>
      </div>
    </aside>

    <section class="control-panel card">
      <div class="form-grid">
        <label>姓名<input id="name" value="" placeholder="輸入姓名"></label>
        <label>曆法<select id="calendarType"><option value="solar">公曆</option><option value="lunar">農曆</option></select></label>
        <label>出生年<input id="birthYear" type="number" min="1900" max="2100" value="1990"></label>
        <label>月<input id="birthMonth" type="number" min="1" max="12" value="6"></label>
        <label>日<input id="birthDay" type="number" min="1" max="31" value="15"></label>
        <label>時間<select id="birthHour"></select></label>
        <label>性別<select id="gender"><option value="男">男</option><option value="女">女</option></select></label>
        <label id="leapWrap" class="check hidden"><input id="isLeapMonth" type="checkbox"> 閏月</label>
        <button id="chartBtn" class="btn primary">排盤</button>
        <button id="saveBtn" class="btn success">▣ 保存命例</button>
        <button id="exportBtn" class="btn secondary">匯出 JSON</button>
      </div>
      <div class="sub-row">
        <div class="legend"><span>廟旺：</span><b class="br b-miao">廟</b><b class="br b-wang">旺</b><b class="br b-de">得</b><b class="br b-li">利</b><b class="br b-ping">平</b><b class="br b-bu">不</b><b class="br b-xian">陷</b></div>
        <div class="flow-control"><label>運限日期 <input id="flowDate" type="date"></label><label>流時 <select id="flowHour"></select></label><button id="todayBtn" class="btn mini">今天</button></div>
      </div>
      <div id="status" class="status"></div>
    </section>

    <main id="chartWrapper" class="chart-wrapper">
      <div id="chart" class="chart"></div>
      <svg id="sanheSvg" class="sanhe-svg" aria-hidden="true"></svg>
    </main>

    <section id="timeline" class="timeline card"></section>

    <section class="detail-grid">
      <article class="card detail-card"><h2>運限摘要</h2><div id="flowSummary" class="detail-body"></div></article>
      <article class="card detail-card"><h2>命例備註</h2><textarea id="note" placeholder="可記錄老師判讀、驗證事件、版本差異……"></textarea></article>
    </section>
  </div>

  <div id="toast" class="toast"></div>
  <script src="assets/vendor/iztro-v2.6.1.min.js"></script>
  <script>if(!window.iztro){document.write('<script src="https://cdn.jsdelivr.net/npm/iztro@2.6.1/dist/iztro-v2.6.1.min.js"><\/script>')}</script>
  <script src="assets/app.js?v=1.1.0"></script>
</body>
</html>
