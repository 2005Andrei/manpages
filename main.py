from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import json


app = FastAPI()


@app.get("/list")
async def list():
    return "idk rn"


@app.get("/")
async def root():
    return FileResponse("./index.html")
