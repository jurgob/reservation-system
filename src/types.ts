import {z} from "zod";

export const EventId = z.custom<`EVT-${ string }`>( data => z.string().startsWith("EVT-").safeParse( data ).success )
export const UserId = z.custom<`USR-${ string }`>( data => z.string().startsWith("USR-").safeParse( data ).success )
export const SeatCounter = z.number().int().positive().min(10).max(1000).brand<"SeatNumber">();
export const EventName = z.string().min(1).max(100).brand<"EventName">();

export type EventId = z.infer<typeof EventId>;
export type UserId = z.infer<typeof UserId>;
export type SeatCounter = z.infer<typeof SeatCounter>;
export type EventName = z.infer<typeof EventName>;