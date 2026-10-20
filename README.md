# 教會歌曲資料庫

網頁版與 Windows 桌面版原始碼。

- `web/`：React / Vinext 網頁、D1 雲端儲存、Google Drive 連接程式。
- `desktop/`：Tkinter 歌曲資料庫編輯器、FreeShow 與 PowerPoint 匯出。

## 匯出規則

16:9 保留手動換行，每頁兩行，基準每行約 21 個中文字。
32:9 將同段相鄰兩行以空白接成一行，每頁兩行，因此原本四行可合為一頁；基準約 42 字。不同段落與歌名頁不合併，超長整句縮字、不拆字。切換比例不改寫資料庫歌詞。

## 網頁開發

需要 Node.js >=22.13 和 package.json 指定的 pnpm 版本。

```sh
cd web
pnpm install
pnpm dev
```

公開版本的 `data/songs.json` 是空陣列，請自行加入有使用權的歌曲資料或透過編輯者新增。需要 Cloudflare D1 綁定 `DB`，資料表遷移在 `drizzle/`。登入需要伺服器環境變數 `EDITOR_PASSWORD_HASH`，格式及 PBKDF2 計算見 `lib/auth.ts`；不要把密碼或金鑰提交到 Git。Drive 連接步驟見 `integrations/google-drive/連接說明.md`。

公開副本未綁定原網站的 Sites 專案 ID；自行部署時建立自己的託管設定與資料庫。

```sh
node scripts/check-show-layout.cjs
node scripts/check-download.cjs
```

## Windows 桌面版

需要 Python 3.11+、Tkinter、微軟正黑體；匯出 PPT/PPTX 另需 Microsoft PowerPoint。

```powershell
cd desktop
py -m pip install -r requirements.txt
py editor.py
py check_wide_layout.py
py -m PyInstaller --noconfirm SongEditor.spec
```

打包結果為 `desktop/dist/SongEditor.exe`。開啟程式後選擇既有相容的歌曲 SQLite 資料庫。公開庫不含完整歌詞資料庫、影片、密碼、API 金鑰與本機備份。

32:9 進一步合併：同段相鄰兩頁都是完整兩行，且四行各自寬度嚴格小於可用寬度 50%，則各頁兩行以空白接起，合成一頁兩行。合併後須容納於版面；持續套用直到不符合。空白行、歌名、不同段落及未滿兩行尾頁不參與。16:9 不變。

## 2026-10-20 歌單更新

網頁可勾選歌曲、排序、設定聚會資訊與回應詩歌。匯出整份 FreeShow .project（可內含影片）、各首 .show ZIP、A4 雙欄 19pt Word 大字報與敬拜群組文字。資料存於瀏覽器。歌單匯出使用已儲存歌曲。

本機影片配對包：完整解壓縮，執行 start.cmd，選擇影片資料夾；依完整檔名比對子資料夾，遇到缺檔或同名多檔會停止。匯入 matched-... 中的新 .project/.show。只產生新檔，不修改影片或既有 FreeShow 資料庫。

網頁與桌面 .show 都採相同固定歌曲 ID；舊版隨機 ID 副本需要備份後自行整理，無法安全地只憑歌名自動覆蓋。桌面此次更新固定 ID，歌單與 Word 大字報功能在網頁使用。

編輯者帳號為 beersheba01–beersheba10。密碼僅保留伺服器雜湊設定，不在此儲存庫。

本機配對工具現會讀取 FreeShow 設定中的 Shows 路徑，優先依 ID、完整歌名、去除編號後的唯一歌名配對。既有歌曲只建立歌單引用，保留本機版面與影片；缺少的歌曲才從下載 .show 加入。先儲存 FreeShow 的未存修改；同名多筆會停止。產生配對報告並嘗試透過 .project 檔案關聯開啟 FreeShow。驗證：`py web/scripts/check-local-matching.py`（請在 web 目錄執行 `py scripts/check-local-matching.py`）。
