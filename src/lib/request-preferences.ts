import { cookies } from "next/headers";
import { isValidTimeZone } from "./format";

export const TIME_ZONE_COOKIE = "timeZone";
export const ACTIVE_CHARACTER_COOKIE = "activeCharacter";
export const FALLBACK_TIME_ZONE = "UTC";

/** The browser's time zone as last reported by TimeZoneSync, or null before the first report. */
export async function getReportedTimeZone(): Promise<string | null> {
  const value = (await cookies()).get(TIME_ZONE_COOKIE)?.value;
  if (!value) return null;
  const timeZone = decodeURIComponent(value);
  return isValidTimeZone(timeZone) ? timeZone : null;
}

export async function getTimeZone(): Promise<string> {
  return (await getReportedTimeZone()) ?? FALLBACK_TIME_ZONE;
}

/** Id of the character the header switcher is filtering by, or null for "all characters". */
export async function getActiveCharacterId(
  ownedCharacters: { id: string }[],
): Promise<string | null> {
  const value = (await cookies()).get(ACTIVE_CHARACTER_COOKIE)?.value;
  if (!value) return null;
  return ownedCharacters.some((character) => character.id === value) ? value : null;
}
