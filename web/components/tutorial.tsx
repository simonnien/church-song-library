 'use client';
import TutorialPractice from './tutorial-practice';
import {useEffect,useRef,useState} from 'react';
export default function Tutorial({canEdit,isAdmin,username,ready}:{canEdit:boolean;isAdmin:boolean;username:string;ready:boolean}){
 const [done,setDone]=useState(false);
 const [open,setOpen]=useState(false),[step,setStep]=useState(0);const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{setDone(false)},[step]);
 useEffect(()=>{if(!ready||!username)return;let active=true;fetch('/api/tutorial').then(r=>r.ok?r.json():null).then(d=>{if(active&&d&&!d.seen){setStep(0);setDone(false);setOpen(true)}}).catch(()=>{});return()=>{active=false}},[ready,username]);
 useEffect(()=>{if(open&&!dialog.current?.open)dialog.current?.showModal();if(!open&&dialog.current?.open)dialog.current.close()},[open]);
 function close(){setOpen(false);if(username)void fetch('/api/tutorial',{method:'POST'}).catch(()=>{})}
 const steps=[
 {title:'歡迎使用詩歌書房',text:['在這裡搜尋詩歌、安排敬拜歌單、選擇背景，再匯出投影與大字報。','任何人都能瀏覽及匯出；右上方「使用教學」可隨時再次開啟。']},
 {title:'搜尋與閱讀歌曲',text:['搜尋欄可輸入編號、歌名、部分歌詞，或貼上 YouTube 連結找歌曲。','左側依編號分冊，例如 001–100；點歌曲查看歌詞與投影片預覽。手機使用返回按鈕回到清單。']},
 {title:'建立已選歌單',text:['勾選歌曲加入「已選歌單」，開啟歌單後可上移、下移與移除歌曲。','設定日期、聚會名稱、備註與回應詩歌；回應詩歌可以多首。','未登入的歌單留在這台裝置；登入後可使用帳號雲端歌單。分享／匯入歌單可產生分享 ID，效期一週，未登入也能使用。']},
 {title:'設定投影片與背景',text:['選擇 16:9 或 32:9、文字顏色、歌名頁、下方歌名與頁碼，再檢查投影片預覽。','影片依比例篩選，可按本週／累計匯出次數、名稱或大小升降排序。推薦區列出這台裝置最近匯出用過的影片。','按下方加入歌單按鈕，可保留這首歌的個別設定；歌單會標出非預設項目。「改用共用設定」可取消個別設定。','只有成功產生匯出檔並啟動下載才累計影片使用次數；預覽與點選不計。']},
 {title:'匯出投影與歌曲專案',text:['單首 .show：匯入 FreeShow 使用。歌單歌曲 ZIP：解壓縮後可匯入多首 .show。','FreeShow 專案 .project：含歌曲順序及所需背景影片，完整下載後再匯入。每首歌僅第一張指定影片，後續頁接續使用背景。','本機配對包：完整解壓縮、關閉 FreeShow，再執行 start.cmd。依編號找到同曲會詢問是否覆蓋；選否沿用電腦原曲，找不到則使用下載歌曲。依提示選擇影片資料夾。','PowerPoint：匯出 .pptx，歌單版本下載後先解壓縮。含影片時等待進度完成，不要關閉頁面。']},
 {title:'大字報與敬拜資訊',text:['Word 大字報供帶領者、樂手閱讀或列印；下載後可在 Word 調整列印設定。','敬拜資訊會依歌單順序列出編號、歌名、YouTube 連結與回應歌曲，可複製到群組或下載文字檔。','匯出失敗請保留錯誤訊息再重試；不要把未完成的檔案匯入 FreeShow。']},
 ...(canEdit?[{title:'新增與編輯歌曲',text:['按歌曲列表的「＋」新增歌曲；開啟既有歌曲即可修改歌名、YouTube 連結及歌詞。','每段選歌名、主歌、副歌、尾句、導歌或橋段，旁邊填段落數字；主歌預設 1，其他預設空白，0 顯示空白。可新增、刪除及上下移動段落。','按「儲存修改」或 Ctrl＋S 才會更新資料庫；本機草稿不代表已儲存到雲端。「重置修改」會還原上次儲存內容。','若提示其他裝置已更新，先保留你的修改再重新載入；「修改紀錄」可查看歷次內容。']},{title:'歌詞換行規則',text:['同一行的多個空白整理成一個；合併原本的換行時以兩個空白銜接。','中間空一行表示一定換行；中間空兩行表示一定換頁。','32:9 可合併較短歌詞行，以每頁兩行為主，優先分頁及避免落單行，文字縮小是最後手段。請用投影片預覽確認效果。']}]:[]),
 ...(isAdmin?[{title:'管理員操作',text:['「管理」可新增或停用帳號、指定管理員，編輯姓名及複選小組／身分標籤。','小組標籤可集中新增、改名與刪除；改名會套用到使用它的帳號。','歌曲編號可由管理員修改；遇到已存在的編號先查看衝突歌曲，再使用編號交換功能。修改前先儲存目前歌詞。']}]:[])
 ];
 const index=Math.min(step,steps.length-1),current=steps[index];
 return <><button type="button" className="tutorial-button" onClick={()=>{setStep(0);setDone(false);setOpen(true)}}>使用教學</button><dialog ref={dialog} className="tutorial-dialog" onCancel={e=>{e.preventDefault();close()}} aria-labelledby="tutorial-title"><header><span>{canEdit?'編輯者':'瀏覽與匯出'}教學 · {index+1} / {steps.length}</span><button type="button" aria-label="關閉教學" onClick={close}>×</button></header><h2 id="tutorial-title">{current.title}</h2><TutorialPractice key={`${index}-${open}`} title={current.title} onDone={()=>setDone(true)}/><details><summary>查看這一步的詳細說明</summary><ol>{current.text.map(t=><li key={t}>{t}</li>)}</ol></details><nav aria-label="教學步驟">{steps.map((s,i)=><button key={s.title} aria-label={s.title} aria-current={i===index?'step':undefined} onClick={()=>setStep(i)}>{i+1}</button>)}</nav><footer><button disabled={index===0} onClick={()=>setStep(index-1)}>上一步</button><button onClick={()=>index===steps.length-1?close():setStep(index+1)}>跳過這一步</button><button disabled={!done} className="primary" onClick={()=>index===steps.length-1?close():setStep(index+1)}>{index===steps.length-1?'完成教學':'下一步'}</button></footer></dialog></>;
}
