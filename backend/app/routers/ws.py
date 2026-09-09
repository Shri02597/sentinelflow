from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from jose import JWTError

from app.security.jwt import decode_token
from app.websocket.manager import manager

router = APIRouter()


@router.websocket("/ws/security")
async def security_ws(websocket: WebSocket, token: str = Query(...)):
    """
    Analysts/admins connect with ?token=<access_token>. Connection is
    rejected for missing/invalid tokens or insufficient role.
    """
    try:
        payload = decode_token(token)
        if payload.get("type") != "access" or payload.get("role") not in ("ANALYST", "ADMIN"):
            await websocket.close(code=4403)
            return
    except JWTError:
        await websocket.close(code=4401)
        return

    await manager.connect(websocket)
    try:
        while True:
            # Dashboard doesn't need to send anything; just keep the socket open.
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
