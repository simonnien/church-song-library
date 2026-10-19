export const BACKGROUNDS = [
 {id:'1CdCNIGxi3fVZelOiFBgFg2VWh8Zxbv4F',name:'光芒',bytes:22490334},
 {id:'1FfQHYWRgsiOKIEnSDUcPLNJSXTYe8V_1',name:'白圓環',bytes:2401572},
 {id:'1VtKCOyXpXZbtNRjCzgXoyA-qClMtKB_r',name:'煙',bytes:37924527},
 {id:'1hWqqLg5NgwNiyz_JfS9XiiA7XCD5rvoL',name:'線條滑動',bytes:93329424},
 {id:'16b2AHl2C36PD4xykCzpaWIyn7IDPlqsm',name:'閃光條文',bytes:266397190},
];
export const backgroundById=(id?:string)=>BACKGROUNDS.find(v=>v.id===id);
export const backgroundUrl=(id:string)=>`/api/backgrounds/${encodeURIComponent(id)}`;
export const exportColor=(color?:string)=>/^#[0-9a-f]{6}$/i.test(color||'')?color!:'#FFFF00';
export const SITE_ORIGIN='https://church-song-library.bluechub6.chatgpt.site';
