import { createClient } from "redis";
import {EventId, SeatNumber} from "./contract"
import {randomUUID} from "crypto"


export async function createReservationsClient(){
    const redisClient = createClient({
        url: process.env.REDIS_URL
    });
    await redisClient.connect();
    
    const createEvent = async ( totalSeats: SeatNumber) => {
        const eventId:EventId = `EVT-${randomUUID()}`;
        await redisClient.set(eventId, totalSeats);
        return { eventId };
    }

    const getEvent = async (eventId: EventId) => {
        const totalSeatsString = await redisClient.get(eventId);
        const totalSeats = SeatNumber.parse(totalSeatsString);
        return { totalSeats };
    }

   
    return { createEvent,getEvent }

}
