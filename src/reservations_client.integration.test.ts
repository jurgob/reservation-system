

import { describe, it, expect,beforeEach } from 'vitest';
import { createReservationsClient, createUserId, ReservationClient, Event} from './reservations_client';
import { SeatCounter, EventName, UserId, HoldSeatExpiration } from './types';
function sleep(seconds: number) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

describe('Reservations Client max user seat limit per event ', () => {
  let reservationsClient:ReservationClient; 
  let newEvent:Event;
  let userAId:UserId;

  beforeEach(async () => {
    reservationsClient = await createReservationsClient({userMaxSeats:1});
    const totalSeats = SeatCounter.parse(10);
    const name = EventName.parse('Exlusive Ibiza Beach Party');
    newEvent = await reservationsClient.createEvent({totalSeats, name});
    userAId = createUserId();

  });

  it('should fail to hold 2 seat for the same user ', async () => {
    await reservationsClient.holdSeat(newEvent.eventId, userAId, 1);
    await expect(reservationsClient.holdSeat(newEvent.eventId, userAId, 2)).rejects.toThrow();
  });

  it('should fail to hold 2 seat for the same user, the seats list should be correct ', async () => {
    await reservationsClient.holdSeat(newEvent.eventId, userAId, 1);
    await reservationsClient.holdSeat(newEvent.eventId, userAId, 2).catch(e => "error");
    const availableSeats = await reservationsClient.getAvailableSeats(newEvent.eventId);
    expect(availableSeats).toEqual(["2","3","4","5","6","7","8","9","10"]);
  });

  it('should fail to hold 2 seat for the same user, a differennt user should be able to book the seat,  the seats list should be correct ', async () => {
    const userBId = createUserId();
    await reservationsClient.holdSeat(newEvent.eventId, userAId, 1);
    await reservationsClient.holdSeat(newEvent.eventId, userAId, 2).catch(e => "error");
    await reservationsClient.holdSeat(newEvent.eventId, userBId, 2);
    const availableSeats = await reservationsClient.getAvailableSeats(newEvent.eventId);
    expect(availableSeats).toEqual(["3","4","5","6","7","8","9","10"]);
  });

});


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

    it('should fail to refreshHoldSeat an event not previusly holded', async () => {   
      const refreshHoldSeatError = await reservationsClient.refreshHoldSeat(newEvent.eventId, userAId, 1).catch(e => "expectedRefreshHoldSeatError");
      const availableSeats = await reservationsClient.getAvailableSeats(newEvent.eventId)
      expect(refreshHoldSeatError).toBe("expectedRefreshHoldSeatError");
      expect(availableSeats).toEqual(["1","2","3","4","5","6","7","8","9","10"]);
    });


    it('should be able to reserve a seat after refreshHoldSeat', async () => {  
      await reservationsClient.holdSeat(newEvent.eventId, userAId, 1); 
      await reservationsClient.refreshHoldSeat(newEvent.eventId, userAId, 1)
      await reservationsClient.reserveSeat(newEvent.eventId, userAId, 1);
      const availableSeats = await reservationsClient.getAvailableSeats(newEvent.eventId)
      expect(availableSeats).toEqual(["2","3","4","5","6","7","8","9","10"]);
    });

    it('should not be able to refreshHoldSeat after reserveSeat', async () => {  
      await reservationsClient.holdSeat(newEvent.eventId, userAId, 1); 
      await reservationsClient.reserveSeat(newEvent.eventId, userAId, 1);
      const refreshError = await reservationsClient.refreshHoldSeat(newEvent.eventId, userAId, 1).catch(e => "expectedRefreshHoldSeatError");
      expect(refreshError).toBe("expectedRefreshHoldSeatError");

      const availableSeats = await reservationsClient.getAvailableSeats(newEvent.eventId)
      expect(availableSeats).toEqual(["2","3","4","5","6","7","8","9","10"]);
    });

    it('should be able to hold 2 different seat in the same event', async () => {   
      await reservationsClient.holdSeat(newEvent.eventId, userAId, 1);
      await reservationsClient.holdSeat(newEvent.eventId, userAId, 2);
      const availableSeats = await reservationsClient.getAvailableSeats(newEvent.eventId);
      expect(availableSeats).toEqual(["3","4","5","6","7","8","9","10"]);
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

    it('if userA researved a seat, userB hold attemp should fail', async () => {
      const eventId = newEvent.eventId;
      const userBId = createUserId();
      await reservationsClient.holdSeat(eventId, userAId, 1);
      await reservationsClient.reserveSeat(eventId, userAId, 1);

      const secondHoldSeatPromise = reservationsClient.holdSeat(eventId, userBId, 1);

      await expect(secondHoldSeatPromise).rejects.toThrow();
    });

    it('if userA researved a seat, userB reserveSeat attemp should fail', async () => {
      const eventId = newEvent.eventId;
      const userBId = createUserId();
      await reservationsClient.holdSeat(eventId, userAId, 1);
      await reservationsClient.reserveSeat(eventId, userAId, 1);

      const secondHoldSeatPromise = reservationsClient.reserveSeat(eventId, userBId, 1);

      await expect(secondHoldSeatPromise).rejects.toThrow();
    });

    it('should hold an event and unhold it after 1 second', async () => {
      const seatHoldExpirationSeconds = HoldSeatExpiration.parse(1);
      await reservationsClient.holdSeat(newEvent.eventId, userAId, 1, seatHoldExpirationSeconds);
      await sleep(seatHoldExpirationSeconds + 1);
      const availableSeats = await reservationsClient.getAvailableSeats(newEvent.eventId);
      expect(availableSeats).toEqual(["1","2","3","4","5","6","7","8","9","10"]);
    });

    
});


