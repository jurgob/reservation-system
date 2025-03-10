# HOW TO RUN IT

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


### usefull command

- `npm run redis:cli` -> open redis cli, you need to run this command  while  `npm run dev` is running


### how to debug redis locally: 

you can do this in 2 ways: 

1. run `npm run redis:cli`, to connect into the redis-cli, the in ther writ `MONITOR`

2. if you have wireshark installd, run `sudo tshark -i lo0 -f "tcp port 6379` from your terminal (you should be in the host machine, not inside docker. lo0 works on macos, it may be different in other OS)



# URLS: 

`http://localhost:3000/api-docs` -> api specs




# DESIGN:

# DB DESIGN DECISIONS:
- I use redis hashmap and expire data. 
-  

# CODING STYLE:
- I use zod and zod based tools to enforce correcness via the typesystem as much as possible
