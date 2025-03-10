import { initClient } from '@ts-rest/core';
import { contract } from './contract';

type ApiClientParams = Parameters<typeof initClient>[1];
export const createClient = (clientParams: ApiClientParams) =>  initClient(contract, clientParams);
export type ApiClient = ReturnType<typeof createClient>;

