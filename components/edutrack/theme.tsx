"use client";
import {ThemeProvider as Provider,useTheme} from 'next-themes';
import {Moon,Sun} from 'lucide-react';
export function ThemeProvider({children}:{children:React.ReactNode}){return <Provider attribute="class" defaultTheme="system" enableSystem storageKey="edutrack-theme">{children}</Provider>;}
export function ThemeToggle({onTheme}:{onTheme?:(theme:'dark'|'light')=>void}){const {resolvedTheme,setTheme}=useTheme();return <button className="icon-button" title="Alternar modo claro/escuro" aria-label="Alternar modo claro/escuro" onClick={()=>{const next=resolvedTheme==='dark'?'light':'dark';setTheme(next);onTheme?.(next);}}><Sun size={20} className="dark-only"/><Moon size={20} className="light-only"/></button>;}
