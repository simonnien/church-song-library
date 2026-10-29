import {freeShowTextLayout} from '@/lib/exports';
export default function FreeShowPreview({lines}:{lines:string[]}){
 const t=freeShowTextLayout(lines,'32:9');
 return <svg viewBox="0 0 1920 540" aria-label="32:9 FreeShow 歌詞預覽" style={{position:'absolute',inset:0,width:'100%',height:'100%',overflow:'hidden',pointerEvents:'none'}}>
 <foreignObject x={t.left} y={t.top} width={t.width} height={t.height}>
 <div style={{padding:'4.8px 9.6px',fontFamily:t.font,fontSize:t.size,fontWeight:'bold',lineHeight:t.lineHeight,textAlign:'center',whiteSpace:'pre',WebkitTextStrokeWidth:t.stroke,boxSizing:'border-box'}}>{lines.map((line,i)=><div key={i}>{line||'\u00a0'}</div>)}</div>
 </foreignObject></svg>;
}
