import { IMessageComposer, IMessageDataWrapper, IncomingHeader, MessageEvent, UserProfileParser } from '@nitrots/nitro-renderer';
import { GetConnection } from '../../nitro';

// Must match Incoming.SaveUserBannerEvent in the hotel emulator.
export const SAVE_USER_BANNER_HEADER = 4001;

export class SaveUserBannerComposer implements IMessageComposer<[string]>
{
    private data: [string];

    constructor(imageUrl: string)
    {
        this.data = [ imageUrl ];
    }

    public getMessageArray(): [string] { return this.data; }
    public dispose(): void { this.data = null; }
}

export class UserProfileBannerParser extends UserProfileParser
{
    private _bannerUrl: string = '';

    public flush(): boolean
    {
        this._bannerUrl = '';
        return super.flush();
    }

    public parse(wrapper: IMessageDataWrapper): boolean
    {
        if(!super.parse(wrapper)) return false;

        this._bannerUrl = wrapper.bytesAvailable ? wrapper.readString() : '';
        return true;
    }

    public get bannerUrl(): string
    {
        return this._bannerUrl;
    }
}

export class UserProfileBannerEvent extends MessageEvent
{
    constructor(callback: Function)
    {
        super(callback, UserProfileBannerParser);
    }

    public getParser(): UserProfileBannerParser
    {
        return this.parser as UserProfileBannerParser;
    }
}

export function RegisterUserProfileBannerMessages(): void
{
    GetConnection()?.registerMessages({
        events: new Map<number, Function>([
            [ IncomingHeader.USER_PROFILE, UserProfileBannerEvent ]
        ]),
        composers: new Map<number, Function>([
            [ SAVE_USER_BANNER_HEADER, SaveUserBannerComposer ]
        ])
    });
}
