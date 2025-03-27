import { RedisClientType } from "redis";
import { TsRestRequestHandler } from "@ts-rest/express";
import { contract } from "./contract";

import { initServer } from '@ts-rest/express';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { createExpressEndpoints } from '@ts-rest/express';
import { createReservationsClient } from './reservations_client';

import { generateOpenApi } from '@ts-rest/open-api';
import * as swaggerUi from 'swagger-ui-express';

function errorResponse(e: unknown){
    return {
        status: 403,
        body: {
            error: e instanceof Error ? e.message : "Unknown error."
        },
    } as const;
}

export async function createApp(){
    const app = express();

    app.use(cors());
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(bodyParser.json());

    const s = initServer();
    
    const reservationClient = await createReservationsClient();

    const router = s.router(contract, {
        health: async () => {
            return {
                status: 200,
                body: {
                    status: "ok",
                },
            };
        },
        createEvent: async ({body}) => {
            const { totalSeats , name} = body;
            try{
                const {eventId} = await reservationClient.createEvent({totalSeats, name});
                return {
                    status: 201,
                    body: {
                        eventId,
                    },
                };
            }catch(e){
                return errorResponse(e);
            }
        },
        getEvent: async ({params}) => {
            try{
                const { eventId } = params;
                const { totalSeats,name } = await reservationClient.getEvent(eventId);
            
                return {
                    status: 200,
                    body: {
                        totalSeats,
                        name
                    },
                };
            } catch(e){
                return errorResponse(e);
            }
        
        },
        holdSeat: async ({body,params}) => {
            const { eventId } = params;
            const { seatNumber, userId,expireIn,refresh } = body;
            try{
                if(refresh){
                    await reservationClient.refreshHoldSeat(eventId, userId, seatNumber, expireIn);
                }else {
                    await reservationClient.holdSeat(eventId, userId, seatNumber, expireIn);
                }
            }catch(e){
                return errorResponse(e);
            }
            
            return {
                status: 201,
                body: {
                    success: true,
                },
            };
        },
        reserveSeat: async ({body,params}) => {
            const { eventId } = params;
            const { seatNumber, userId } = body;
            try{
                await reservationClient.reserveSeat(eventId, userId, seatNumber);
            }catch(e){
                return errorResponse(e);
             }
            return {
                status: 201,
                body: {
                    success: true,
                },
            };
        },
        listAvailableSeats: async ({params}) => {
            const { eventId } = params
            try{
                const availableSeats = await reservationClient.getAvailableSeats(eventId);
                return {
                    status: 200,
                    body: {
                        availableSeats: availableSeats,
                    },
                };
            }catch(e){
                return errorResponse(e);
            }
        },
    });

    createExpressEndpoints(contract, router, app)

    const openApiDocument = generateOpenApi(contract, {
        info: {
            title: 'Event Reservations Seats API',
            version: '1.0.0',
        },
    });

    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));
    app.use((req, res) => {
        res.status(404).json({error : "Invalid Url"})
    });

    return app

}

export type ApiApp = ReturnType<typeof createApp>;
export type ApiServer = ReturnType<Awaited<ApiApp>['listen']>
