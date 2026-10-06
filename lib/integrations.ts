export const integrationCategories = [
  {id:'all', label:'Todos'},
  {id:'classroom', label:'Salas de aula'},
  {id:'organization', label:'Organização'},
  {id:'calendar', label:'Calendários'},
] as const;

export type IntegrationCategory = typeof integrationCategories[number]['id'];
export type Integration = {
  id:string;
  name:string;
  category:Exclude<IntegrationCategory,'all'>;
  brand:string;
  symbol:string;
  description:string;
  proposedFeatures:readonly string[];
  requirement:string;
  officialUrl:string;
  status:'planned';
};

// A catalog, not a connection registry. No credentials, OAuth or sync are implemented here.
export const integrations:readonly Integration[] = [
  {id:'google-classroom',name:'Google Classroom',category:'classroom',brand:'classroom',symbol:'GC',
    description:'Turmas, atividades e prazos do seu ambiente de aula.',
    proposedFeatures:['Importar atividades das turmas escolhidas','Associar turmas às disciplinas do EduTrack','Revisar títulos e prazos antes de importar'],
    requirement:'A futura conexão dependerá da autorização Google e das permissões da sua instituição.',
    officialUrl:'https://edu.google.com/workspace-for-education/products/classroom/',status:'planned'},
  {id:'microsoft-teams',name:'Microsoft Teams',category:'classroom',brand:'teams',symbol:'T',
    description:'Atividades e entregas do Teams for Education.',
    proposedFeatures:['Consultar atividades das equipes de estudo','Trazer datas de entrega para o planejamento','Vincular equipes às suas disciplinas'],
    requirement:'A futura conexão dependerá de uma conta educacional e da autorização da instituição.',
    officialUrl:'https://www.microsoft.com/en-us/education/products/teams',status:'planned'},
  {id:'moodle',name:'Moodle',category:'classroom',brand:'moodle',symbol:'M',
    description:'Cursos e atividades do ambiente virtual da sua instituição.',
    proposedFeatures:['Selecionar cursos para acompanhar','Revisar atividades e prazos disponíveis','Organizar atividades por disciplina'],
    requirement:'A disponibilidade dependerá da versão e dos serviços habilitados pela instituição no Moodle.',
    officialUrl:'https://moodle.org/',status:'planned'},
  {id:'canvas',name:'Canvas LMS',category:'classroom',brand:'canvas',symbol:'C',
    description:'Disciplinas, trabalhos e entregas do Canvas.',
    proposedFeatures:['Consultar trabalhos dos cursos escolhidos','Trazer datas de entrega para o EduTrack','Revisar a origem de cada atividade'],
    requirement:'A futura conexão dependerá da instância Canvas e das permissões fornecidas pela instituição.',
    officialUrl:'https://www.instructure.com/products/canvas',status:'planned'},
  {id:'notion',name:'Notion',category:'organization',brand:'notion',symbol:'N',
    description:'Listas, páginas e planejamento pessoal de estudos.',
    proposedFeatures:['Selecionar uma base de tarefas para importar','Relacionar propriedades de título, prazo e disciplina','Revisar os itens antes de adicioná-los'],
    requirement:'A futura conexão dependerá das páginas autorizadas e da estrutura da sua base no Notion.',
    officialUrl:'https://www.notion.com/product',status:'planned'},
  {id:'google-calendar',name:'Google Agenda',category:'calendar',brand:'google-calendar',symbol:'31',
    description:'Eventos e compromissos para organizar sua rotina.',
    proposedFeatures:['Escolher calendários para consultar','Visualizar compromissos junto aos prazos de estudo','Revisar quais eventos entrarão no planejamento'],
    requirement:'A futura conexão dependerá da autorização Google para os calendários escolhidos.',
    officialUrl:'https://workspace.google.com/products/calendar/',status:'planned'},
];

function normalize(value:string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
}

export function filterIntegrations(query:string, category:IntegrationCategory='all') {
  const term=normalize(query.trim());
  return integrations.filter(item=>(category==='all'||item.category===category)&&
    normalize(`${item.name} ${item.description}`).includes(term));
}
