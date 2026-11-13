import { MouseEventType, RoomObjectCategory, RoomObjectVariable } from '@nitrots/nitro-renderer';
import { GetRoomEngine } from './GetRoomEngine';
import { GetRoomSession } from '../session';

let didMouseMove = false;
let lastClick = 0;
let clickCount = 0;
let roomBuilderTeleportEnabled = false;

export const SetRoomBuilderTeleportEnabled = (enabled: boolean) =>
{
    roomBuilderTeleportEnabled = enabled;
}

export const DispatchMouseEvent = (event: MouseEvent, canvasId: number = 1) =>
{
    const x = event.clientX;
    const y = event.clientY;

    let eventType = event.type;

    if(eventType === MouseEventType.MOUSE_CLICK)
    {
        if(lastClick)
        {
            clickCount = 1;

            if(lastClick >= Date.now() - 300) clickCount++;
        }

        lastClick = Date.now();

        if(clickCount === 2)
        {
            if(!didMouseMove) eventType = MouseEventType.DOUBLE_CLICK;

            clickCount = 0;
            lastClick = null;
        }
    }

    switch(eventType)
    {
        case MouseEventType.MOUSE_CLICK:
            break;
        case MouseEventType.DOUBLE_CLICK:
            break;
        case MouseEventType.MOUSE_MOVE:
            didMouseMove = true;
            break;
        case MouseEventType.MOUSE_DOWN:
            didMouseMove = false;
            break;
        case MouseEventType.MOUSE_UP:
            break;
        case MouseEventType.RIGHT_CLICK:
            break;
        default: return;
    }
    
    const roomEngine = GetRoomEngine();

    if(roomBuilderTeleportEnabled && (eventType === MouseEventType.MOUSE_CLICK || eventType === MouseEventType.DOUBLE_CLICK))
    {
        // Refresh the room's hovered tile without dispatching the click that normally makes the avatar walk.
        roomEngine.dispatchMouseEvent(canvasId, x, y, MouseEventType.MOUSE_MOVE, event.altKey, (event.ctrlKey || event.metaKey), event.shiftKey, false);

        const roomSession = GetRoomSession();
        const roomObject = roomSession && roomEngine.getRoomObject(roomSession.roomId, -1, RoomObjectCategory.ROOM);
        const model = roomObject?.model;
        const plane = model?.getValue<number>(RoomObjectVariable.ROOM_SELECTED_PLANE);
        const tileX = model?.getValue<number>(RoomObjectVariable.ROOM_SELECTED_X);
        const tileY = model?.getValue<number>(RoomObjectVariable.ROOM_SELECTED_Y);

        if(plane > 0 && Number.isFinite(tileX) && Number.isFinite(tileY))
        {
            window.dispatchEvent(new CustomEvent('room-builder:tile-click', { detail: { x: Math.trunc(tileX + 0.499), y: Math.trunc(tileY + 0.499) } }));
        }
        return;
    }

    roomEngine.dispatchMouseEvent(canvasId, x, y, eventType, event.altKey, (event.ctrlKey || event.metaKey), event.shiftKey, false);

    if(eventType === MouseEventType.MOUSE_CLICK || eventType === MouseEventType.DOUBLE_CLICK)
    {
        const roomSession = GetRoomSession();
        const roomObject = roomSession && roomEngine.getRoomObject(roomSession.roomId, -1, RoomObjectCategory.ROOM);
        const model = roomObject?.model;
        const plane = model?.getValue<number>(RoomObjectVariable.ROOM_SELECTED_PLANE);
        const tileX = model?.getValue<number>(RoomObjectVariable.ROOM_SELECTED_X);
        const tileY = model?.getValue<number>(RoomObjectVariable.ROOM_SELECTED_Y);

        if(plane > 0 && Number.isFinite(tileX) && Number.isFinite(tileY))
        {
            window.dispatchEvent(new CustomEvent('room-builder:tile-click', { detail: { x: Math.floor(tileX), y: Math.floor(tileY) } }));
        }
    }
}
