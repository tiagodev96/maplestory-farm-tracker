import { AppHeader } from "@/components/app-header";
import { TimeZoneSync } from "@/components/time-zone-sync";
import { getActiveGrind, listCharacters } from "@/features/grind/queries";
import { requireUser } from "@/lib/current-user";
import {
  getActiveCharacterId,
  getReportedTimeZone,
  TIME_ZONE_COOKIE,
} from "@/lib/request-preferences";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [characters, activeGrind, reportedTimeZone] = await Promise.all([
    listCharacters(),
    getActiveGrind(),
    getReportedTimeZone(),
  ]);
  const activeCharacterId = await getActiveCharacterId(characters);

  return (
    <>
      <TimeZoneSync cookieName={TIME_ZONE_COOKIE} reportedTimeZone={reportedTimeZone} />
      <AppHeader
        userName={user.name}
        characters={characters}
        activeCharacterId={activeCharacterId}
        hasActiveGrind={activeGrind !== null}
      />
      <main className="mx-auto max-w-[1180px] px-4 pb-24 pt-5 md:pb-8">{children}</main>
    </>
  );
}
