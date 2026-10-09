export function readStudyTimer(raw,subject='none') {
  const fallback={subject,accumulated:0,startedAt:null};
  try {
    const timer=JSON.parse(raw);
    if(timer&&typeof timer.subject==='string'&&Number.isFinite(timer.accumulated)&&timer.accumulated>=0&&(timer.startedAt===null||Number.isFinite(timer.startedAt)))return {subject:timer.subject,accumulated:timer.accumulated,startedAt:timer.startedAt};
  } catch {}
  return fallback;
}

/** @param {{subject:string}} timer */
export function resetStudyTimer(timer) {
  return {subject:timer.subject,accumulated:0,startedAt:null};
}