describe('Reservations Client - expire tests', () => {
  let reservationsClient:ReservationClient;
  let newEvent:Event;
  let userAId:UserId;
      
  beforeEach(async () => {
    reservationsClient = await createReservationsClient();
    const totalSeats = SeatCounter.parse(10);
    const name = EventName.parse('Ibiza Beach Party');
    newEvent = await reservationsClient.createEvent({totalSeats, name});
    userAId = createUserId();
  });
  it('if user a hold an refresh it, user b should fail to reserve it', async () => {
    const seatHoldExpirationSeconds = HoldSeatExpiration.parse(1);
    const seatRefreshHoldExpirationSeconds = HoldSeatExpiration.parse(3);
    const eventId = newEvent.eventId;
    const userBId = createUserId();
    // userA holds seat 1
    await reservationsClient.holdSeat(eventId, userAId, 1, seatHoldExpirationSeconds);
    await reservationsClient.refreshHoldSeat(eventId, userAId, 1, seatRefreshHoldExpirationSeconds);
    
    const userBHoldFail = await reservationsClient.holdSeat(eventId, userBId, 1, seatHoldExpirationSeconds).catch(e => "userBHoldFail");
    expect(userBHoldFail).toBe("userBHoldFail");

    const availableSeats = await reservationsClient.getAvailableSeats(eventId);
    expect(availableSeats).toEqual(["2","3","4","5","6","7","8","9","10"]);

    // userA seat should be available
    await sleep(seatRefreshHoldExpirationSeconds + 1);
    const availableSeatsAfterExpiration = await reservationsClient.getAvailableSeats(eventId);
    expect(availableSeatsAfterExpiration).toEqual(["1","2","3","4","5","6","7","8","9","10"]);
  });


  it('if user a hold a seat and user b fail to hold the same seat, the hold should expire regulary', async () => {
    const seatHoldExpirationSeconds = HoldSeatExpiration.parse(1);
    const seatHoldExpirationUserBSeconds = HoldSeatExpiration.parse(5);
    const eventId = newEvent.eventId;
    const userBId = createUserId();
    // userA holds seat 1
    await reservationsClient.holdSeat(eventId, userAId, 1, seatHoldExpirationSeconds);
    // userB try to holod holds seat 1 and fail
    const fail = await reservationsClient.holdSeat(eventId, userBId, 1, seatHoldExpirationUserBSeconds).catch(e => "userbfail");
    expect(fail).toBe("userbfail");

    // userA seat should be available after 2 seconds
    await sleep(seatHoldExpirationSeconds + 1);
    const availableSeats = await reservationsClient.getAvailableSeats(eventId);
    expect(availableSeats).toEqual(["1","2","3","4","5","6","7","8","9","10"]);
  });

  it('if user a hold+reserve a seat and user b fail to hold the same seat, the seat should be assinged', async () => {
    const seatHoldExpirationSeconds = HoldSeatExpiration.parse(10);
    const seatHoldExpirationUserBSeconds = HoldSeatExpiration.parse(1);

    const eventId = newEvent.eventId;
    const userBId = createUserId();
    // userA holds and researve seat 1
    await reservationsClient.holdSeat(eventId, userAId, 1, seatHoldExpirationSeconds);
    await reservationsClient.reserveSeat(eventId, userAId, 1);
    // userB try to holod holds seat 1 and fail
    const fail = await reservationsClient.holdSeat(eventId, userBId, 1, seatHoldExpirationUserBSeconds).catch(e => "userbfail");
    expect(fail).toBe("userbfail");

    // if the userB would have beeen able to set the ttl for seat1, then at this point the seat would be available (becase userB ttl is expired at this point).
    await sleep(seatHoldExpirationUserBSeconds + 1);
    const availableSeats = await reservationsClient.getAvailableSeats(eventId);
    expect(availableSeats).toEqual(["2","3","4","5","6","7","8","9","10"]);

    await expect(reservationsClient.getEventSeat(eventId, 1)).resolves.toBe(userAId);
  });
})

});
