import handler from 'vinext/server/fetch-handler';
import {GET as background} from '../app/api/backgrounds/[id]/route';
export default {
 fetch(request:Request,env:unknown,ctx:ExecutionContext){
  const match=new URL(request.url).pathname.match(/^\/api\/backgrounds\/([^/]+)$/);
  // Binary transfers do not need the React/router runtime or its response transforms.
  if(request.method==='GET'&&match)return background(request,{params:Promise.resolve({id:decodeURIComponent(match[1])})});
  return handler.fetch(request,env,ctx);
 }
};
