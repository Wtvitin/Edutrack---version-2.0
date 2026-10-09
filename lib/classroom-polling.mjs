export const CLASSROOM_POLL_MS=120000;
export const submissionLabels={UNKNOWN:'Status não disponível no Classroom',NEW:'Não entregue no Classroom',CREATED:'Não entregue no Classroom',TURNED_IN:'Entregue no Classroom',RETURNED:'Devolvida pelo professor',RECLAIMED_BY_STUDENT:'Entrega retirada no Classroom'};

// Injectable clock/events let tests cover lifecycle without waiting two minutes.
export function createClassroomPoller({request,onResult,onError,isVisible,subscribe,now=Date.now,setTimer=setTimeout,clearTimer=clearTimeout}){
  let stopped=false,busy=false,timer=null,controller=null,due=0,failures=0,queued=false;
  function cancelTimer(){if(timer!==null)clearTimer(timer);timer=null;}
  function schedule(){
    cancelTimer();
    if(!stopped&&isVisible())timer=setTimer(()=>void tick(),Math.max(0,due-now()));
  }
  async function tick(force=false){
    cancelTimer();
    if(stopped||!isVisible())return;
    if(busy){queued=queued||force;return;}
    if(!force&&due>now()){schedule();return;}
    busy=true;controller=new AbortController();
    try{
      const result=await request(controller.signal);
      if(stopped)return;
      failures=0;onResult(result);
      const next=Date.parse(result.nextCheckAt);
      due=Math.max(now()+1000,Number.isFinite(next)?next:now()+CLASSROOM_POLL_MS);
    }catch(error){
      if(stopped)return;
      onError(error);
      failures++;due=now()+Math.min(900000,CLASSROOM_POLL_MS*2**Math.min(failures-1,3));
    }finally{busy=false;controller=null;if(queued){queued=false;due=0;}schedule();}
  }
  const unsubscribe=subscribe(()=>void tick(),()=>void tick(true));
  void tick();
  return ()=>{stopped=true;cancelTimer();controller?.abort();unsubscribe();};
}
