import { callerRepository } from "../repositories/callers";

export function getCallerTeamIds(userId: string): Promise<string[]> {
  return callerRepository.teamIdsForUser(userId);
}
