import { ExtendedProfileChangedMessageEvent, RelationshipStatusInfoEvent, RelationshipStatusInfoMessageParser, RoomEngineObjectEvent, RoomObjectCategory, RoomObjectType, SimpleAlertMessageEvent, UserCurrentBadgesComposer, UserCurrentBadgesEvent, UserProfileParser, UserRelationshipsComposer } from '@nitrots/nitro-renderer';
import { FC, useEffect, useRef, useState } from 'react';
import { Button, Form, Modal } from 'react-bootstrap';
import { ClearRequestedUserProfile, CreateLinkEvent, GetRequestedUserProfileId, GetRoomSession, GetSessionDataManager, GetUserProfile, LocalizeText, RegisterUserProfileBannerMessages, SaveUserBannerComposer, SendMessageComposer } from '../../api';
import { Column, Flex, Grid, NitroCardContentView, NitroCardHeaderView, NitroCardView, Text } from '../../common';
import { useMessageEvent, useRoomEngineEvent } from '../../hooks';
import { BadgesContainerView } from './views/BadgesContainerView';
import { FriendsContainerView } from './views/FriendsContainerView';
import { GroupsContainerView } from './views/GroupsContainerView';
import { UserContainerView } from './views/UserContainerView';
import { UserProfileBannerEvent } from '../../api/user/profile-banner/UserProfileBannerMessages';

