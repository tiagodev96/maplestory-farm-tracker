import { listSessions } from "@/features/grind/queries";
import { getCurrentUser } from "@/lib/current-user";
import { expGained } from "@/lib/exp-table";
import { dayKey, formatDayKey, formatTime } from "@/lib/format";
import { mesosGained, netProfit } from "@/lib/grind-math";
import { getTimeZone } from "@/lib/request-preferences";

const MS_PER_MINUTE = 60_000;
// Excel needs the byte order mark to read the file as UTF-8, and pt-BR Excel splits columns on ";".
const UTF8_BYTE_ORDER_MARK = String.fromCharCode(0xfeff);
const COLUMN_SEPARATOR = ";";

const HEADINGS = [
  "Data",
  "Personagem",
  "Monstro",
  "Mapa",
  "Party",
  "Hora início",
  "Hora fim",
  "Minutos",
  "Mesos início",
  "Mesos fim",
  "Mesos ganhos",
  "Drops",
  "Suprimentos",
  "Lucro líquido",
  "Lv início",
  "EXP início",
  "Lv fim",
  "EXP fim",
  "EXP ganho",
  "Notas",
];

function quote(value: string | number | null): string {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export async function GET(): Promise<Response> {
  if (!(await getCurrentUser())) {
    return new Response("Unauthorized", { status: 401 });
  }

  const [sessions, timeZone] = await Promise.all([listSessions(null), getTimeZone()]);
  const oldestFirst = sessions.toReversed();
  const rows = oldestFirst.map((session) => [
    formatDayKey(dayKey(session.startedAt, timeZone)),
    session.characterName,
    session.monster,
    session.map,
    session.isParty ? "sim" : "não",
    formatTime(session.startedAt, timeZone),
    formatTime(session.endedAt, timeZone),
    Math.round(session.activeMs / MS_PER_MINUTE),
    session.mesosStart,
    session.mesosEnd,
    mesosGained(session),
    session.dropsValue,
    session.suppliesCost,
    netProfit(session),
    session.levelStart,
    session.expStart,
    session.levelEnd,
    session.expEnd,
    expGained(session),
    session.notes,
  ]);
  const lines = [HEADINGS, ...rows].map((row) => row.map(quote).join(COLUMN_SEPARATOR));
  const fileName = `farm-tracker-${dayKey(Date.now(), timeZone)}.csv`;

  return new Response(UTF8_BYTE_ORDER_MARK + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
