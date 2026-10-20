// Browser-history boundary for the phone's list/detail flow. Preserve router state.
export function createSongNavigation(win:Window,render:(view:string)=>void,leave:()=>boolean){
 let view='list';
 const state=(screen:string)=>({...win.history.state,songLibraryView:screen});
 win.history.replaceState(state('list'),'');
 const pop=(event:PopStateEvent)=>{
  const next=event.state?.songLibraryView==='detail'?'detail':'list';
  if(view==='detail'&&next==='list'&&!leave()){win.history.pushState(state('detail'),'');return;}
  view=next;render(view);
 };
 win.addEventListener('popstate',pop);
 return {
  open(){if(view!=='detail'&&win.matchMedia('(max-width:760px)').matches)win.history.pushState(state('detail'),'');view='detail';render(view)},
  back(){if(view==='detail'&&win.history.state?.songLibraryView==='detail')win.history.back();else if(leave()){view='list';render(view)}},
  dispose(){win.removeEventListener('popstate',pop)}
 };
}
