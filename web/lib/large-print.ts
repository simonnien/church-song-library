import template from './large-print-template.json';
import type {Song} from './model';
import {download} from './exports';
import {planName,type WorshipInfo} from './playlist';
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
export function largePrintXml(songs:Song[]){
 const p=(text:string,bold=false)=>`<w:p><w:pPr><w:snapToGrid w:val="0"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="atLeast"/>${bold?'<w:keepNext/>':''}</w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="新細明體"/><w:sz w:val="38"/><w:szCs w:val="38"/>${bold?'<w:b/>':''}</w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`;
 const prefix=(b:Song['blocks'][number])=>b.type==='主歌'?(b.number||'1')+'. ':({'副歌':'c. ','橋段':'b. ','導歌':'p. ','尾句':'t. '} as Record<string,string>)[b.type]||b.type+' ';
 const body=songs.map(s=>p('【'+s.title+'】',true)+s.blocks.filter(b=>!b.type.startsWith('歌名')).map(b=>b.text.replace(/\r\n/g,'\n').split('\n').map((line,i)=>p((i===0?prefix(b):'')+line)).join('')).join('')).join('');
 return template['word/document.xml'].replace(/<w:body>/,'<w:body>'+body);
}
export async function largePrintBlob(songs:Song[]){
 if(!songs.length)throw Error('請先加入歌曲');const {default:JSZip}=await import('jszip');const zip=new JSZip();
 for(const [name,xml] of Object.entries(template))zip.file(name,xml);
 zip.file('word/document.xml',largePrintXml(songs));
 zip.file('[Content_Types].xml','<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/fontTable.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml"/><Override PartName="/word/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/></Types>');
 zip.file('_rels/.rels','<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
 zip.file('word/_rels/document.xml.rels','<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rIdTheme" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/><Relationship Id="rIdFonts" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable" Target="fontTable.xml"/></Relationships>');
 return zip.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
}
export async function exportLargePrint(songs:Song[],info:WorshipInfo){download(planName(info)+'-大字報.docx',await largePrintBlob(songs),'application/vnd.openxmlformats-officedocument.wordprocessingml.document');}
