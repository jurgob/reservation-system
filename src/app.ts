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
            const {eventId} = await reservationClient.createEvent({totalSeats, name});

            return {
                status: 201,
                body: {
                    eventId,
                },
            };
        },
        getEvent: async ({params}) => {
            const { eventId } = params;
            const { totalSeats } = await reservationClient.getEvent(eventId);
            return {
                status: 200,
                body: {
                    totalSeats,
                },
            };
        },
        holdSeat: async () => {
            return {
                status: 201,
                body: {
                    success: true,
                    holdExpiresAt: "string",
                },
            };
        },
        reserveSeat: async () => {
            return {
                status: 201,
                body: {
                    success: true,
                },
            };
        },
        listAvailableSeats: async () => {
            return {
                status: 200,
                body: {
                    availableSeats: [1, 2, 3, 4, 5],
                },
            };
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

    return app

}

export type ApiApp = ReturnType<typeof createApp>;
export type ApiServer = ReturnType<Awaited<ApiApp>['listen']>
