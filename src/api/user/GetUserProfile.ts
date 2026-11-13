import { UserProfileComposer } from '@nitrots/nitro-renderer';
import { SendMessageComposer } from '..';

let requestedUserProfileId: number = -1;

export function GetUserProfile(userId: number): void
{
    requestedUserProfileId = userId;
    SendMessageComposer(new UserProfileComposer(userId));
}

export function GetRequestedUserProfileId(): number
{
    return requestedUserProfileId;
}

export function ClearRequestedUserProfile(): void
{
    requestedUserProfileId = -1;
}
