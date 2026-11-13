import { IMessageDataWrapper, IMessageParser } from '@nitrots/nitro-renderer';

export class RoomBuilderResultParser implements IMessageParser
{
    private _success = false;
    private _error = '';
    private _itemIds: number[] = [];
    private _failedIds: number[] = [];

    public flush(): boolean
    {
        this._success = false;
        this._error = '';
        this._itemIds = [];
        this._failedIds = [];
        return true;
    }

    public parse(wrapper: IMessageDataWrapper): boolean
    {
        if(!wrapper) return false;

        this._success = wrapper.readBoolean();
        this._error = wrapper.readString();
        const count = wrapper.readShort();

        if(count < 0 || count > 300) return false;

        for(let i = 0; i < count; i++) this._itemIds.push(wrapper.readInt());

        const failedCount = wrapper.readShort();

        if(failedCount < 0 || failedCount > 300 || (count + failedCount) > 300) return false;

        for(let i = 0; i < failedCount; i++) this._failedIds.push(wrapper.readInt());

        return true;
    }

    public get success(): boolean
    {
        return this._success;
    }

    public get error(): string
    {
        return this._error;
    }

    public get itemIds(): number[]
    {
        return this._itemIds;
    }

    public get failedIds(): number[]
    {
        return this._failedIds;
    }
}
