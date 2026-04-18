import { getTokenData } from '@aure/commons';
import { IUserSession } from '../types/commons.types';

export const getUserSession = (authorization: string) => {
    if (!authorization) return null;
    const [, token] = authorization?.split(' ') ?? [];
    return getTokenData<IUserSession>(token);
};
