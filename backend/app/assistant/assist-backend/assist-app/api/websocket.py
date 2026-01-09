# WebSocket connection manager and message dispatcher.

async def websocket_endpoint(websocket):
    await websocket.accept()
    await websocket.close()