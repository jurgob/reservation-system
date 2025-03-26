

import { describe, it, expect,beforeEach } from 'vitest';
import { createReservationsClient, createUserId,createEventId, ReservationClient, Event} from './reservations_client';
import { SeatCounter, EventName, UserId, HoldSeatExpiration ,SeatNumber} from './types';
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
    await reservationsClient.holdSeat(newEvent.eventId, userAId, SeatNumber.parse(1));
    await expect(reservationsClient.holdSeat(newEvent.eventId, userAId, SeatNumber.parse(2))).rejects.toThrow();
  });

  it('should fail to hold 2 seat for the same user, the seats list should be correct ', async () => {
    await reservationsClient.holdSeat(newEvent.eventId, userAId, SeatNumber.parse(1));
    await reservationsClient.holdSeat(newEvent.eventId, userAId, SeatNumber.parse(2)).catch(e => "error");
    const availableSeats = await reservationsClient.getAvailableSeats(newEvent.eventId);
    expect(availableSeats).toEqual(["2","3","4","5","6","7","8","9","10"].map(s => SeatNumber.parse(s)));
  });

  it('should fail to hold 2 seat for the same user, a differennt user should be able to book the seat,  the seats list should be correct ', async () => {
    const userBId = createUserId();
    await reservationsClient.holdSeat(newEvent.eventId, userAId, SeatNumber.parse(1));
    await reservationsClient.holdSeat(newEvent.eventId, userAId, SeatNumber.parse(2)).catch(e => "error");
    await reservationsClient.holdSeat(newEvent.eventId, userBId, SeatNumber.parse(2));
    const availableSeats = await reservationsClient.getAvailableSeats(newEvent.eventId);
    expect(availableSeats).toEqual(["3","4","5","6","7","8","9","10"].map(s => SeatNumber.parse(s)));
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
  it('getEvent should fail retriving a not-existing event', async () => {
    const userAId = createUserId();
    const notExistingEventId = createEventId();
    const holdSeatPromise = reservationsClient.getEvent(notExistingEventId);
    await expect(holdSeatPromise).rejects.toThrow(); ;
  });
  
  it('should fail to hold a set to a not-existing event', async () => {
    const userAId = createUserId();
    const notExistingEventId = createEventId();
    const holdSeatPromise = reservationsClient.holdSeat(notExistingEventId, userAId, SeatNumber.parse(1));
    await expect(holdSeatPromise).rejects.toThrow(); ;
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
      const holdSeatPromise = reservationsClient.holdSeat(newEvent.eventId, userAId, SeatNumber.parse(7));
      await expect(holdSeatPromise).resolves.not.toThrow();
    });
  
    it('should hold an event', async () => {   
      await reservationsClient.holdSeat(newEvent.eventId, userAId, SeatNumber.parse(1));
      const availableSeats = await reservationsClient.getAvailableSeats(newEvent.eventId);
      expect(availableSeats).toEqual(["2","3","4","5","6","7","8","9","10"].map(s => SeatNumber.parse(s)));
    });

    it('should fail to refreshHoldSeat an event not previusly holded', async () => {   
      const refreshHoldSeatError = await reservationsClient.refreshHoldSeat(newEvent.eventId, userAId, SeatNumber.parse(1)).catch(e => "expectedRefreshHoldSeatError");
      const availableSeats = await reservationsClient.getAvailableSeats(newEvent.eventId)
      expect(refreshHoldSeatError).toBe("expectedRefreshHoldSeatError");
      expect(availableSeats).toEqual([1,2,3,4,5,6,7,8,9,10]);
    });


    it('should be able to reserve a seat after refreshHoldSeat', async () => {  
      const seatNumber = SeatNumber.parse(1);
      await reservationsClient.holdSeat(newEvent.eventId, userAId, seatNumber); 
      await reservationsClient.refreshHoldSeat(newEvent.eventId, userAId, seatNumber)
      await reservationsClient.reserveSeat(newEvent.eventId, userAId, seatNumber);
      const availableSeats = await reservationsClient.getAvailableSeats(newEvent.eventId)
      expect(availableSeats).toEqual(["2","3","4","5","6","7","8","9","10"].map(s => SeatNumber.parse(s)));
    });

    it('should not be able to refreshHoldSeat after reserveSeat', async () => {  
      const seatNumber = SeatNumber.parse(1);

      await reservationsClient.holdSeat(newEvent.eventId, userAId, seatNumber); 
      await reservationsClient.reserveSeat(newEvent.eventId, userAId, seatNumber);
      const refreshError = await reservationsClient.refreshHoldSeat(newEvent.eventId, userAId, seatNumber).catch(e => "expectedRefreshHoldSeatError");
      expect(refreshError).toBe("expectedRefreshHoldSeatError");

      const availableSeats = await reservationsClient.getAvailableSeats(newEvent.eventId)
      expect(availableSeats).toEqual(["2","3","4","5","6","7","8","9","10"].map(s => SeatNumber.parse(s)));
    });

    it('should be able to hold 2 different seat in the same event', async () => {   
      await reservationsClient.holdSeat(newEvent.eventId, userAId, SeatNumber.parse(1));
      await reservationsClient.holdSeat(newEvent.eventId, userAId, SeatNumber.parse(2));
      const availableSeats = await reservationsClient.getAvailableSeats(newEvent.eventId);
      expect(availableSeats).toEqual(["3","4","5","6","7","8","9","10"].map(s => SeatNumber.parse(s)));
    });
  
    it('should reserve an holded seat', async () => {
      const eventId = newEvent.eventId;
      const seatNumber = SeatNumber.parse(1);
      await reservationsClient.holdSeat(eventId, userAId, seatNumber);
      await reservationsClient.reserveSeat(eventId, userAId, seatNumber);
      const availableSeats = await reservationsClient.getAvailableSeats(newEvent.eventId);
  
      expect(availableSeats).toEqual(["2","3","4","5","6","7","8","9","10"].map(s => SeatNumber.parse(s)));
    });
    
    it('should fail when reserving a seat which was not holded', async () => {
      const eventId = newEvent.eventId;
      const reservePromise = reservationsClient.reserveSeat(eventId, userAId, SeatNumber.parse(1));
      await expect(reservePromise).rejects.toThrow();
    });
    
    it('if userA hold a seat, userB reserveSeat attemp should fail', async () => {
      const eventId = newEvent.eventId;
      const userBId = createUserId();
      const seatNumber = SeatNumber.parse(1);
      await reservationsClient.holdSeat(eventId, userAId, seatNumber);
      const secondReserveSeatPromise = reservationsClient.reserveSeat(eventId, userBId, seatNumber);

      await expect(secondReserveSeatPromise).rejects.toThrow();
    });

    it('if userA hold a seat, userB hold attemp should fail', async () => {
      const eventId = newEvent.eventId;
      const userBId = createUserId();
      const seatNumber = SeatNumber.parse(1);

      await reservationsClient.holdSeat(eventId, userAId, seatNumber);

      const secondHoldSeatPromise = reservationsClient.holdSeat(eventId, userBId, seatNumber);

      await expect(secondHoldSeatPromise).rejects.toThrow();
    });

    it('if userA researved a seat, userB hold attemp should fail', async () => {
      const eventId = newEvent.eventId;
      const userBId = createUserId();
      const seatNumber = SeatNumber.parse(1);

      await reservationsClient.holdSeat(eventId, userAId, seatNumber);
      await reservationsClient.reserveSeat(eventId, userAId, seatNumber);

      const secondHoldSeatPromise = reservationsClient.holdSeat(eventId, userBId, seatNumber);

      await expect(secondHoldSeatPromise).rejects.toThrow();
    });

    it('if userA researved a seat, userB reserveSeat attemp should fail', async () => {
      const eventId = newEvent.eventId;
      const userBId = createUserId();
      const seatNumber = SeatNumber.parse(1);

      await reservationsClient.holdSeat(eventId, userAId, seatNumber);
      await reservationsClient.reserveSeat(eventId, userAId, seatNumber);

      const secondHoldSeatPromise = reservationsClient.reserveSeat(eventId, userBId, seatNumber);

      await expect(secondHoldSeatPromise).rejects.toThrow();
    });

    it('should hold an event and unhold it after 1 second', async () => {
      const seatHoldExpirationSeconds = HoldSeatExpiration.parse(1);
      const seatNumber = SeatNumber.parse(1);
      await reservationsClient.holdSeat(newEvent.eventId, userAId, seatNumber, seatHoldExpirationSeconds);
      await sleep(seatHoldExpirationSeconds + 1);
      const availableSeats = await reservationsClient.getAvailableSeats(newEvent.eventId);
      const expectedAbaialableSeats:SeatNumber[] = ["1","2","3","4","5","6","7","8","9","10"].map(s => SeatNumber.parse(s));
      expect(availableSeats).toEqual(expectedAbaialableSeats);
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
    const seatNumber = SeatNumber.parse(1);

    await reservationsClient.holdSeat(eventId, userAId, seatNumber, seatHoldExpirationSeconds);
    await reservationsClient.refreshHoldSeat(eventId, userAId, seatNumber, seatRefreshHoldExpirationSeconds);
    
    const userBHoldFail = await reservationsClient.holdSeat(eventId, userBId, seatNumber, seatHoldExpirationSeconds).catch(e => "userBHoldFail");
    expect(userBHoldFail).toBe("userBHoldFail");

    const availableSeats = await reservationsClient.getAvailableSeats(eventId);
    const expectedAbaialableSeatsFirst:SeatNumber[] = ["2","3","4","5","6","7","8","9","10"].map(s => SeatNumber.parse(s));
    expect(availableSeats).toEqual(expectedAbaialableSeatsFirst);

    // userA seat should be available
    await sleep(seatRefreshHoldExpirationSeconds + 1);
    const availableSeatsAfterExpiration = await reservationsClient.getAvailableSeats(eventId);
    const expectedAbaialableSeatsAfter:SeatNumber[] = [1,2,3,4,5,6,7,8,9,10].map(s => SeatNumber.parse(s));
    expect(availableSeatsAfterExpiration).toEqual(expectedAbaialableSeatsAfter);
  });


  it('if user a hold a seat and user b fail to hold the same seat, the hold should expire regulary', async () => {
    const seatHoldExpirationSeconds = HoldSeatExpiration.parse(1);
    const seatHoldExpirationUserBSeconds = HoldSeatExpiration.parse(5);
    const eventId = newEvent.eventId;
    const userBId = createUserId();
    const seatNumber = SeatNumber.parse(1);

    // userA holds seat 1
    await reservationsClient.holdSeat(eventId, userAId, seatNumber, seatHoldExpirationSeconds);
    // userB try to holod holds seat 1 and fail
    const fail = await reservationsClient.holdSeat(eventId, userBId, seatNumber, seatHoldExpirationUserBSeconds).catch(e => "userbfail");
    expect(fail).toBe("userbfail");

    // userA seat should be available after 2 seconds
    await sleep(seatHoldExpirationSeconds + 1);
    const availableSeats = await reservationsClient.getAvailableSeats(eventId);
    expect(availableSeats).toEqual([1,2,3,4,5,6,7,8,9,10]);
  });

  it('if user a hold+reserve a seat and user b fail to hold the same seat, the seat should be assinged', async () => {
    const seatHoldExpirationSeconds = HoldSeatExpiration.parse(10);
    const seatHoldExpirationUserBSeconds = HoldSeatExpiration.parse(1);

    const eventId = newEvent.eventId;
    const userBId = createUserId();
    const seatNumber = SeatNumber.parse(1);

    // userA holds and researve seat 1
    await reservationsClient.holdSeat(eventId, userAId, seatNumber, seatHoldExpirationSeconds);
    await reservationsClient.reserveSeat(eventId, userAId, seatNumber);
    // userB try to holod holds seat seatNumber and fail
    const fail = await reservationsClient.holdSeat(eventId, userBId, seatNumber, seatHoldExpirationUserBSeconds).catch(e => "userbfail");
    expect(fail).toBe("userbfail");

    // if the userB would have beeen able to set the ttl for seat1, then at this point the seat would be available (becase userB ttl is expired at this point).
    await sleep(seatHoldExpirationUserBSeconds + 1);
    const availableSeats = await reservationsClient.getAvailableSeats(eventId);
    const expectedAbaialableSeats:SeatNumber[] = ["2","3","4","5","6","7","8","9","10"].map(s => SeatNumber.parse(s));
    expect(availableSeats).toEqual(expectedAbaialableSeats);

    await expect(reservationsClient.getEventSeat(eventId, SeatNumber.parse(1))).resolves.toBe(userAId);
  });
})

});
