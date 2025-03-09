import {z} from "zod";

export const EventId = z.custom<`EVT-${ string }`>( data => z.string().startsWith("EVT-").safeParse( data ).success )
export const UserId = z.custom<`USR-${ string }`>( data => z.string().startsWith("USR-").safeParse( data ).success )
export const SeatCounter = z.number().int().positive().min(10).max(1000).brand<"SeatNumber">();
export const EventName = z.string().min(1).max(100).brand<"EventName">();
const HOLD_SEAT_EXPIRATION_DEFAULT_INTERNAL = 60;
export const HoldSeatExpiration = z.number().int().positive().min(1).max(HOLD_SEAT_EXPIRATION_DEFAULT_INTERNAL).default(HOLD_SEAT_EXPIRATION_DEFAULT_INTERNAL).brand<"HoldSeatExpiration">();


export type EventId = z.infer<typeof EventId>;
export type UserId = z.infer<typeof UserId>;

/**
 * The number of seats available for an event
 * it must be between 10 and 1000
 */
export type SeatCounter = z.infer<typeof SeatCounter>;

/**
 * The name of the event
 * it must be between 1 and 100 characters
 */    
export type EventName = z.infer<typeof EventName>;

/**
 * The number of seconds a seat is held before it is released
 * @default 60
 * @min 10
 * @max 60
 */
export type HoldSeatExpiration = z.infer<typeof HoldSeatExpiration>;
export const HOLD_SEAT_EXPIRATION_DEFAULT = HOLD_SEAT_EXPIRATION_DEFAULT_INTERNAL as HoldSeatExpiration;