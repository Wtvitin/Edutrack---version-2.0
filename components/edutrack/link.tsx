"use client";
import type { ComponentProps } from "react";
import {navigateTo} from './navigation';

// Native navigation keeps the demo usable even when the preview router fails.
export default function Link({ href, onClick, ...props }: ComponentProps<"a"> & { href: string }) {
  return <a href={href} {...props} onClick={event=>{
    onClick?.(event);
    if(event.defaultPrevented||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||event.button!==0||props.target||!href.startsWith("/")||!window.edutrackFlush)return;
    event.preventDefault();void navigateTo(href);
  }}/>;
}
