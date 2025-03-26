import { createClient,RedisClientType } from "redis";
import {EventId, SeatCounter, EventName,UserId, HoldSeatExpiration, SeatNumber} from "./types"
import {randomUUID} from "crypto"
import {env} from "./env"
import { get } from "http";

export function createEventId():EventId {
    return `EVT-${randomUUID()}`;
}

const HOLD_SEAT_EXPIRATION_DONOT_EXPIRE = 100 * (60 * 60 * 24 * 365); // 100 years in seconds

export function createUserId():UserId {
    return `USR-${randomUUID()}`;
}

export async function createReservationsClient(props: {redisClientInstance?: RedisClientType, userMaxSeats: number} = {userMaxSeats: 10}) {

    const redisClient = createClient({
        url: env.REDIS_URL
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
        if(!totalSeats){
            throw new Error("Event not found")
        }
        
        // I could have parsed this for better correctness, but I choose an unsafe cast for performance reasons
        // correctness is up to the typesystem from the reservationClient pow, while the actual parse is done at the http layer
        const event = await redisClient.hGetAll(eventId) as unknown as {totalSeats: SeatCounter, name: EventName}; 
        return { 
            eventId,
            ...event 
        };
    }

    const holdSeat = async (eventId: EventId, userId: UserId, seatIndex: SeatNumber, holdSeatExpiration?:HoldSeatExpiration|undefined) => {
        holdSeatExpiration = HoldSeatExpiration.parse(holdSeatExpiration);
        const seatKey = seatIndex.toString()
        const hashKey = eventId+":seats"
        await getEvent(eventId);
        /* there are 3 possible way to limit a user to have n max seats.
          1. use a separate hash per user -> this is more performante but it will require more memory
          2. inside the transation, count the keys that have the user id value -> this is the more correct, but the less performant (the transaction will block the hash for more time)
          3. do like the point 2, but before the transaction -> this is the middle ground, is not an issue give that the hash can have no more then 1000 keys, also in some edge case the user could be able to require more then n seat, but I thing is the best trade off in this case
        */
        
        const hash = await redisClient.hGetAll(hashKey);
        const userSeatsCount = Object.values(hash).filter(value => value === userId).length;

        if((userSeatsCount+1) > props.userMaxSeats){
            throw new Error("User has already the maximum number of seats")
        }
            

        const transaction = redisClient.multi();
        transaction.hSetNX(hashKey, seatKey, userId);
        transaction.hExpire(hashKey,seatKey, holdSeatExpiration, "NX");
        const transactionResult =  await transaction.exec();
        const holdResult =  transactionResult[0];
        if(!holdResult)
            throw new Error("Seat is already held")
    }

    const refreshHoldSeat = async (eventId: EventId, userId: UserId, seatIndex: SeatNumber, holdSeatExpiration?:HoldSeatExpiration|undefined) => {
        holdSeatExpiration = HoldSeatExpiration.parse(holdSeatExpiration);
        const seatKey = seatIndex.toString()
        const hashKey = eventId+":seats"
        const holdSeat = await redisClient.hGet(hashKey, seatKey);
        if(typeof holdSeat !== "string" ||holdSeat !== userId){
            throw new Error("Seat is not held by user")
        }
        
        const [expireResult] = await redisClient.hExpire(hashKey,seatKey, holdSeatExpiration, "GT");
        if(expireResult === 0){
            throw new Error("Seat has already expired")
        }
    }

    const reserveSeat = async (eventId: EventId, userId: UserId, seatIndex:SeatNumber) => {
        const seatKey = seatIndex.toString()
        const hashKey = eventId+":seats"
        const holdSeat = await redisClient.hGet(hashKey, seatKey);
        if(typeof holdSeat !== "string" ||holdSeat !== userId){
            throw new Error("Seat is not held by user")
        }
        await redisClient.hExpire(hashKey,seatKey, HOLD_SEAT_EXPIRATION_DONOT_EXPIRE, "XX");
        // await redisClient.hPersist(hashKey, seatKey);

    }

    const getEventSeat = async (eventId: EventId, seatIndex:SeatNumber) => {
        const seatKey = seatIndex.toString()
        const hashKey = eventId+":seats"
        const userId = await redisClient.hGet(hashKey, seatKey);
        return userId as UserId;// I could have parsed this for better correctness, but I choose an unsafe cast for performance reasons
    }

    const getAvailableSeats = async (eventId: EventId): Promise<SeatNumber[]> => {
        const totalSeatsString = await redisClient.hGet(eventId, "totalSeats");
        const totalSeats = SeatCounter.parse(parseInt(totalSeatsString||""));
        const hashKey = eventId+":seats"
        const seatsNotAvailable = await redisClient.hKeys(hashKey);
        const potentialAvailableSeatch = Array.from({"length": totalSeats}, (_,i) => `${i+1}`)
        return potentialAvailableSeatch.filter(seat => !seatsNotAvailable.includes(seat)).map(seat => SeatNumber.parse(seat));
        
    }

    return { createEvent,getEvent,holdSeat,reserveSeat ,getAvailableSeats,getEventSeat,refreshHoldSeat};

}

export type ReservationClient = Awaited<ReturnType<typeof createReservationsClient>>;
export type Event = Awaited<ReturnType<ReservationClient["createEvent"]>>;
