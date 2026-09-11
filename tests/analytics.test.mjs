import test from "node:test";
import assert from "node:assert/strict";
import { dateKey, shiftedDate, formatMinutes, lastSevenDays, seedData } from "../lib/edutrack.ts";

test("as métricas de exemplo refletem as sessões e tarefas cadastradas", () => {
 const data = seedData();
 assert.equal(lastSevenDays(data.sessions).reduce((sum, day) => sum + day.minutes, 0), 540);
 assert.equal(data.tasks.filter(task => task.done).length, 6);
 assert.equal(data.tasks.length, 10);
});
test("a janela móvel contém sete dias, exclui datas antigas e futuras e soma sessões do mesmo dia", () => {
 const sessions = [-7, -6, 0, 0, 1].map((days, index) => ({ id: String(index), subjectId: "mat", date: shiftedDate(days), minutes: 20 }));
 const days = lastSevenDays(sessions);
 assert.equal(days.length, 7);
 assert.equal(days[0].date, shiftedDate(-6));
 assert.equal(days[6].date, dateKey());
 assert.equal(days[6].minutes, 40);
 assert.equal(days.reduce((sum, day) => sum + day.minutes, 0), 60);
});
test("sem sessões, todos os dias têm zero minutos", () => {
 assert.ok(lastSevenDays([]).every(day => day.minutes === 0));
});
test("formatação de minutos completos sem arredondar para cima", () => {
 assert.equal(formatMinutes(0), "0h 00min");
 assert.equal(formatMinutes(59.9), "0h 59min");
 assert.equal(formatMinutes(60), "1h 00min");
 assert.equal(formatMinutes(125), "2h 05min");
});
test("chaves de data mantêm o dia de calendário local e zeros à esquerda", () => {
 assert.equal(dateKey(new Date(2026, 0, 2, 12)), "2026-01-02");
});
