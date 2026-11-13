import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { FaArrowDown, FaArrowLeft, FaArrowRight, FaArrowUp } from 'react-icons/fa';
import { FurnitureFloorUpdateComposer, FurnitureMultiStateComposer, ILinkEventTracker, RoomEngineEvent, RoomObjectCategory, RoomObjectVariable, Short } from '@nitrots/nitro-renderer';
import { AddEventLinkTracker, CreateLinkEvent, GetFurnitureDataForRoomObject, GetRoomEngine, GetRoomSession, GetSessionDataManager, RemoveLinkEventTracker, SendMessageComposer } from '../../api';
import { LayoutFurniIconImageView, NitroCardContentView, NitroCardHeaderView, NitroCardView } from '../../common';
import { useMessageEvent, useObjectSelectedEvent, useRoomEngineEvent } from '../../hooks';
import { RegisterRoomBuilderMessages, RoomBuilderComposer, RoomBuilderResultEvent } from '../../api/room-builder';
import { SetRoomBuilderTeleportEnabled } from '../../api/nitro/room/DispatchMouseEvent';

type ToggleKey = 'autoHeight' | 'keepHeight' | 'viewHeight' | 'freezeAvatar' | 'teleport' | 'changeEqual' | 'rotateEqual' | 'chooseEqual' | 'copyPile' | 'movePile' | 'choosePile' | 'organizeWired';
type PendingEqualAction = { type: 'rotate'; direction: number } | { type: 'state'; state: number };

