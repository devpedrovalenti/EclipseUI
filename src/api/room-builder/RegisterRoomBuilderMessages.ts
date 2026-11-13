import { GetCommunication } from '../nitro/GetCommunication';
import { RoomBuilderComposer } from './RoomBuilderComposer';
import { RoomBuilderResultEvent } from './RoomBuilderResultEvent';

let isRegistered = false;

export const RegisterRoomBuilderMessages = () =>
{
    if(isRegistered) return;

    const connection = GetCommunication()?.connection;

    if(!connection) return;

    connection.registerMessages({
        events: new Map([ [ 4090, RoomBuilderResultEvent ] ]),
        composers: new Map([ [ 4090, RoomBuilderComposer ] ])
    });

    isRegistered = true;
};