export const UserProfileView: FC<{}> = props =>
{
    const [ userProfile, setUserProfile ] = useState<UserProfileParser>(null);
    const [ userBadges, setUserBadges ] = useState<string[]>([]);
    const [ userRelationships, setUserRelationships ] = useState<RelationshipStatusInfoMessageParser>(null);
    const [ banner, setBanner ] = useState('');
    const [ isBannerModalOpen, setIsBannerModalOpen ] = useState(false);
    const [ bannerDraft, setBannerDraft ] = useState('');
    const [ bannerError, setBannerError ] = useState('');
    const [ isBannerSaving, setIsBannerSaving ] = useState(false);
    const pendingBannerSave = useRef<{ userId: number, imageUrl: string }>(null);

    useEffect(() => RegisterUserProfileBannerMessages(), []);

    const onClose = () =>
    {
        setUserProfile(null);
        setUserBadges([]);
        setUserRelationships(null);
        setBanner('');
        pendingBannerSave.current = null;
        setIsBannerSaving(false);
        setIsBannerModalOpen(false);
        ClearRequestedUserProfile();
    }

    const onLeaveGroup = () =>
    {
        if(!userProfile || (userProfile.id !== GetSessionDataManager().userId)) return;
        GetUserProfile(userProfile.id);
    }

    const saveBanner = () =>
    {
        try
        {
            const parsedUrl = new URL(bannerDraft.trim());
            const normalizedUrl = parsedUrl.toString();
            if((bannerDraft.trim().length > 2048) || (normalizedUrl.length > 2048) || !parsedUrl.hostname || ![ 'http:', 'https:' ].includes(parsedUrl.protocol)) throw new Error();
            setBannerError('');
            setIsBannerSaving(true);
            pendingBannerSave.current = { userId: GetSessionDataManager().userId, imageUrl: normalizedUrl };
            SendMessageComposer(new SaveUserBannerComposer(normalizedUrl));
        }
        catch
        {
            setBannerError('Informe um link válido começando com http:// ou https://.');
        }
    }

    useMessageEvent<UserCurrentBadgesEvent>(UserCurrentBadgesEvent, event =>
    {
        const parser = event.getParser();
        if(!userProfile || (parser.userId !== userProfile.id)) return;
        setUserBadges(parser.badges);
    });

    useMessageEvent<RelationshipStatusInfoEvent>(RelationshipStatusInfoEvent, event =>
    {
        const parser = event.getParser();
        if(!userProfile || (parser.userId !== userProfile.id)) return;
        setUserRelationships(parser);
    });

    useMessageEvent<UserProfileBannerEvent>(UserProfileBannerEvent, event =>
    {
        const parser = event.getParser();
        const requestedProfileId = GetRequestedUserProfileId();
        if((requestedProfileId < 0) || (parser.id !== requestedProfileId)) return;

        const isSameProfile = (userProfile?.id === parser.id);
        setUserProfile(parser);
        setBanner(parser.bannerUrl || '');

        if(!isSameProfile)
        {
            setUserBadges([]);
            setUserRelationships(null);
            setIsBannerModalOpen(false);

            if(pendingBannerSave.current?.userId !== parser.id)
            {
                pendingBannerSave.current = null;
                setIsBannerSaving(false);
            }
        }

        if(pendingBannerSave.current && (pendingBannerSave.current.userId === parser.id) && (pendingBannerSave.current.imageUrl === parser.bannerUrl))
        {
            pendingBannerSave.current = null;
            setIsBannerSaving(false);
            setBannerError('');
            setIsBannerModalOpen(false);
        }

        SendMessageComposer(new UserCurrentBadgesComposer(parser.id));
        SendMessageComposer(new UserRelationshipsComposer(parser.id));
    });

    useMessageEvent<SimpleAlertMessageEvent>(SimpleAlertMessageEvent, event =>
    {
        if(!pendingBannerSave.current) return;
        const parser = event.getParser();
        setBannerError(parser.alertMessage || 'Nao foi possivel salvar o banner.');
        setIsBannerSaving(false);
        pendingBannerSave.current = null;
    });
    useMessageEvent<ExtendedProfileChangedMessageEvent>(ExtendedProfileChangedMessageEvent, event =>
    {
        const parser = event.getParser();
        if(parser.userId != userProfile?.id) return;
        GetUserProfile(parser.userId);
    });

    useRoomEngineEvent<RoomEngineObjectEvent>(RoomEngineObjectEvent.SELECTED, event =>
    {
        if(!userProfile || (event.category !== RoomObjectCategory.UNIT)) return;
        const userData = GetRoomSession().userDataManager.getUserDataByIndex(event.objectId);
        if(userData.type !== RoomObjectType.USER) return;
        GetUserProfile(userData.webID);
    });

    if(!userProfile) return null;

    const isOwnProfile = (userProfile.id === GetSessionDataManager().userId);

    return (
        <NitroCardView uniqueKey="nitro-user-profile" theme="primary-slim" className="user-profile">
            <NitroCardHeaderView headerText={ LocalizeText('extendedprofile.caption') } onCloseClick={ onClose } />
            <NitroCardContentView overflow="hidden" className="user-profile-content">
                <div className="profile-banner-wrap">
                    <div className="profile-banner" style={ banner ? { backgroundImage: `url(${ banner })` } : undefined }>
                        { isOwnProfile && <button className="profile-banner-button" onClick={ () => { setBannerDraft(banner); setBannerError(''); setIsBannerModalOpen(true); } }>{ banner ? 'Alterar banner' : 'Adicionar banner' }</button> }
                    </div>
                    { userBadges.length > 0 && <div className="profile-badge-row"><BadgesContainerView badges={ userBadges.slice(0, 7) } /></div> }
                </div>
                <Grid fullHeight={ false } gap={ 2 } className="profile-main-grid">
                    <Column size={ 7 } gap={ 1 } className="user-container pe-2">
                        <UserContainerView userProfile={ userProfile } />
                    </Column>
                    <Column size={ 5 }>
                        { userRelationships && <FriendsContainerView relationships={ userRelationships } friendsCount={ userProfile.friendsCount } /> }
                    </Column>
                </Grid>
                <Flex alignItems="center" className="rooms-button-container px-2 py-1">
                    <Flex alignItems="center" gap={ 1 } onClick={ event => CreateLinkEvent(`navigator/search/hotel_view/owner:${ userProfile.username }`) }>
                        <i className="icon icon-rooms" />
                        <Text bold underline pointer>{ LocalizeText('extendedprofile.rooms') }</Text>
                    </Flex>
                </Flex>
                <GroupsContainerView fullWidth fullHeight={ false } itsMe={ isOwnProfile } groups={ userProfile.groups } onLeaveGroup={ onLeaveGroup } />
            </NitroCardContentView>
            <Modal show={ isBannerModalOpen } onHide={ () => setIsBannerModalOpen(false) } centered>
                <Modal.Header closeButton><Modal.Title>Banner do perfil</Modal.Title></Modal.Header>
                <Modal.Body>
                    <Form.Group>
                        <Form.Label>Link da imagem</Form.Label>
                        <Form.Control type="url" maxLength={ 2048 } value={ bannerDraft } placeholder="https://exemplo.com/banner.gif" onChange={ event => setBannerDraft(event.target.value) } onKeyDown={ event => (event.key === 'Enter') && saveBanner() } autoFocus />
                        <Form.Text className="text-muted">Use um link direto para uma imagem. GIFs animados também são aceitos.</Form.Text>
                        { bannerError && <div className="text-danger mt-2">{ bannerError }</div> }
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" disabled={ isBannerSaving } onClick={ () => setIsBannerModalOpen(false) }>Cancelar</Button>
                    <Button variant="primary" disabled={ isBannerSaving } onClick={ saveBanner }>{ isBannerSaving ? 'Salvando...' : 'Salvar' }</Button>
                </Modal.Footer>
            </Modal>
        </NitroCardView>
    );
}
