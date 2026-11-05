export async function readApiJson(response:Response){
 if(!response.headers.get('content-type')?.includes('application/json')){
  await response.body?.cancel();
  throw Error(`網站服務暫時無法回傳資料（HTTP ${response.status}），請稍後重新載入。`);
 }
 try{return await response.json();}catch{throw Error('資料傳輸中斷，請重新載入。');}
}
export async function getApiJson(url:string){
 for(let attempt=0;attempt<3;attempt++){
  try{const response=await fetch(url,{cache:'no-store'});const data=await readApiJson(response);if(!response.ok)throw Error(data.error||`讀取失敗（HTTP ${response.status}）`);return data;}
  catch(error){if(attempt===2)throw error;await new Promise(resolve=>setTimeout(resolve,500*(attempt+1)));}
 }
}
