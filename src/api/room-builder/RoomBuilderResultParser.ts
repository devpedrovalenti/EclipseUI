import { IMessageDataWrapper, IMessageParser } from '@nitrots/nitro-renderer';

export class RoomBuilderResultParser implements IMessageParser
{
    private _success = false;
    private _error = '';
    private _itemIds: number[] = [];

    public flush(): boolean
    {
        this._success = false;
        this._error = '';
        this._itemIds = [];
        return true;
    }

    public parse(wrapper: IMessageDataWrapper): boolean
    {
        if(!wrapper) return false;

        this._success = wrapper.readBoolean();
        this._error = wrapper.readString();
        const count = wrapper.readShort();

        if(count < 0 || count > 200) return false;

        for(let i = 0; i < count; i++) this._itemIds.push(wrapper.readInt());

        return true;
    }

    public get success(): boolean { return this._success; }
    public get error(): string { return this._error; }
    public get itemIds(): number[] { return this._itemIds; }
}
