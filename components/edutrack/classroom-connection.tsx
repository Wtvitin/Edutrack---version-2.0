"use client";
import {useCallback,useEffect,useState} from 'react';
import {Link2,RefreshCw,ShieldCheck,Unplug} from 'lucide-react';
import {AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle,AlertDialogTrigger} from '@/components/ui/alert-dialog';
import {api} from './account-store';
import Link from './link';

type Status={configured:boolean;connected:boolean;lastSyncAt:string|null;selectedCourseIds:string[]};
type Course={id:string;name:string;section:string};
type ImportResult={created:number;updated:number;unchanged:number;skippedDeleted:number;subjectsCreated:number};
const callbackMessages:Record<string,string>={
  connected:'Classroom autorizado. Escolha suas turmas para importar as atividades.',
  'classroom-denied':'Você cancelou a autorização. Nenhuma conta foi conectada.',
  'classroom-state':'A autorização expirou ou já foi utilizada. Clique em conectar novamente.',
  'classroom-scope':'É necessário autorizar a leitura das turmas e atividades.',
  'classroom-scope-response':'O Google retornou a autorização sem informar as permissões concedidas. A conexão não foi salva; o diagnóstico seguro está disponível no servidor.',
  'classroom-scope-both':'O Google não confirmou as permissões de leitura das turmas e atividades nesta autorização. Confira os dois acessos e tente conectar novamente.',
  'classroom-scope-courses':'O Google não confirmou a permissão de leitura das turmas nesta autorização. Autorize esse acesso ao reconectar.',
  'classroom-scope-coursework':'O Google não confirmou a permissão de leitura das suas atividades nesta autorização. Autorize esse acesso ao reconectar.',
  'classroom-scope-no-courses':'O Google retornou uma permissão alternativa, mas não há turmas ativas como aluno para validar a leitura das atividades. Confira se está usando a conta que possui suas turmas.',
  'classroom-scope-api-denied':'A conta foi autorizada no Google, mas a API negou a leitura das atividades. Confira a Classroom API e as regras de acesso da instituição. A conexão não foi salva.',
  'classroom-reconnect':'Reconecte o Classroom e confirme as permissões solicitadas.',
  'classroom-session':'Entre no EduTrack novamente antes de conectar o Classroom.',
  'classroom-failed':'Não foi possível conectar. Confira sua sessão, as credenciais e o endereço de retorno no Google.',
};
export function ClassroomConnection({mode,saving,onImported}:{mode:'account'|'demo';saving:boolean;onImported:()=>Promise<void>}){
  const [status,setStatus]=useState<Status|null>(null),[courses,setCourses]=useState<Course[]>([]);
  const [selected,setSelected]=useState<string[]>([]),[busy,setBusy]=useState(false),[loading,setLoading]=useState(mode==='account');
  const [error,setError]=useState(''),[notice,setNotice]=useState(''),[result,setResult]=useState<ImportResult|null>(null);
  const load=useCallback(async()=>{
    setLoading(true);setError('');
    try{
      const next=await api<Status>('/integrations/classroom/status');setStatus(next);
      if(next.connected&&next.configured){
        const response=await api<{courses:Course[]}>('/integrations/classroom/courses');
        setCourses(response.courses);setSelected(next.selectedCourseIds.filter(id=>response.courses.some(c=>c.id===id)));
      }else{setCourses([]);setSelected([]);}
    }catch(e){setError(e instanceof Error?e.message:'Não foi possível carregar a conexão.');}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{
    if(mode!=='account')return;
    const params=new URLSearchParams(window.location.search),outcome=params.get('classroom');
    if(outcome&&callbackMessages[outcome]){
      setNotice(callbackMessages[outcome]);params.delete('classroom');
      window.history.replaceState(null,'',window.location.pathname+(params.size?'?'+params.toString():'')+window.location.hash);
    }
    void load();
  },[mode,load]);
  async function connect(){
    setBusy(true);setError('');
    try{
      await window.edutrackFlush?.();
      const response=await api<{authorizationUrl:string}>('/integrations/classroom/connect',{});
      const url=new URL(response.authorizationUrl);
      if(url.protocol!=='https:'||url.hostname!=='accounts.google.com')throw new Error('Endereço de autorização inválido.');
      window.location.assign(url.href);
    }catch(e){setError(e instanceof Error?e.message:'Não foi possível iniciar a autorização.');setBusy(false);}
  }
  async function sync(){
    setBusy(true);setError('');setNotice('');setResult(null);
    try{
      await window.edutrackFlush?.();
      const snapshot=await api<{revision:number}>('/data');
      const imported=await api<ImportResult>('/integrations/classroom/sync',{courseIds:selected,revision:snapshot.revision});
      setResult(imported);
      try{await onImported();await load();}catch{setError('A importação foi concluída, mas a interface não atualizou. Recarregue a página.');}
    }catch(e){setError(e instanceof Error?e.message:'Não foi possível importar as atividades.');}
    finally{setBusy(false);}
  }
  async function disconnect(){
    setBusy(true);setError('');setResult(null);
    try{
      await api('/integrations/classroom/disconnect',{});
      setNotice('Conexão removida. As tarefas e disciplinas já importadas foram mantidas.');await load();
    }catch(e){setError(e instanceof Error?e.message:'Não foi possível desconectar.');}
    finally{setBusy(false);}
  }
  const disabled=busy||saving||loading;
  return <section className="classroom-connection" id="classroom-connection" aria-labelledby="classroom-connection-title" aria-busy={busy||loading}>
    <div className="classroom-connection-heading"><div><h2 id="classroom-connection-title">Sua conexão com o Classroom</h2><p>Importação manual, somente de leitura. Nenhum trabalho será enviado ou alterado no Google.</p></div><span className="integration-status">{mode==='demo'?'Demonstração':loading?'Verificando…':status?.connected?'Conectado':status?.configured?'Pronto para conectar':'Não configurado'}</span></div>
    {mode==='demo'?<p className="classroom-info">A demonstração não conecta contas externas. <Link href="/login" className="text-link">Entre na sua conta para conectar</Link>.</p>:<>
      {notice&&<p className="classroom-info" role="status">{notice}</p>}
      {error&&<p className="classroom-error" role="alert">{error}</p>}
      {loading&&<p role="status" className="classroom-info">Carregando sua conexão e suas turmas…</p>}
      {!loading&&status&&!status.configured&&<p className="classroom-info">Este servidor precisa do JSON OAuth e da chave de proteção dos tokens. Consulte a configuração do Classroom no projeto.</p>}
      {!loading&&status?.configured&&<div className="classroom-actions"><button className="button primary" disabled={disabled} onClick={()=>void connect()}><Link2 size={17}/>{status.connected?'Reconectar Google':'Conectar Google Classroom'}</button>
        {status.connected&&<><button className="button secondary" disabled={disabled} onClick={()=>void load()}><RefreshCw size={17}/>Atualizar turmas</button><AlertDialog><AlertDialogTrigger asChild><button className="button secondary" disabled={disabled}><Unplug size={17}/>Desconectar</button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Desconectar o Classroom?</AlertDialogTitle><AlertDialogDescription>O acesso no Google será revogado e os tokens locais serão removidos. Suas tarefas e disciplinas importadas permanecerão no EduTrack.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={()=>void disconnect()}>Desconectar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></>}
      </div>}
      {!loading&&status?.connected&&<>
        <fieldset className="classroom-courses" disabled={disabled}><legend>Escolha até 20 turmas para importar</legend><p>Todas as atividades publicadas e disponíveis para você nas turmas escolhidas serão importadas. Cada turma terá uma disciplina própria.</p>
          {courses.length?courses.map(course=><label className="classroom-course" key={course.id}><input type="checkbox" checked={selected.includes(course.id)} onChange={event=>setSelected(previous=>event.target.checked?[...previous,course.id]:previous.filter(id=>id!==course.id))} disabled={disabled||!selected.includes(course.id)&&selected.length>=20}/><span><strong>{course.name}</strong>{course.section&&<small>{course.section}</small>}</span></label>):!error&&<p>Nenhuma turma ativa encontrada para você como aluno. Confira a conta Google usada e, se necessário, as permissões da instituição.</p>}
        </fieldset>
        <div className="classroom-sync-footer"><button className="button primary" disabled={disabled||!selected.length} onClick={()=>void sync()}><RefreshCw size={17}/>{busy?'Aguarde…':'Sincronizar atividades'}{!busy&&selected.length>0?` (${selected.length} ${selected.length===1?'turma':'turmas'})`:''}</button><p>Última sincronização: {status.lastSyncAt?new Date(status.lastSyncAt).toLocaleString('pt-BR'):'ainda não realizada'}</p></div>
      </>}
      {result&&<p className="classroom-info" role="status">Importação concluída: {result.created} novas, {result.updated} atualizadas e {result.unchanged} sem alterações. {result.subjectsCreated} disciplinas criadas.{result.skippedDeleted>0?` ${result.skippedDeleted} atividades removidas no EduTrack não foram recriadas.`:''} <Link href="/tarefas" className="text-link">Ver tarefas</Link></p>}
      {!loading&&!status&&<button className="button secondary" disabled={busy} onClick={()=>void load()}>Tentar novamente</button>}
    </>}
    <p className="classroom-permissions"><ShieldCheck size={17}/>Tokens protegidos no servidor. Prioridades, conclusões, estimativas e alterações pessoais são preservadas. O calendário mostra o dia em Brasília; consulte a origem para o horário exato. Sincronizar não marca entregas do Google como concluídas.</p>
  </section>;
}
