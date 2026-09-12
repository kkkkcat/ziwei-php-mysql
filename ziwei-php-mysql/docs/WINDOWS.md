# Windows 使用方式

## 建議：PWA，不做第二套 Windows 原生程式

1. 安裝 Docker Desktop。
2. 雙擊 `scripts/start-windows.bat`。
3. Edge / Chrome 開啟 `http://localhost:8080`。
4. 點右上「安裝 App」或瀏覽器網址列的安裝圖示。

安裝後會像一般 Windows App 一樣出現在開始功能表，並以獨立視窗執行。

## 什麼時候才改用 Tauri

只有出現下列需求才值得加桌面殼：

- 完全離線且不想跑 Docker / Apache / MySQL
- 系統 tray、自動更新、原生檔案系統、Windows 通知
- 本地 AI 模型或大量本機檔案處理

若日後加 Tauri，建議只把它當 UI shell；PHP API 與 MySQL 服務端版本仍保留，避免分裂成兩套產品。
