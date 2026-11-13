import { IMessageEvent, MessageEvent } from '@nitrots/nitro-renderer';
import { RoomBuilderResultParser } from './RoomBuilderResultParser';

export class RoomBuilderResultEvent extends MessageEvent implements IMessageEvent
{
    constructor(callBack: Function)
    {
        super(callBack, RoomBuilderResultParser);
    }

    public getParser(): RoomBuilderResultParser
    {
        return this.parser as RoomBuilderResultParser;
    }
}
