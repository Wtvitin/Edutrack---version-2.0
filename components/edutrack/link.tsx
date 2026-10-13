"use client";
import type { ComponentProps } from "react";
import {navigateWithinStudy} from './navigation';
import {toast} from 'sonner';
import {isSameDocumentDestination} from '@/lib/navigation.mjs';

// Keep native links for new tabs, external destinations and auth boundaries.
export default function Link({ href, onClick, ...props }: ComponentProps<"a"> & { href: string }) {
  return <a href={href} {...props} onClick={event=>{
    onClick?.(event);
    if(event.defaultPrevented||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||event.button!==0||props.target||props.download||!href.startsWith("/")||!window.edutrackFlush)return;
    if(isSameDocumentDestination(href,window.location.href)){event.preventDefault();return;}
    event.preventDefault();void navigateWithinStudy(href).catch(()=>toast.error('Não foi possível abrir a aba. Tente novamente.'));
  }}/>;
}
