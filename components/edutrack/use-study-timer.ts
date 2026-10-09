"use client";
import {useCallback,useMemo,useSyncExternalStore} from 'react';
import {toast} from 'sonner';
import {readStudyTimer} from '@/lib/study-timer.mjs';

type TimerState={subject:string;accumulated:number;startedAt:number|null};
const fallbackSnapshots=new Map<string,string>();
function subscribe(onChange:()=>void){
  window.addEventListener('storage',onChange);
  window.addEventListener('edutrack-timer-update',onChange);
  return ()=>{window.removeEventListener('storage',onChange);window.removeEventListener('edutrack-timer-update',onChange);};
}
const emptySnapshot=()=>'';
const clientReady=()=>true;
const serverReady=()=>false;

export function useStudyTimer(accountId:string|undefined,subject:string){
  const key=`edutrack-timer-${accountId||'demo'}`;
  const snapshot=useCallback(()=>{
    if(fallbackSnapshots.has(key))return fallbackSnapshots.get(key)!;
    try{return localStorage.getItem(key)||'';}catch{return '';}
  },[key]);
  const raw=useSyncExternalStore(subscribe,snapshot,emptySnapshot);
  const loaded=useSyncExternalStore(subscribe,clientReady,serverReady);
  const timer=useMemo(()=>readStudyTimer(raw,subject) as TimerState,[raw,subject]);
  const setTimer=useCallback((update:(previous:TimerState)=>TimerState)=>{
    const next=update(readStudyTimer(snapshot(),subject) as TimerState);
    const value=JSON.stringify(next);
    try{localStorage.setItem(key,value);fallbackSnapshots.delete(key);}
    catch{fallbackSnapshots.set(key,value);toast.error('O cronômetro está temporariamente em memória; não foi possível salvar neste navegador.');}
    window.dispatchEvent(new Event('edutrack-timer-update'));
  },[key,snapshot,subject]);
  return {timer,setTimer,loaded};
}
