import json
from typing import List

from fastapi import WebSocket


class ConnectionManager:
    """
    Tracks active analyst/admin dashboard WebSocket connections and
    broadcasts security events / live stats to all of them.
    """

    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        payload = json.dumps(message, default=str)
        dead = []
        for connection in self.active_connections:
            try:
                await connection.send_text(payload)
            except Exception:
                dead.append(connection)
        for d in dead:
            self.disconnect(d)


manager = ConnectionManager()


async def broadcast_security_event(event_dict: dict):
    await manager.broadcast({"type": "security_event", "data": event_dict})


async def broadcast_stats(stats_dict: dict):
    await manager.broadcast({"type": "stats_update", "data": stats_dict})


async def broadcast_risk_update(risk_dict: dict):
    await manager.broadcast({"type": "risk_update", "data": risk_dict})
