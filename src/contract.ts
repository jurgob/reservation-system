import { initContract } from "@ts-rest/core";
import {z} from "zod";
const c = initContract();

export const EventId = z.custom<`EVT-${ string }`>( data => z.string().startsWith("EVT-").safeParse( data ).success )
export const UserId = z.custom<`USR-${ string }`>( data => z.string().startsWith("USR-").safeParse( data ).success )
export const SeatNumber = z.number().int().positive().min(10).max(1000).brand<"SeatNumber">();

export type EventId = z.infer<typeof EventId>;
export type UserId = z.infer<typeof UserId>;
export type SeatNumber = z.infer<typeof SeatNumber>;


const WrongRequestErrorResponse = z.object({ error: z.string() });  


export const contract = c.router({
    health: {
        method: "GET",
        path: "/health",
        summary: "Health check",
        description: "Check if the service is up and running",
        responses: { 
          201: z.object({ status:z.literal("ok") })
      },
    },
    createEvent: {
      method: "POST",
      path: "/events",
      summary: "Create a new event",
      description: "Create a new event with a given name and total number of seats",
      body: z.object(
        { name: z.string(), totalSeats: SeatNumber}
      ),
      responses: { 
        201: z.object({ eventId: EventId }), 
        400: WrongRequestErrorResponse
    },
    },
    holdSeat: {
      method: "POST",
      path: "/events/:eventId/hold",
      summary: "Hold a seat",
      description: "Hold a seat for a user for a given event",
      pathParams: z.object({ eventId: EventId }),
      body: z.object({ seatNumber: z.number(), userId: UserId }),
      responses: { 
        200: z.object({
              success: z.boolean(), 
              holdExpiresAt: z.string() 
          }), 
        400: WrongRequestErrorResponse
        }
    },
    reserveSeat: {
        method: "POST",
        path: "/events/:eventId/reserve",
        pathParams: z.object({ eventId: EventId }),
        body: z.object({ 
        seatNumber: SeatNumber, 
        userId: UserId 
    }),
        responses: { 
        200: z.object({ success: z.boolean() }), 
        400: WrongRequestErrorResponse 
    }},
    listAvailableSeats: {
        method: "GET",
        path: "/events/:eventId/seats",
        pathParams: z.object({ eventId: EventId }),
        responses: { 
            200: z.object({ 
                availableSeats: z.array(SeatNumber)
            }) 
        }
    },
    getEvent: {
      method: "GET",
      path: "/events/:eventId",
      pathParams: z.object({ eventId: EventId }),
      responses: { 
          200: z.object({ 
            totalSeats: SeatNumber, 
          }) 
      }
    },
  });
