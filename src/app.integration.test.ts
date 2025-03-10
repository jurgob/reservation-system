import {createClient, ApiClient} from './client';
import {createApp,ApiServer} from './app';
import { it, describe,expect,beforeAll, afterAll } from 'vitest';
import { AddressInfo } from 'node:net';
import { EventId } from './types';
import { createUserId } from './reservations_client';

describe('APP http endpoint', () => {
    let client: ApiClient;
    let mockServer: ApiServer;
    
    beforeAll(async () => {
        mockServer = (await createApp()).listen(0);
        console.log("created")
        const port = (mockServer.address() as AddressInfo)?.port;
        const address = `http://localhost:${port}`;
        client = createClient({
            baseUrl: address
        })        
    });

    afterAll(async () => {
        await mockServer.close();
    });   

    it('should get health status', async () => {
        const totalSeats = 10;
        const name = 'Ibiza Beach Party';
        const healthResponse = await client.health();
        
        expect(healthResponse.status).toBe(200);
    })

    it('should create an event', async () => {
        const totalSeats = 10;
        const name = 'Ibiza Beach Party';
        const newEvent = await client.createEvent({body:{
            totalSeats, name
        }});
        if(newEvent.status === 201){
            newEvent.body
        }
        
        expect(newEvent.status).toBe(201);
    })

    describe('Given an Event', () => {
        let eventId: EventId;
        beforeAll(async () => {
            const totalSeats = 10;
            const name = 'Ibiza Beach Party';
            const newEvent = await client.createEvent({body:{
                totalSeats, name
            }});
            if(newEvent.status !== 201){
                throw new Error("Event creation failed")
            }
            eventId = newEvent.body.eventId;
        });

        it('should get an event', async () => {
            const event = await client.getEvent({params:{eventId}});
            expect(event.status).toBe(200);
        })

        it('should be able to hold a seat', async () => {
            const userId = createUserId();
            const holdSeatResponse = await client.holdSeat({params:{eventId},body:{seatNumber:1,userId}});
            expect(holdSeatResponse.status).toBe(201);
        })

        it('should be able to get event seats', async () => {
            const userId = createUserId();
            const holdSeatResponse = await client.listAvailableSeats({params:{eventId}});
            expect(holdSeatResponse.status).toBe(200);
        })

        it('should be able to hold and researve a seat', async () => {
            const userId = createUserId();
            const seatNumber = 1;
            const holdSeatResponse = await client.holdSeat({params:{eventId},body:{seatNumber,userId}});
            if(holdSeatResponse.status !== 201){
                throw new Error("Hold seat failed")
            }
            const reserveSeatResponse = await client.reserveSeat({params:{eventId},body:{seatNumber,userId}});
            expect(reserveSeatResponse.status).toBe(201);
        })
 
    });



})

