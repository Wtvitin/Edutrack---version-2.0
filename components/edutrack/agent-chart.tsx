"use client";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ChartSpecification } from './agent-api';

function isChartSpecification(value: unknown): value is ChartSpecification {
  if (!value || typeof value !== 'object') return false;
  const chart = value as Partial<ChartSpecification>;
  return typeof chart.type === 'string' && typeof chart.title === 'string' && Array.isArray(chart.data) && Array.isArray(chart.series) && chart.series.length > 0 && typeof chart.xAxis?.field === 'string' && typeof chart.yAxis?.field === 'string' && typeof chart.source?.tool === 'string' && typeof chart.datasetVersion === 'string';
}

export function AgentChart({ chart }: { chart: ChartSpecification }) {
  if (!isChartSpecification(chart)) return <p className="form-feedback error">Gráfico inválido.</p>;
  const data = chart.data;
  const series = chart.series.slice(0, 8);
  const axis = <><CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/><XAxis dataKey={chart.xAxis.field} stroke="var(--muted-foreground)"/><YAxis stroke="var(--muted-foreground)"/><Tooltip/></>;
  const chartBody = chart.type === 'bar' || chart.type === 'comparison' ? <BarChart data={data}>{axis}{series.map(item => <Bar key={item.field} dataKey={item.field} name={item.label} fill="#9b8aff" radius={[5, 5, 0, 0]}/>)}</BarChart> : chart.type === 'area' ? <AreaChart data={data}>{axis}{series.map(item => <Area key={item.field} type="monotone" dataKey={item.field} name={item.label} stroke="#9b8aff" fill="#9b8aff" fillOpacity={0.2}/>)}</AreaChart> : <LineChart data={data}>{axis}{series.map(item => <Line key={item.field} type="monotone" dataKey={item.field} name={item.label} stroke="#9b8aff" strokeWidth={2}/>)}</LineChart>;
  return <section className="panel agent-chart" aria-label={chart.title}><div className="panel-heading"><h3>{chart.title}</h3></div>{chart.description&&<p className="section-description">{chart.description}</p>}<div className="interactive-chart"><ResponsiveContainer width="100%" height="100%">{chartBody}</ResponsiveContainer></div></section>;
}
