import { z } from "zod";
const date=z.string().refine(v=>v===""||(/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(`${v}T12:00:00`))),"Invalid date");
export const studyDataSchema=z.object({
 version:z.literal(1),
 profile:z.object({name:z.string().trim().min(1).max(80),goal:z.string().max(300)}),
 subjects:z.array(z.object({id:z.string().min(1),name:z.string().min(1).max(60),color:z.enum(["blue","purple","green","rose","orange"]),description:z.string().max(200)})),
 tasks:z.array(z.object({id:z.string().min(1),title:z.string().min(1).max(140),subjectId:z.string(),due:date,done:z.boolean(),priority:z.enum(["normal","alta"]),description:z.string().max(1500)})),
 sessions:z.array(z.object({id:z.string().min(1),subjectId:z.string(),date:date.refine(v=>v!==""),minutes:z.number().int().min(1)})),
});
