import { initContract } from "@ts-rest/core";
import {z} from "zod";
import { EventId, SeatCounter, UserId,EventName, HoldSeatExpiration } from "./types";
const c = initContract();
const ForbiddenErrorResponse = z.object({ error: z.string() });  
const WrongRequestErrorResponse = z.object({ issues: z.array(z.object({})),name: z.string() });  

export const contract = c.router({
  health: {
      method: "GET",
      path: "/health",
      summary: "Health check",
      description: "Check if the service is up and running",
      responses: { 
        200: z.object({ status:z.literal("ok") })
    },
  },
  createEvent: {
    method: "POST",
    path: "/events",
    summary: "Create a new event",
    description: "Create a new event with a given name and total number of seats",
    body: z.object(
      {
          name: EventName, 
          totalSeats: SeatCounter
      }
    ),
    responses: { 
      201: z.object({ eventId: EventId }), 
      400: WrongRequestErrorResponse,
      403: ForbiddenErrorResponse
  },
  },
  holdSeat: {
    method: "POST",
    path: "/events/:eventId/hold",
    summary: "Hold a seat",
    description: "Hold a seat for a user for a given event",
    pathParams: z.object({
        eventId: EventId 
    }),
    body: z.object({ 
      seatNumber: z.number(), 
      userId: UserId,
      expireIn: HoldSeatExpiration,
      refresh: z.boolean().optional().default(false)
    }),
    responses: { 
      201: z.object({
          success: z.literal(true) 
        }), 
      400: WrongRequestErrorResponse,
      403: ForbiddenErrorResponse
      }
  },
  reserveSeat: {
    method: "POST",
    path: "/events/:eventId/reserve",
    summary: "Reserve a seat",
    description: "Reserve a seat for a user for a given event",
    pathParams: z.object({ 
      eventId: EventId 
    }),
    body: z.object({ 
      seatNumber: z.number(), 
      userId: UserId,
    }),
    responses: { 
      201: z.object({ 
        success: z.literal(true) 
      }), 
      400: WrongRequestErrorResponse,
      403: ForbiddenErrorResponse
  }},
  listAvailableSeats: {
      method: "GET",
      path: "/events/:eventId/seats",
      summary: "List available seats",
      description: "List available seats for a given event",
      pathParams: z.object({ 
        eventId: EventId 
      }),
      responses: { 
          200: z.object({ 
              availableSeats: z.array(z.number())
          }),
          400: WrongRequestErrorResponse,
          403: ForbiddenErrorResponse 
      }
  },
  getEvent: {
    method: "GET",
    path: "/events/:eventId",
    summary: "Get an event",
    description: "Get an event by its id",
    pathParams: z.object({ 
      eventId: EventId 
    }),
    responses: { 
        200: z.object({ 
          totalSeats: SeatCounter, 
          name: EventName
        }),
        400: WrongRequestErrorResponse,
        403: ForbiddenErrorResponse 
    }
  },
});
