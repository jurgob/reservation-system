import { createClient } from "redis";
import type {EventId} from "./contract"
import {randomUUID} from "crypto"


export async function createReservationsClient(){
    const redisClient = createClient();
    await redisClient.connect();
    console.log(`REDIS_URL: ${process.env.REDIS_URL}`);
    
    const createEvent = async ( totalSeats: number) => {
        const eventId:EventId = `EVT-${randomUUID()}`;
        await redisClient.set(eventId, totalSeats);
        return { eventId };
    }

    const getEvent = async (eventId: EventId) => {
        const totalSeatsString = await redisClient.get(eventId);
        const totalSeats = parseInt(totalSeatsString||"0");
        return { totalSeats };
    }

   
    return { createEvent,getEvent }

}
