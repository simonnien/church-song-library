export type PrintLine={text:string;size:number};
export const PRINT_SIZE=20;
// A4 11906 twips, 720-twip left/right margins, two columns, 420-twip gap.
// Leave 4pt tolerance for Word's font fallback and rounding.
export const PRINT_WIDTH=(11906-720*2-420)/40-4;
export type Measure=(text:string,size:number)=>number;
export function measurePrintText(text:string,size:number){
 const ctx=typeof document==='undefined'?null:document.createElement('canvas').getContext('2d');
 let width=0;
 for(const chunk of text.match(/[\x00-\x7f]+|[^\x00-\x7f]/gu)||[]){
  if(/^[\x00-\x7f]+$/.test(chunk)){
   if(ctx){ctx.font=`${size}px "Comic Sans MS"`;width+=ctx.measureText(chunk).width}
   else width+=Array.from(chunk).reduce((n,c)=>n+(c===' '?0.35:0.65)*size,0);
  }else{
   if(ctx){ctx.font=`${size}px "MS PGothic"`;width+=Math.max(size,ctx.measureText(chunk).width)}else width+=size;
  }
 }
 return width;
}
export function layoutPrintBlock(text:string,prefix='',measure:Measure=measurePrintText,width=PRINT_WIDTH):PrintLine[]{
 const lines=text.replace(/\r\n?/g,'\n').split('\n').map(s=>s.replace(/[^\S\n]+/gu,' ').trim()).filter(Boolean);
 if(lines.length)lines[0]=prefix+lines[0];
 const result:PrintLine[]=[];
 const fits=(s:string)=>measure(s,PRINT_SIZE)<=width;
 for(let i=0;i<lines.length;i++){
  let line=lines[i];
  // Empty lines within a block do not create gaps in large print.
  // Section spacing is added by the document builder. Merge complete pairs.
  if(line&&lines[i+1]&&fits(line+'  '+lines[i+1])){line+='  '+lines[++i]}
  if(fits(line)){result.push({text:line,size:PRINT_SIZE});continue}
  // Wrap at existing spaces before considering any smaller font.
  let current='';
  for(const word of line.split(' ').filter(Boolean)){
   if(current&&fits(current+' '+word)){current+=' '+word;continue}
   if(current){result.push({text:current,size:PRINT_SIZE});current=''}
   if(fits(word)){current=word;continue}
   // An unbroken phrase is the only case allowed to shrink; never split it.
   const size=Math.max(.5,Math.floor(PRINT_SIZE*width/measure(word,PRINT_SIZE)*2)/2);
   result.push({text:word,size});
  }
  if(current)result.push({text:current,size:PRINT_SIZE});
 }
 return result;
}
