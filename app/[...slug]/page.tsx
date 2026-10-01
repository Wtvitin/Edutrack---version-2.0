import { notFound } from "next/navigation";
import EduTrack from "@/components/edutrack/app";
const pages = new Set(["disciplinas","tarefas","calendario","sessoes","progresso","relatorios","agente","perfil","configuracoes","ajuda","inicio","login","cadastro","recuperar-senha","nova-senha","verificar-email","primeiros-passos","privacidade","termos","demo","emails-locais","notificacoes","historico"]);
export default async function Page({params}:{params:Promise<{slug:string[]}>}) {
 const {slug}=await params;
 if(!pages.has(slug[0]) || (slug.length>1 && (slug[0]!=="disciplinas" || slug.length>2))) notFound();
 return <EduTrack initialPage={slug.join("/")}/>;
}
