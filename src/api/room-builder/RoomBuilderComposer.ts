import { IMessageComposer, Short } from '@nitrots/nitro-renderer';

export class RoomBuilderComposer implements IMessageComposer<unknown[]>
{
    private readonly message: unknown[];

    constructor(action: number, ...fields: (number | boolean | Short)[])
    {
        this.message = [ action, ...fields ];
    }

    public getMessageArray(): unknown[]
    {
        return this.message;
    }

    public dispose(): void
    {
        return;
    }
}
