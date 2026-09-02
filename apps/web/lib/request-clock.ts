import { connection } from "next/server";

/** Opt into request time so render stays pure for the linter. */
export async function requestClock(): Promise<Date> {
  await connection();
  return new Date();
}
