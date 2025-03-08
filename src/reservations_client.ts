import { createClient,RedisClientType } from "redis";
import {EventId, SeatCounter, EventName,UserId} from "./types"
import {randomUUID} from "crypto"


function createEventId():EventId {
    return `EVT-${randomUUID()}`;
}

export function createUserId():UserId {
    return `USR-${randomUUID()}`;
}

const DEFAULT_SEAT_HOLD_EXPIRATION_SECONDS = 60

export async function createReservationsClient(props: {redisClientInstance?: RedisClientType, seatHoldExpirationSeconds?: number} = {}) {
    const seatHoldExpirationSeconds = props.seatHoldExpirationSeconds || DEFAULT_SEAT_HOLD_EXPIRATION_SECONDS;
    const redisClient = createClient({
        url: process.env.REDIS_URL
    });

    await redisClient.connect();
    
    const createEvent = async ( props: {totalSeats: SeatCounter, name: EventName}) => {
        const {totalSeats, name} = props;
        const eventId = createEventId();
        await redisClient.hSet(eventId, "totalSeats", totalSeats);
        await redisClient.hSet(eventId, "name", name);
        

        return { eventId };
    }

    const getEvent = async (eventId: EventId) => {
        const totalSeats = await redisClient.hGet(eventId, "totalSeats");
        
        // I could have parsed this for better correctness, but I choose an unsafe cast for performance reasons
        // correctness is up to the typesystem from the reservationClient pow, while the actual parse is done at the http layer
        const event = await redisClient.hGetAll(eventId) as unknown as {totalSeats: SeatCounter, name: EventName}; 
        return { 
            eventId,
            ...event 
        };
    }

    const holdSeat = async (eventId: EventId, userId: UserId, seatIndex: number) => {
        const seatKey = seatIndex.toString()
        const hashKey = eventId+":seats"
        const holdResult = await redisClient.hSetNX(hashKey, seatKey, userId);
        if(!holdResult)
            throw new Error("Seat is already held")
        await redisClient.hExpire(hashKey,seatKey, seatHoldExpirationSeconds, "NX");

    }

    const reserveSeat = async (eventId: EventId, userId: UserId, seatIndex:number) => {
        // const trans = redisClient.multi();
        const seatKey = seatIndex.toString()
        const hashKey = eventId+":seats"
        const holdSeat = await redisClient.hGet(hashKey, seatKey);
        if(typeof holdSeat !== "string" ||holdSeat !== userId){
            throw new Error("Seat is not held by user")
        }
        await redisClient.hPersist(hashKey, seatKey);

    }

    const getAvailableSeats = async (eventId: EventId) => {
        const totalSeatsString = await redisClient.hGet(eventId, "totalSeats");
        const totalSeats = SeatCounter.parse(parseInt(totalSeatsString||""));
        const hashKey = eventId+":seats"
        const seatsNotAvailable = await redisClient.hKeys(hashKey);
        const potentialAvailableSeatch = Array.from({"length": totalSeats}, (_,i) => `${i+1}`)
        return potentialAvailableSeatch.filter(seat => !seatsNotAvailable.includes(seat))
        
    }

    return { createEvent,getEvent,holdSeat,reserveSeat ,getAvailableSeats};

}

export type ReservationClient = Awaited<ReturnType<typeof createReservationsClient>>;
export type Event = Awaited<ReturnType<ReservationClient["createEvent"]>>;
