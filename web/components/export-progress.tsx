import type {ExportProgress as Progress} from '@/lib/export-progress';
export default function ExportProgress({progress}:{progress:Progress|null}){
 if(!progress)return null;
 return <div className="export-progress-overlay"><section className="export-progress-card" role="dialog" aria-modal="true" aria-label="匯出進度" aria-busy="true"><h2>正在匯出</h2><p role="status" aria-live="polite">{progress.label}</p><div className="export-progress-track" role="progressbar" aria-label={progress.label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percent}><span className={progress.percent===undefined?'indeterminate':''} style={progress.percent===undefined?undefined:{width:`${progress.percent}%`}}/></div><small>{progress.percent===undefined?'處理中，請稍候…':`${progress.percent}%`} · 請保持此頁開啟</small></section></div>;
}
