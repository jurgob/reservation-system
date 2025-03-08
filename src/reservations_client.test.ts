

import { describe, it, expect,beforeEach } from 'vitest';
import { createReservationsClient, ReservationClient} from './reservations_client';
import { SeatNumber, EventName } from './types';
function sleep(seconds: number) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

describe('Reservations Client', () => {
  let reservationsClient:ReservationClient;  
  beforeEach(async () => {
    reservationsClient = await createReservationsClient();
  });

  it('should create an event', async () => {
    const totalSeats = SeatNumber.parse(10);
    const name = EventName.parse('Ibiza Beach Party');
    const newEvent = await reservationsClient.createEvent({totalSeats, name});
    expect(newEvent.eventId).toBeTypeOf('string');
    expect(newEvent.eventId.startsWith('EVT-')).toBe(true); 
  });

  it('should hold an event without throwing', async () => {
    const totalSeats = SeatNumber.parse(10);
    const name = EventName.parse('Ibiza Beach Party');
    const newEvent = await reservationsClient.createEvent({totalSeats, name});
    
     const holdSeatPromise = reservationsClient.holdSeat(newEvent.eventId, 'USR-123', 7);
    await expect(holdSeatPromise).resolves.not.toThrow();
   
  });

  it('should hold an event', async () => {
    const totalSeats = SeatNumber.parse(10);
    const name = EventName.parse('Ibiza Beach Party');
    const reservation = await reservationsClient.createEvent({totalSeats, name});
    await reservationsClient.holdSeat(reservation.eventId, 'USR-123', 1);
    const availableSeats = await reservationsClient.getAvailableSeats(reservation.eventId);
    expect(availableSeats).toEqual(["2","3","4","5","6","7","8","9","10"]);
  });

});

describe('Reservations Client expire tests', () => {
    let reservationsClient:ReservationClient;  
    const seatHoldExpirationSeconds = 1;

    beforeEach(async () => {
      reservationsClient = await createReservationsClient({seatHoldExpirationSeconds});
    });
  
    it('should hold an event and unhold it after 1 second', async () => {
      const totalSeats = SeatNumber.parse(10);
      const name = EventName.parse('Ibiza Beach Party');
      const reservation = await reservationsClient.createEvent({totalSeats, name});
      await reservationsClient.holdSeat(reservation.eventId, 'USR-123', 1);
      await sleep(seatHoldExpirationSeconds + 1);
      const availableSeats = await reservationsClient.getAvailableSeats(reservation.eventId);
      expect(availableSeats).toEqual(["1","2","3","4","5","6","7","8","9","10"]);
    });
  });


