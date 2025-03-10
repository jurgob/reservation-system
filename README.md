# HOW TO RUN IT

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




# DESIGN:

## REDIS IMPLEMENTATION KEY FACTORS: 

given the following facts: 
- redis does not gurantee transactability among different operations, unless we don't use transactions. 
- inside a transaction, every operation is executed, even if the previous one fail

this was the implementation: 
1. `holdSeat()` use  a redis `transaction` to execute `hSetNX(hashKey, seatKey, userId)` and `hExpire(hashKey,seatKey, holdSeatExpiration, "NX")`. 
  - using the transaction will guarantee that that seat is locked for the entire transation
  - using hsetNX and hExpire with NX guarantee that seat is not reassigned if it is already assigned. 

2. `reserveSeat()` use `hGet(hashKey, seatKey)` and `hExpire(hashKey,seatKey, HOLD_SEAT_EXPIRATION_DONOT_EXPIRE, "XX")`, between those 2 operation I chack if the seat is assigned to the current user. 
  - because of the check I need to do in the middle, I can't do this as a transaction, but this  should not be a problem in terms of correctnss,  given the fact that you need to execute an holdSeat before doing the reservation
  - I use `hExpire` to 100 years rather the `persist` to avoid some edge case (see the test `if user a hold a seat and user b fail to hold the same seat, the hold should expire regulary`)


## CODING DECISIONS:
- I use zod and zod based tools to enforce correcness via the typesystem as much as possible
- I tent to validate all the data coming from IO (http calls, redis data), with some exeption for redis due to performance tradedoff (I'm assuming this app will be the only one writing on redis)
- for validating the http request and generate the openapi spec, I use ts-rest (https://ts-rest.com/)

