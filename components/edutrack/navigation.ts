"use client";
import {internalDestination,canNavigateWithinStudy} from '@/lib/navigation.mjs';

// A full document load resets account state after login/logout and retains the
// native navigation fallback. Pending account writes must finish first.
export async function navigateTo(path:string){
  const destination=internalDestination(path,window.location.origin);
  await window.edutrackFlush?.();
  window.location.assign(destination);
}

// All study tabs render in the same client workspace. History updates keep its
// store mounted; Next synchronizes usePathname and browser Back/Forward.
export async function navigateWithinStudy(path:string){
  if(!canNavigateWithinStudy(path,window.location.href))return navigateTo(path);
  const destination=internalDestination(path,window.location.origin);
  await window.edutrackFlush?.();
  window.history.pushState(null,'',destination);
  requestAnimationFrame(()=>{
    const hash=new URL(destination).hash;
    const target=hash?document.getElementById(decodeURIComponent(hash.slice(1))):document.getElementById('main-content');
    target?.focus({preventScroll:true});
    if(hash)target?.scrollIntoView({behavior:'instant'});
    else window.scrollTo({top:0,behavior:'instant'});
  });
}
