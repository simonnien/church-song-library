export type ExportProgress = {label:string; percent?:number};
export type ReportProgress = (progress:ExportProgress)=>void;
export const yieldForPaint=()=>new Promise<void>(resolve=>setTimeout(resolve,30));
export const zipProgress=(report?:ReportProgress)=>(metadata:{percent:number})=>report?.({label:'正在封裝下載檔案',percent:Math.min(99,Math.round(metadata.percent))});
