"use client";

import {useRef,useState,type MouseEvent} from 'react';
import {ArrowRight,BookOpen,Check,ExternalLink,Layers3,Link2,LockKeyhole,Search,ShieldCheck,Unplug} from 'lucide-react';
import {Dialog,DialogContent,DialogDescription,DialogTitle} from '@/components/ui/dialog';
import {filterIntegrations,integrationCategories,integrations,type Integration,type IntegrationCategory} from '@/lib/integrations';
import Link from './link';

function AppMark({app}:{app:Integration}) {
  return <span className={`integration-app-mark brand-${app.brand}`} aria-hidden="true">{app.symbol}</span>;
}

export function IntegrationsView() {
  const [query,setQuery]=useState('');
  const [category,setCategory]=useState<IntegrationCategory>('all');
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const detailTrigger=useRef<HTMLButtonElement|null>(null);
  const selected=integrations.find(app=>app.id===selectedId);
  const featured=integrations[0];
  const filtered=filterIntegrations(query,category);
  function showDetails(app:Integration,event:MouseEvent<HTMLButtonElement>) {
    detailTrigger.current=event.currentTarget;
    setSelectedId(app.id);
  }
  function clearFilters() {setQuery('');setCategory('all');}

  return <div className="integrations-page">
    <div className="page-heading"><div><div className="eyebrow">SEUS APLICATIVOS, UM SÓ ESPAÇO</div>
      <h1>Seu estudo, conectado<span className="heading-dot">.</span></h1>
      <p>Explore as conexões planejadas para reunir atividades, prazos e compromissos no EduTrack.</p>
    </div><a className="button secondary" href="#integration-catalog"><Layers3 size={17}/>Explorar aplicativos</a></div>

    <div className="integration-preview-notice" role="note"><Unplug size={20}/><p><strong>Catálogo em preparação.</strong> Nenhum aplicativo está conectado nesta versão. Os cards mostram propostas de integração, sem acessar suas contas ou importar dados.</p></div>

    <section className="integration-featured" aria-labelledby="classroom-featured-title">
      <div className="integration-featured-copy"><span className="integration-featured-kicker"><BookOpen size={16}/>EM DESTAQUE</span>
        <div className="integration-featured-title"><AppMark app={featured}/><div><h2 id="classroom-featured-title">Google Classroom</h2><span>Da sala de aula ao seu planejamento.</span></div></div>
        <p>Uma futura conexão para trazer as atividades das suas turmas e organizar cada entrega com mais clareza.</p>
        <ul className="integration-featured-benefits"><li><Check size={16}/>Turmas por disciplina</li><li><Check size={16}/>Atividades e prazos</li><li><Check size={16}/>Importação com revisão</li></ul>
        <div className="integration-featured-actions"><button className="button primary" onClick={e=>showDetails(featured,e)}>Conhecer proposta do Classroom<ArrowRight size={17}/></button><span className="integration-status">Planejada · não conectada</span></div>
      </div>
      <div className="integration-flow-preview" aria-label="Fluxo ilustrativo da futura integração, não é uma conexão ativa"><span className="integration-preview-label">COMO PODERÁ FUNCIONAR</span>
        <div className="integration-flow-source"><AppMark app={featured}/><span><strong>Google Classroom</strong><small>Turmas e atividades autorizadas</small></span></div>
        <div className="integration-flow-bridge"><span/><Link2 size={21}/><span/></div>
        <div className="integration-flow-destination"><span className="integration-edu-mark"><Layers3 size={25}/></span><span><strong>Seu EduTrack</strong><small>Disciplinas, tarefas e calendário</small></span></div>
        <p><LockKeyhole size={14}/>Somente após sua autorização</p>
      </div>
    </section>

    <section className="integration-catalog" id="integration-catalog" aria-labelledby="integration-catalog-title">
      <div className="integration-catalog-heading"><div><h2 id="integration-catalog-title">Aplicativos para sua rotina</h2><p>Encontre a plataforma que você já usa para estudar.</p></div>
        <label className="search-field integration-search"><Search size={18}/><input type="search" aria-label="Buscar aplicativos" placeholder="Buscar aplicativo..." value={query} onChange={e=>setQuery(e.target.value)}/></label>
      </div>
      <div className="integration-catalog-filters"><div className="integration-category-tabs" role="group" aria-label="Filtrar aplicativos por categoria">{integrationCategories.map(item=><button key={item.id} aria-pressed={category===item.id} onClick={()=>setCategory(item.id)}>{item.label}</button>)}</div>
        <p role="status" aria-live="polite">{filtered.length} {filtered.length===1?'aplicativo':'aplicativos'}</p></div>
      {filtered.length?<div className="integration-grid">{filtered.map(app=><article className="integration-card" key={app.id} aria-labelledby={`integration-title-${app.id}`}>
        <div className="integration-card-top"><AppMark app={app}/><span className="integration-status">Planejada</span></div>
        <span className="integration-category-label">{integrationCategories.find(item=>item.id===app.category)?.label}</span><h3 id={`integration-title-${app.id}`}>{app.name}</h3><p>{app.description}</p>
        <ul>{app.proposedFeatures.slice(0,2).map(feature=><li key={feature}><Check size={14}/>{feature}</li>)}</ul>
        <button className="button secondary" aria-label={`Ver proposta de integração com ${app.name}`} onClick={e=>showDetails(app,e)}>Ver proposta<ArrowRight size={16}/></button>
      </article>)}</div>:<div className="integration-empty"><Search size={28}/><h3>Nenhum aplicativo encontrado</h3><p>Tente outro nome ou escolha uma categoria diferente.</p><button className="button secondary" onClick={clearFilters}>Limpar filtros</button></div>}
    </section>

    <section className="integration-how-it-works" aria-labelledby="integration-how-title"><div><span className="eyebrow">CONEXÕES COM CLAREZA</span><h2 id="integration-how-title">Você escolhe o que entra.</h2><p>Este é o fluxo previsto para as futuras integrações. Ele ainda não está ativo.</p></div>
      <ol><li><span>01</span><div><h3>Autorizar</h3><p>Escolher o aplicativo e conferir as permissões solicitadas.</p></div></li><li><span>02</span><div><h3>Revisar</h3><p>Selecionar turmas, listas ou eventos antes de importar.</p></div></li><li><span>03</span><div><h3>Organizar</h3><p>Relacionar atividades às disciplinas e acompanhar os prazos.</p></div></li></ol>
    </section>
    <div className="integration-safety"><ShieldCheck size={21}/><div><h3>Seus dados continuam sob seu controle</h3><p>Esta tela não pede senhas, não inicia login em outros serviços e não envia seus registros para aplicativos externos.</p></div><Link href="/tarefas" className="text-link">Organizar tarefas agora<ArrowRight size={16}/></Link></div>

    <Dialog open={!!selected} onOpenChange={open=>!open&&setSelectedId(null)}><DialogContent className="edu-dialog integration-detail-dialog" onCloseAutoFocus={event=>{event.preventDefault();detailTrigger.current?.focus();}}>
      <DialogTitle>{selected?.name||'Proposta de integração'}</DialogTitle><DialogDescription>Proposta de integração · ainda não disponível no EduTrack.</DialogDescription>
      {selected&&<><AppMark app={selected}/>
        <span className="integration-status">Planejada · não conectada</span><p className="integration-detail-description">{selected.description}</p>
        <div className="integration-detail-features"><h3>Recursos propostos</h3><ul>{selected.proposedFeatures.map(feature=><li key={feature}><Check size={16}/>{feature}</li>)}</ul></div>
        <div className="integration-detail-requirement"><ShieldCheck size={19}/><p>{selected.requirement} Os recursos poderão variar conforme as APIs e permissões disponíveis.</p></div>
        <p className="integration-detail-note">Nenhuma conta será conectada ao fechar ou abrir esta proposta. A autenticação e a sincronização serão implementadas em uma etapa futura.</p>
        <div className="integration-detail-actions"><a className="button secondary" href={selected.officialUrl} target="_blank" rel="noopener noreferrer">Site oficial<ExternalLink size={16}/></a><button className="button primary" onClick={()=>setSelectedId(null)}>Entendi</button></div>
      </>}
    </DialogContent></Dialog>
  </div>;
}
