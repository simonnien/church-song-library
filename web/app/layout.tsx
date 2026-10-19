import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'詩歌書房｜教會歌曲資料庫',description:'尋找詩歌、整理歌詞，製作每一次敬拜的投影片。'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="zh-Hant"><body>{children}</body></html>}
