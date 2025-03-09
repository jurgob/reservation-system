

import { describe, it, expect,beforeEach } from 'vitest';
import { createReservationsClient, createUserId, ReservationClient, Event} from './reservations_client';
import { SeatCounter, EventName, UserId, HoldSeatExpiration } from './types';
function sleep(seconds: number) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

describe('Reservations Client', () => {
  let reservationsClient:ReservationClient;  
  beforeEach(async () => {
    reservationsClient = await createReservationsClient();
  });

  it('should create an event', async () => {
    const totalSeats = SeatCounter.parse(10);
    const name = EventName.parse('Ibiza Beach Party');
    const newEvent = await reservationsClient.createEvent({totalSeats, name});
    expect(newEvent.eventId).toBeTypeOf('string');
    expect(newEvent.eventId.startsWith('EVT-')).toBe(true); 
  });

  describe('Given an event and a userA', () => {

    let newEvent:Event;
    let userAId:UserId;
    
    beforeEach(async () => {
      const totalSeats = SeatCounter.parse(10);
      const name = EventName.parse('Ibiza Beach Party');
      newEvent = await reservationsClient.createEvent({totalSeats, name});
      userAId = createUserId();
    });

    it('should hold an event without throwing', async () => {  
        const holdSeatPromise = reservationsClient.holdSeat(newEvent.eventId, userAId, 7);
        await expect(holdSeatPromise).resolves.not.toThrow();
      });
    
      it('should hold an event', async () => {   
        await reservationsClient.holdSeat(newEvent.eventId, userAId, 1);
        const availableSeats = await reservationsClient.getAvailableSeats(newEvent.eventId);
        expect(availableSeats).toEqual(["2","3","4","5","6","7","8","9","10"]);
      });
    
      it('should reserve an holded seat', async () => {
        const eventId = newEvent.eventId;
        await reservationsClient.holdSeat(eventId, userAId, 1);
        await reservationsClient.reserveSeat(eventId, userAId, 1);
        const availableSeats = await reservationsClient.getAvailableSeats(newEvent.eventId);
    
        expect(availableSeats).toEqual(["2","3","4","5","6","7","8","9","10"]);
      });
    
      it('should fail when reserving a seat which was not holded', async () => {
        const eventId = newEvent.eventId;
        const reservePromise = reservationsClient.reserveSeat(eventId, userAId, 1);
        await expect(reservePromise).rejects.toThrow();
      });
      
      it('if userA hold a seat, userB reserveSeat attemp should fail', async () => {
        const eventId = newEvent.eventId;
        const userBId = createUserId();
        await reservationsClient.holdSeat(eventId, userAId, 1);
        const secondReserveSeatPromise = reservationsClient.reserveSeat(eventId, userBId, 1);

        await expect(secondReserveSeatPromise).rejects.toThrow();
      });

      it('if userA hold a seat, userB hold attemp should fail', async () => {
        const eventId = newEvent.eventId;
        const userBId = createUserId();
        await reservationsClient.holdSeat(eventId, userAId, 1);

        const secondHoldSeatPromise = reservationsClient.holdSeat(eventId, userBId, 1);

        await expect(secondHoldSeatPromise).rejects.toThrow();
      });

      it('should hold an event and unhold it after 1 second', async () => {
        const seatHoldExpirationSeconds = HoldSeatExpiration.parse(1);
        await reservationsClient.holdSeat(newEvent.eventId, userAId, 1, seatHoldExpirationSeconds);
        await sleep(seatHoldExpirationSeconds + 1);
        const availableSeats = await reservationsClient.getAvailableSeats(newEvent.eventId);
        expect(availableSeats).toEqual(["1","2","3","4","5","6","7","8","9","10"]);
      });
  })
});

