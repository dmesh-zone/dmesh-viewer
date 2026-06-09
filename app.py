import os
import httpx
from databricks.sdk import WorkspaceClient
from fastapi import FastAPI, Request
from fastapi.responses import RedirectResponse, Response
from fastapi.staticfiles import StaticFiles

app = FastAPI()
API_APP_URL = os.environ.get("API_APP_URL", "http://localhost:8001")
_ws = None

def get_ws():
    global _ws
    if _ws is None:
        _ws = WorkspaceClient()
    return _ws

@app.get("/")
async def root():
    return RedirectResponse(url="/dmesh-viewer/")

@app.api_route("/dmesh-viewer/api/{path: path}", methods=["GET", "POST"])
async def proxy(path: str, request: Request):
    auth_headers = get_ws().config.authenticate()
    async with httpx.AsyncClient() as client:
        resp = await client.request(
            method=request.method,
            url=f"{API_APP_URL}/{path}",
            headers=auth_headers,
            params=dict(request.query_params),
            content=await request.body(),
        )
    return Response(
        content=resp.content,
        status_code=resp.status_code,
        media_type=resp.headers.get("content-type"),
    )

app.mount("/dmesh-viewer", StaticFiles(directory="dist", html=True), name="static")
