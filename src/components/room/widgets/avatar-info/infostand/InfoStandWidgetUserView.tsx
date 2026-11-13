import { RelationshipStatusInfoEvent, RelationshipStatusInfoMessageParser, RoomSessionUserBadgesEvent, RoomSessionUserFigureUpdateEvent, UserRelationshipsComposer } from '@nitrots/nitro-renderer';
import { Dispatch, FC, FocusEvent, KeyboardEvent, SetStateAction, useEffect, useState } from 'react';
import { FaPencilAlt, FaTimes } from 'react-icons/fa';
import { AvatarInfoUser, CloneObject, GetConfiguration, GetGroupInformation, GetSessionDataManager, GetUserProfile, LocalizeText, SendMessageComposer } from '../../../../../api';
import { Column, Flex, LayoutAvatarImageView, LayoutBadgeImageView, Text, UserProfileIconView } from '../../../../../common';
import { useInventoryBadges, useMessageEvent, useRoom, useRoomSessionManagerEvent } from '../../../../../hooks';
import { InfoStandWidgetUserRelationshipsView } from './InfoStandWidgetUserRelationshipsView';
import { InfoStandWidgetUserTagsView } from './InfoStandWidgetUserTagsView';

interface InfoStandWidgetUserViewProps
{
    avatarInfo: AvatarInfoUser;
    setAvatarInfo: Dispatch<SetStateAction<AvatarInfoUser>>;
    onClose: () => void;
}

