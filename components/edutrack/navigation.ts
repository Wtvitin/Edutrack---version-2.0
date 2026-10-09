"use client";
import {internalDestination} from '@/lib/navigation.mjs';

// A full document load resets account state after login/logout and retains the
// native navigation fallback. Pending account writes must finish first.
export async function navigateTo(path:string){
  const destination=internalDestination(path,window.location.origin);
  await window.edutrackFlush?.();
  window.location.assign(destination);
}