export const RoomBuilderView: FC<{}> = () =>
{
    const [visible, setVisible] = useState(false);
    const [enabled, setEnabled] = useState<Record<ToggleKey, boolean>>({ autoHeight: false, keepHeight: false, viewHeight: false, freezeAvatar: false, teleport: false, changeEqual: false, rotateEqual: false, chooseEqual: false, copyPile: false, movePile: false, choosePile: false, organizeWired: false });
    const [height, setHeight] = useState(0);
    const [automaticHeight, setAutomaticHeight] = useState(0);
    const [placementHeightEnabled, setPlacementHeightEnabled] = useState(false);
    const [direction, setDirection] = useState(0);
    const [furnitureState, setFurnitureState] = useState(0);
    const [stateEnabled, setStateEnabled] = useState(false);
    const [viewHeightEnabled, setViewHeightEnabled] = useState(false);
    const [viewStateEnabled, setViewStateEnabled] = useState(false);
    const [open, setOpen] = useState<Record<string, boolean>>({ furniture: true, avatar: true, equal: true, squares: true });
    const [requestPending, setRequestPending] = useState(false);
    const [selectionIds, setSelectionIds] = useState<number[]>([]);
    const [selectedFurnitureName, setSelectedFurnitureName] = useState('Selecione uma mobília');
    const [selectedFurnitureClassId, setSelectedFurnitureClassId] = useState(0);
    const [selectedFurnitureId, setSelectedFurnitureId] = useState(0);
    const ownHabboId = GetSessionDataManager()?.userId ?? 0;
    const [avatarFrozen, setAvatarFrozen] = useState(false);
    const [teleportEnabled, setTeleportEnabled] = useState(false);
    const [serverMessage, setServerMessage] = useState('');
    const pendingActions = useRef<number[]>([]);
    const pendingRequest = useRef(false);
    const requestTimeout = useRef<ReturnType<typeof setTimeout>>(null);
    const pendingAvatarFrozen = useRef<boolean>(null);
    const pendingEqualAction = useRef<PendingEqualAction>(null);
    const batchTimer = useRef<ReturnType<typeof setTimeout>>(null);
    const furnitureStateRef = useRef(furnitureState);
    furnitureStateRef.current = furnitureState;

    useEffect(() => { RegisterRoomBuilderMessages(); }, []);

    const sendFurnitureBatch = useCallback((commands: (() => void)[], message: string) =>
    {
        if(batchTimer.current) clearTimeout(batchTimer.current);
        let index = 0;

        const sendNext = () =>
        {
            commands[index++]();
            if(index < commands.length) batchTimer.current = setTimeout(sendNext, 60);
            else
            {
                batchTimer.current = null;
                setServerMessage(message);
            }
        };

        if(commands.length) sendNext();
        else setServerMessage(message);
    }, []);

    useEffect(() =>
    {
        SetRoomBuilderTeleportEnabled(teleportEnabled);
        return () => SetRoomBuilderTeleportEnabled(false);
    }, [teleportEnabled]);

    const requestBuilder = useCallback((action: number, ...fields: (number | boolean | Short)[]) =>
    {
        if (pendingRequest.current && action !== 4) return;
        RegisterRoomBuilderMessages();
        pendingRequest.current = true;
        pendingActions.current.push(action);
        setRequestPending(true);
        setServerMessage('');
        if (requestTimeout.current) clearTimeout(requestTimeout.current);
        SendMessageComposer(new RoomBuilderComposer(action, ...fields));
        requestTimeout.current = setTimeout(() =>
        {
            pendingActions.current = [];
            pendingEqualAction.current = null;
            pendingRequest.current = false;
            setRequestPending(false);
            setServerMessage('O servidor não respondeu à solicitação.');
        }, 10000);
    }, []);

    const onBuilderResult = useCallback((event: RoomBuilderResultEvent) =>
    {
        if (!pendingActions.current.length) return;
        if (requestTimeout.current) clearTimeout(requestTimeout.current);
        const parser = event.getParser();
        const completedAction = pendingActions.current.shift();
        pendingRequest.current = (pendingActions.current.length > 0);
        setRequestPending(pendingRequest.current);
        if (pendingRequest.current) requestTimeout.current = setTimeout(() => { pendingActions.current = []; pendingRequest.current = false; setRequestPending(false); setServerMessage('O servidor nao respondeu.'); }, 10000);
        if (!parser.success && completedAction === 5) pendingAvatarFrozen.current = null;
        if (!parser.success && completedAction === 2) pendingEqualAction.current = null;
        if (!parser.success)
        {
            setServerMessage(parser.error || 'Não foi possível executar a solicitação.');
            return;
        }
        if (completedAction >= 1 && completedAction <= 3) setSelectionIds(parser.itemIds);
        if (completedAction === 2 && parser.success && pendingEqualAction.current)
        {
            const action = pendingEqualAction.current;
            pendingEqualAction.current = null;
            const roomSession = GetRoomSession();

            if (action.type === 'state')
            {
                const commands = parser.itemIds.map(itemId => () => SendMessageComposer(new FurnitureMultiStateComposer(itemId, action.state)));
                sendFurnitureBatch(commands, `Estado ${action.state} enviado para ${parser.itemIds.length} mobília(s) iguais.`);
            }
            else if (roomSession)
            {
                const commands = parser.itemIds.map(itemId => () =>
                {
                    const roomObject = GetRoomEngine().getRoomObject(roomSession.roomId, itemId, RoomObjectCategory.FLOOR);
                    if (!roomObject) return;
                    const location = roomObject.getLocation();
                    SendMessageComposer(new FurnitureFloorUpdateComposer(itemId, Math.round(location.x), Math.round(location.y), action.direction));
                });
                sendFurnitureBatch(commands, `${parser.itemIds.length} mobília(s) iguais ajustadas para a mesma direção.`);
            }
            return;
        }
        if (completedAction === 4)
        {
            setServerMessage('Altura de colocacao salva no servidor.');
            return;
        }
        if (completedAction === 5)
        {
            if (pendingAvatarFrozen.current !== null) setAvatarFrozen(pendingAvatarFrozen.current);
            pendingAvatarFrozen.current = null;
            setServerMessage('Estado do avatar atualizado.');
            return;
        }
        if (completedAction === 6)
        {
            setServerMessage('Solicitacao de teleporte concluida.');
            return;
        }
        if (completedAction === 7)
        {
            setSelectionIds(parser.itemIds);
            setServerMessage(parser.itemIds.length ? `${parser.itemIds.length} mobília(s) nao puderam ser recolhidas: ${parser.itemIds.join(', ')}` : 'Todas as mobilias iguais foram recolhidas.');
            return;
        }
        setServerMessage(parser.itemIds.length ? `${parser.itemIds.length} mobília(s) selecionada(s).` : 'Acesso à ferramenta autorizado.');
    }, [sendFurnitureBatch]);

    useMessageEvent<RoomBuilderResultEvent>(RoomBuilderResultEvent, onBuilderResult);

    useObjectSelectedEvent(event =>
    {
        if (event.category !== RoomObjectCategory.FLOOR || requestPending) return;

        const roomSession = GetRoomSession();
        const furnitureData = roomSession && GetFurnitureDataForRoomObject(roomSession.roomId, event.id, RoomObjectCategory.FLOOR);
        const roomObject = roomSession && GetRoomEngine().getRoomObject(roomSession.roomId, event.id, RoomObjectCategory.FLOOR);
        setSelectedFurnitureId(event.id);
        setSelectedFurnitureName(furnitureData?.name || `Mobília #${event.id}`);
        setSelectedFurnitureClassId(furnitureData?.id || 0);
        setSelectionIds([event.id]);
        if (roomObject)
        {
            setDirection(Math.round(roomObject.getDirection().x / 45) % 8);
            if (viewHeightEnabled) setServerMessage(`Altura: ${roomObject.getLocation().z.toFixed(2)}`);
            if (viewStateEnabled) setServerMessage(`Estado atual: ${roomObject.getState(0)}`);
        }

        if (enabled.chooseEqual)
        {
            requestBuilder(7, event.id);
            return;
        }

        if (enabled.rotateEqual)
        {
            const roomSession = GetRoomSession();
            const source = roomSession && GetRoomEngine().getRoomObject(roomSession.roomId, event.id, RoomObjectCategory.FLOOR);
            if (!source)
            {
                setServerMessage('Não foi possível ler a direção da mobília selecionada.');
                return;
            }

            const allowedDirections = source.model.getValue<number[]>(RoomObjectVariable.FURNITURE_ALLOWED_DIRECTIONS) || [];
            const currentDirection = source.getDirection().x;
            let nextDirection = currentDirection;

            if (allowedDirections.length)
            {
                let currentIndex = allowedDirections.indexOf(currentDirection);
                if (currentIndex < 0) currentIndex = allowedDirections.findIndex(value => value >= currentDirection);
                if (currentIndex < 0) currentIndex = 0;
                nextDirection = allowedDirections[(currentIndex + 1) % allowedDirections.length];
            }
            else nextDirection = ((((Math.round(currentDirection / 45) + 1) % 8) + 8) % 8) * 45;

            const directionIndex = Math.trunc(nextDirection / 45);
            pendingEqualAction.current = { type: 'rotate', direction: directionIndex };
            setDirection(directionIndex);
            requestBuilder(2, event.id);
            return;
        }

        if (enabled.changeEqual)
        {
            pendingEqualAction.current = { type: 'state', state: furnitureStateRef.current };
            requestBuilder(2, event.id);
            return;
        }

        if (stateEnabled)
        {
            SendMessageComposer(new FurnitureMultiStateComposer(event.id, furnitureStateRef.current));
            setServerMessage(`Estado ${furnitureStateRef.current} enviado para a mobília selecionada.`);
        }
    });

    useEffect(() =>
    {
        if (!teleportEnabled || ownHabboId < 1) return;

        const onRoomTileClick = (event: Event) =>
        {
            const { x, y } = (event as CustomEvent<{ x: number; y: number }>).detail;
            if (!Number.isInteger(x) || !Number.isInteger(y) || requestPending) return;

            requestBuilder(6, ownHabboId, x, y);
        };

        window.addEventListener('room-builder:tile-click', onRoomTileClick);
        return () => window.removeEventListener('room-builder:tile-click', onRoomTileClick);
    }, [teleportEnabled, ownHabboId, requestPending, requestBuilder]);

    useRoomEngineEvent<RoomEngineEvent>(RoomEngineEvent.DISPOSED, () => setVisible(false));
    useEffect(() =>
    {
        const tracker: ILinkEventTracker = { linkReceived: (url: string) => { const action = url.split('/')[1]; if (action === 'toggle') setVisible(value => { const next = !value; if (next) requestBuilder(0); return next; }); if (action === 'show') { setVisible(true); requestBuilder(0); } if (action === 'hide') setVisible(false); }, eventUrlPrefix: 'room-builder/' };
        AddEventLinkTracker(tracker);
        return () => { RemoveLinkEventTracker(tracker); if (requestTimeout.current) clearTimeout(requestTimeout.current); };
    }, [requestBuilder]);

    const applyFurnitureDirection = (value: number) =>
    {
        const roomSession = GetRoomSession();
        if (!selectionIds.length || !roomSession)
        {
            setServerMessage('Selecione uma mobília ou um grupo para girar.');
            return;
        }
        const rotation = ((Math.round(value) % 8) + 8) % 8;
        let updated = 0;
        selectionIds.forEach(itemId =>
        {
            const roomObject = GetRoomEngine().getRoomObject(roomSession.roomId, itemId, RoomObjectCategory.FLOOR);
            if (!roomObject) return;
            const location = roomObject.getLocation();
            SendMessageComposer(new FurnitureFloorUpdateComposer(itemId, Math.round(location.x), Math.round(location.y), rotation));
            updated++;
        });
        setDirection(rotation);
        setServerMessage(`Rotação enviada para ${updated} mobília(s).`);
    }
    const setEqualMode = (key: 'changeEqual' | 'rotateEqual' | 'chooseEqual', active: boolean) =>
    {
        setEnabled(value => ({ ...value, changeEqual: active && key === 'changeEqual', rotateEqual: active && key === 'rotateEqual', chooseEqual: active && key === 'chooseEqual' }));
        if(active) setServerMessage(`${key === 'changeEqual' ? 'Alterar todos iguais' : key === 'rotateEqual' ? 'Girar todos iguais' : 'Recolher todos iguais'}: clique em uma mobília.`);
    };
    const toggleRow = (label: string, key: ToggleKey, checked: boolean, onChange: (checked: boolean) => void, disabled = false) =>
        <label className="builder-toggle-row" key={key}>
            <input type="checkbox" checked={checked} disabled={disabled} onChange={event => onChange(event.target.checked)} />
            <span className="builder-switch" />
            <span className="builder-toggle-label">{label}</span>
        </label>;
    const sectionTitle = (title: string, key: string) =>
        <button className="builder-section-title" onClick={() => setOpen(value => ({ ...value, [key]: !value[key] }))}>
            {title}<span>{open[key] ? '⌃' : '⌄'}</span>
        </button>;
    const updateSelectedFurniture = (action: (itemId: number) => void) =>
    {
        if(selectedFurnitureId < 1) { setServerMessage('Selecione uma mobília no quarto primeiro.'); return; }
        action(selectedFurnitureId);
    };
    const clearTool = () =>
    {
        setEnabled(value => ({ ...value, autoHeight: false, changeEqual: false, rotateEqual: false, chooseEqual: false, copyPile: false, movePile: false }));
        setPlacementHeightEnabled(false);
        setStateEnabled(false);
        setViewHeightEnabled(false);
        setViewStateEnabled(false);
        setTeleportEnabled(false);
        setHeight(0);
        setAutomaticHeight(0);
        setFurnitureState(0);
        setDirection(0);
        setSelectionIds([]);
        setSelectedFurnitureId(0);
        setSelectedFurnitureClassId(0);
        setSelectedFurnitureName('Selecione uma mobília');
        setServerMessage('Ferramenta limpa.');
    };

    if (!visible) return null;

    return <NitroCardView uniqueKey="room-builder" className="nitro-room-builder" theme="primary">
        <NitroCardHeaderView headerText="Ferramenta de Construção" onCloseClick={() => setVisible(false)} />
        <NitroCardContentView className="room-builder-content">
            <div className="builder-selected-furniture">{selectedFurnitureClassId > 0 && <LayoutFurniIconImageView productType="s" productClassId={selectedFurnitureClassId} />}<span>{selectedFurnitureName}</span></div>

            <section className="builder-section">
                {sectionTitle('Ações com mobílias', 'furniture')}
                {open.furniture && <>
                    <div className="builder-setting-row">
                        {toggleRow('Altura', 'keepHeight', placementHeightEnabled, active => { setPlacementHeightEnabled(active); requestBuilder(4, active ? Math.round(height * 100) : -1, false); })}
                        <div className="builder-stepper"><input className="builder-number" type="number" min="0" max="40" step="0.01" value={height} onChange={event => setHeight(Number(event.target.value))} onBlur={() => placementHeightEnabled && requestBuilder(4, Math.round(height * 100), false)} /><span><button onClick={() => setHeight(value => Math.min(40, value + 0.1))}><FaArrowUp /></button><button onClick={() => setHeight(value => Math.max(0, value - 0.1))}><FaArrowDown /></button></span></div>
                    </div>
                    <div className="builder-setting-row">
                        {toggleRow('Altura automática', 'autoHeight', enabled.autoHeight, active => { setEnabled(value => ({ ...value, autoHeight: active })); requestBuilder(4, active ? Math.round(automaticHeight * 100) : -1, active); })}
                        <div className="builder-stepper"><input className="builder-number" type="number" min="0" max="40" step="0.01" value={automaticHeight} onChange={event => setAutomaticHeight(Number(event.target.value))} /><span><button onClick={() => setAutomaticHeight(value => Math.min(40, value + 0.1))}><FaArrowUp /></button><button onClick={() => setAutomaticHeight(value => Math.max(0, value - 0.1))}><FaArrowDown /></button></span></div>
                    </div>
                    <div className="builder-setting-row">
                        {toggleRow('Estado', 'choosePile', stateEnabled, active => setStateEnabled(active))}
                        <div className="builder-stepper"><input className="builder-number" type="number" value={furnitureState} onChange={event => setFurnitureState(Number(event.target.value))} /><span><button onClick={() => setFurnitureState(value => value + 1)}><FaArrowUp /></button><button onClick={() => setFurnitureState(value => value - 1)}><FaArrowDown /></button></span></div>
                    </div>
                    {toggleRow('Ver altura', 'viewHeight', viewHeightEnabled, active => { setViewHeightEnabled(active); if(active) updateSelectedFurniture(itemId => { const roomSession = GetRoomSession(); const roomObject = roomSession && GetRoomEngine().getRoomObject(roomSession.roomId, itemId, RoomObjectCategory.FLOOR); if(roomObject) setServerMessage(`Altura atual: ${roomObject.getLocation().z.toFixed(2)}`); }); })}
                    {toggleRow('Ver estados', 'organizeWired', viewStateEnabled, active => { setViewStateEnabled(active); if(active) updateSelectedFurniture(itemId => { const roomSession = GetRoomSession(); const roomObject = roomSession && GetRoomEngine().getRoomObject(roomSession.roomId, itemId, RoomObjectCategory.FLOOR); if(roomObject) setServerMessage(`Estado atual: ${roomObject.getState(0)}`); }); })}
                    <div className="builder-direction"><button aria-label="Girar à esquerda" onClick={() => applyFurnitureDirection(direction - 1)}><FaArrowLeft /></button><button aria-label="Girar para trás" onClick={() => applyFurnitureDirection(direction - 2)}><FaArrowDown /></button><button aria-label="Girar para frente" onClick={() => applyFurnitureDirection(direction + 2)}><FaArrowUp /></button><button aria-label="Girar à direita" onClick={() => applyFurnitureDirection(direction + 1)}><FaArrowRight /></button></div>
                </>}
            </section>

            <section className="builder-section">
                {sectionTitle('Ações com personagem', 'avatar')}
                {open.avatar && <>
                    {toggleRow('Congelar Habbo', 'freezeAvatar', avatarFrozen, active => { pendingAvatarFrozen.current = active; requestBuilder(5, ownHabboId, active); }, ownHabboId < 1 || requestPending)}
                    {toggleRow('Teleportar', 'teleport', teleportEnabled, active => { if(ownHabboId < 1) { setServerMessage('Não foi possível identificar seu avatar.'); return; } setTeleportEnabled(active); }, ownHabboId < 1)}
                </>}
            </section>

            <section className="builder-section">
                {sectionTitle('Itens iguais', 'equal')}
                {open.equal && <>
                    {toggleRow('Alterar todos iguais', 'changeEqual', enabled.changeEqual, active => setEqualMode('changeEqual', active), requestPending)}
                    {toggleRow('Girar todos iguais', 'rotateEqual', enabled.rotateEqual, active => setEqualMode('rotateEqual', active), requestPending)}
                    {toggleRow('Recolher todos iguais', 'chooseEqual', enabled.chooseEqual, active => setEqualMode('chooseEqual', active), requestPending)}
                </>}
            </section>

            <section className="builder-section">
                {sectionTitle('Ações em quadrados', 'squares')}
                {open.squares && <>
                    {toggleRow('Copiar pilha', 'copyPile', enabled.copyPile, active => { setEnabled(value => ({ ...value, copyPile: active })); setServerMessage('Copiar pilha precisa da integração de lote no emulador.'); })}
                    {toggleRow('Mover pilha', 'movePile', enabled.movePile, active => { setEnabled(value => ({ ...value, movePile: active })); setServerMessage('Mover pilha precisa da integração de lote no emulador.'); })}
                </>}
            </section>

            {serverMessage && <div className="builder-server-status">{requestPending ? 'Processando...' : serverMessage}</div>}
            <div className="builder-bottom-actions"><button className="builder-clear" onClick={clearTool}>Limpar</button><button className="builder-save" onClick={() => setServerMessage('Salvar construção precisa da integração de persistência no emulador.')}>Salvar</button></div>
            <button className="builder-floor" onClick={() => CreateLinkEvent('floor-editor/toggle')}>Editor de Chão</button>
            <a className="builder-help" href="#" onClick={event => { event.preventDefault(); setServerMessage('Selecione uma mobília e ative a ação desejada.'); }}>Entenda a Ferramenta</a>
        </NitroCardContentView>
    </NitroCardView>;
};
