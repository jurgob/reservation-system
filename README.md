[![Codecov](https://codecov.io/gh/jurgob/reservation-system/branch/main/graph/badge.svg)](https://codecov.io/gh/jurgob/reservation-system)


# RESERVATION SYSTEM

This project is a reservation system designed to manage seat reservations efficiently. It leverages Redis for handling seat holds and reservations with a focus on ensuring data consistency and performance. The system is currently deployed on fly.io and redislabs, it can be accessed at [Reservation System API Docs](https://reservation-system.fly.dev/api-docs).

The [test coverage is available on codecov ](https://app.codecov.io/gh/jurgob/reservation-system). There/s a simple ci/cd based on github actions which consist in some  [test, typecheck and code coverage publishing](https://github.com/jurgob/reservation-system/blob/main/.github/workflows/main.yml) and a [fly.io deply script](https://github.com/jurgob/reservation-system/blob/main/.github/workflows/fly-deploy.yml).


## HOW TO RUN IT

## prerequisites

- if you have fnm installed

## run in dev mode

```bash
npm run dev
```

this will run the nodejs server  in watch mode and the docker compose dependencies




## run test: 

the only command you need is: 

```bash
npm run test
```

if you are already running the docker compose (e.g. npm run dev) then you can run: 

```bash
npm run test:integration:dev
```

### test coverage

after you have runned `npm run test` run this command: 

```bash
npx http-server coverage/ 
```

then go with your browser to http://127.0.0.1:8080


### Useful commands

- `npm run redis:cli` -> open redis cli, you need to run this command  while  `npm run dev` is running


### how to debug redis locally: 

you can do this in 2 ways: 

1. run `npm run redis:cli`, to connect into the redis-cli, the in ther writ `MONITOR`

2. if you have wireshark installd, run `sudo tshark -i lo0 -f "tcp port 6379` from your terminal (you should be in the host machine, not inside docker. lo0 works on macos, it may be different in other OS)



# URLS: 

`http://localhost:3000/api-docs` -> api specs


# URLS productions

this app is deployed in fly.io and redislabs (I'm using the free tiers, so it may not be super performante):

https://reservation-system.fly.dev/api-docs


# DESIGN:

## REDIS IMPLEMENTATION KEY FACTORS: 

given the following facts: 
- Redis is single-threaded and runs as a single process.
- Redis does not guarantee atomicity across multiple commands unless you use transactions. All commands in a transaction are serialized and executed sequentially. A request sent by another client will never be served in the middle of the execution of a Redis transaction (Redis Transactions Documentation).
- Inside a transaction, every operation is executed, even if a previous operation fails (i.e., Redis transactions do not guarantee rollback).

those are some implementation points worth to mention: 
1. `holdSeat()` use  a redis `transaction` to execute `hSetNX(hashKey, seatKey, userId)` and `hExpire(hashKey,seatKey, holdSeatExpiration, "NX")`. 
  - using the transaction will guarantee that that seat is locked for the entire transation
  - using hsetNX and hExpire with NX guarantee that seat is not reassigned if it is already assigned. 

2. `reserveSeat()` use `hGet(hashKey, seatKey)` and `hExpire(hashKey,seatKey, HOLD_SEAT_EXPIRATION_DONOT_EXPIRE, "XX")`, between those 2 operation I check if the seat is assigned to the current user. 
  - because of the check I need to do in the middle, I can't do this as a transaction.  Given the fact that you need to execute an holdSeat before doing the reservation, this will make really unlikely that something would happen in the middle. 
  - e.g: a use case that could happen right now is that the in the time window between the `reserveSeat - hGet` and `reservSeat - hExpire`, the ttl setted in the holdSeat() woudl expire and a different user hould holdThe Seat. 
  - I use `hExpire` to 100 years rather the `persist` to avoid some edge case (see the test `if user a hold a seat and user b fail to hold the same seat, the hold should expire regulary`)

  nodte: A different approach to implement the reserveSeat method is to make it as a transaction and sent a luascript.

3. `reserveSeat()` uses `hGet(hashKey, seatKey)` and `hExpire(hashKey, seatKey, HOLD_SEAT_EXPIRATION_DONOT_EXPIRE, "XX")`. Between these two operations, I check if the seat is assigned to the current user.
   - Due to the need for the check in the middle, this cannot be done as a transaction. Given that you must execute `holdSeat` before attempting the reservation, it makes it highly unlikely that anything would happen in the middle.
   - For example, a potential issue could occur in the time window between `reserveSeat - hGet` and `reserveSeat - hExpire`. If the TTL set in `holdSeat()` expires, a different user could take the seat. given the extreme unlikeness of this scenario, I didn't managed it. **Note**: An alternative approach for implementing the `reserveSeat` method could be to treat it as a transaction and use a Lua script.
   - A much more likely edge case would be a user trying to hold a seat already assigned. Given the nature of the transactions, I've use `hExpire` with a 100-year expiration rather than using `persist` to allow `holdSeat() -hSetNX`  to act as a lock (e.g., see the test: "if user a hold+reserve a seat and user b fail to hold the same seat, the seat should be assinged").

4. every user can have a limited ammount of seat at the same event, there are 3 possible way to limit a user to have n max seats.
    1. use a separate hash per user -> this is more performante but it will require more memory
    2. inside the transation, count the keys that have the user id value -> this is the more correct, but the less performant (the transaction will block the hash for more time)
    3. do like the point 2, but before the transaction -> this is the middle ground, is not an issue give that the hash can have no more then 1000 keys, also in some edge case the user could be able to require more then n seat, but I think is the best trade off in this case

    therefore the implemantaion adopted was the third one

5. There's the ability of refresh the seat hold. this was implmented using the `hExpire` with the `GT` option. the only way this fail is if the ttl is setted to 100 year.

  


## CODING DECISIONS:
- I use zod and zod based tools to enforce correcness via the typesystem as much as possible
- I tent to validate all the data coming from IO (http calls, redis data), with some exeption for redis due to performance tradedoff (I'm assuming this app will be the only one writing on redis)
- for validating the http request and generate the openapi spec, I use ts-rest (https://ts-rest.com/)