export const InfoStandWidgetUserView: FC<InfoStandWidgetUserViewProps> = props =>
{
    const { avatarInfo = null, setAvatarInfo = null, onClose = null } = props;
    const [ motto, setMotto ] = useState<string>(null);
    const [ isEditingMotto, setIsEditingMotto ] = useState(false);
    const [ relationships, setRelationships ] = useState<RelationshipStatusInfoMessageParser>(null);
    const { roomSession = null } = useRoom();
    const { activeBadgeCodes = [] } = useInventoryBadges();

    const saveMotto = (motto: string) =>
    {
        if(!isEditingMotto || (motto.length > GetConfiguration<number>('motto.max.length', 38))) return;

        roomSession.sendMottoMessage(motto);

        setIsEditingMotto(false);
    }

    const onMottoBlur = (event: FocusEvent<HTMLInputElement>) => saveMotto(event.target.value);

    const onMottoKeyDown = (event: KeyboardEvent<HTMLInputElement>) =>
    {
        event.stopPropagation();

        switch(event.key)
        {
            case 'Enter':
                saveMotto((event.target as HTMLInputElement).value);
                return;
        }
    }

    useRoomSessionManagerEvent<RoomSessionUserBadgesEvent>(RoomSessionUserBadgesEvent.RSUBE_BADGES, event =>
    {
        if(!avatarInfo || (avatarInfo.webID !== event.userId)) return;

        const oldBadges = avatarInfo.badges.join('');

        if(oldBadges === event.badges.join('')) return;

        setAvatarInfo(prevValue =>
        {
            const newValue = CloneObject(prevValue);

            newValue.badges = event.badges;

            return newValue;
        });
    });

    useRoomSessionManagerEvent<RoomSessionUserFigureUpdateEvent>(RoomSessionUserFigureUpdateEvent.USER_FIGURE, event =>
    {
        if(!avatarInfo || (avatarInfo.roomIndex !== event.roomIndex)) return;

        setAvatarInfo(prevValue =>
        {
            const newValue = CloneObject(prevValue);

            newValue.figure = event.figure;
            newValue.motto = event.customInfo;
            newValue.achievementScore = event.activityPoints;

            return newValue;
        });
    });

    useMessageEvent<RelationshipStatusInfoEvent>(RelationshipStatusInfoEvent, event =>
    {
        const parser = event.getParser();

        if(!avatarInfo || (avatarInfo.webID !== parser.userId)) return;

        setRelationships(parser);
    });

    useEffect(() =>
    {
        setIsEditingMotto(false);
        setMotto(avatarInfo.motto);

        SendMessageComposer(new UserRelationshipsComposer(avatarInfo.webID));

        return () =>
        {
            setIsEditingMotto(false);
            setMotto(null);
            setRelationships(null);
        }
    }, [ avatarInfo ]);

    if(!avatarInfo) return null;

    const badges = (avatarInfo.type === AvatarInfoUser.OWN_USER && activeBadgeCodes.length) ? activeBadgeCodes : avatarInfo.badges;
    const hasVisibleGroupBadge = (avatarInfo.groupId > 0) && !!avatarInfo.groupBadgeId;
    const maxVisibleBadges = 7;

    return (
        <Column className="nitro-infostand rounded">
            <Column overflow="visible" className="container-fluid content-area" gap={ 1 }>
                <Column gap={ 1 }>
                    <Flex alignItems="center" justifyContent="between">
                        <Flex alignItems="center" gap={ 1 }>
                            <UserProfileIconView userId={ avatarInfo.webID } />
                            <Text variant="white" small wrap>{ avatarInfo.name }</Text>
                        </Flex>
                        <FaTimes className="cursor-pointer fa-icon" onClick={ onClose } />
                    </Flex>
                    <hr className="m-0" />
                </Column>
                <Column gap={ 1 } className="user-overview">
                    <Flex gap={ 1 }>
                        <Column className="user-avatar-column" gap={ 1 }>
                            <Column fullWidth className="body-image" onClick={ event => GetUserProfile(avatarInfo.webID) }>
                                <LayoutAvatarImageView figure={ avatarInfo.figure } direction={ 4 } />
                            </Column>
                        </Column>
                        <div className="user-badges">
                            { badges[0] &&
                                <Flex center key="badge-0" className="badge-image">
                                    <LayoutBadgeImageView badgeCode={ badges[0] } showInfo={ true } />
                                </Flex> }
                            { hasVisibleGroupBadge &&
                                <Flex center pointer key="group-badge" className="badge-image" onClick={ event => GetGroupInformation(avatarInfo.groupId) }>
                                    <LayoutBadgeImageView badgeCode={ avatarInfo.groupBadgeId } isGroup={ true } showInfo={ true } customTitle={ avatarInfo.groupName } />
                                </Flex> }
                            { badges.slice(1, maxVisibleBadges).map((badge, index) =>
                                <Flex key={ index } center className="badge-image">
                                    { badge && <LayoutBadgeImageView badgeCode={ badge } showInfo={ true } /> }
                                </Flex>) }
                        </div>
                    </Flex>
                    <hr className="m-0" />
                </Column>
                <Column gap={ 1 }>
                    <Flex alignItems="center" className="bg-light-dark rounded py-1 px-2">
                        { (avatarInfo.type !== AvatarInfoUser.OWN_USER) &&
                            <Flex grow alignItems="center" className="motto-content">
                                <Text fullWidth pointer wrap textBreak small variant="white">{ motto }</Text>
                            </Flex> }
                        { avatarInfo.type === AvatarInfoUser.OWN_USER &&
                            <Flex grow alignItems="center" gap={ 2 }>
                                <FaPencilAlt className="small fa-icon" />
                                <Flex grow alignItems="center" className="motto-content">
                                    { !isEditingMotto &&
                                        <Text fullWidth pointer wrap textBreak small variant="white" onClick={ event => setIsEditingMotto(true) }>{ motto }&nbsp;</Text> }
                                    { isEditingMotto &&
                                        <input type="text" className="motto-input" maxLength={ GetConfiguration<number>('motto.max.length', 38) } value={ motto } onChange={ event => setMotto(event.target.value) } onBlur={ onMottoBlur } onKeyDown={ onMottoKeyDown } autoFocus={ true } /> }
                                </Flex>
                            </Flex> }
                    </Flex>
                    <hr className="m-0" />
                </Column>
                <Column gap={ 1 }>
                    <Text variant="white" small wrap>
                        { LocalizeText('infostand.text.achievement_score') + ' ' + avatarInfo.achievementScore }
                    </Text>
                    { (avatarInfo.carryItem > 0) &&
                        <>
                            <hr className="m-0" />
                            <Text variant="white" small wrap>
                                { LocalizeText('infostand.text.handitem', [ 'item' ], [ LocalizeText('handitem' + avatarInfo.carryItem) ]) }
                            </Text>
                        </> }
                </Column>
                <Column gap={ 1 }>
                    <InfoStandWidgetUserRelationshipsView relationships={ relationships } />
                </Column>
                { GetConfiguration('user.tags.enabled') &&
                    <Column gap={ 1 } className="mt-1">
                        <InfoStandWidgetUserTagsView tags={ GetSessionDataManager().tags } />
                    </Column>
                }
            </Column>
        </Column>
    );
}
