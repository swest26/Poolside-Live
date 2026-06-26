from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import re
import random
import string
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")


# ---------- Models ----------
class Race(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_number: str
    event_name: str
    heat_number: str
    order: int


class Message(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    text: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class Meet(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    code: str
    passcode: str
    races: List[Race] = []
    current_index: int = 0
    messages: List[Message] = []
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class MeetCreate(BaseModel):
    name: str
    passcode: str
    events_text: str


class PasscodeBody(BaseModel):
    passcode: str


class EventsUpdate(BaseModel):
    passcode: str
    events_text: str


class IndexBody(BaseModel):
    passcode: str
    index: int


class MessageBody(BaseModel):
    passcode: str
    text: str


# ---------- Helpers ----------
def gen_code() -> str:
    return ''.join(random.choices('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', k=6))


def parse_events(text: str) -> List[Race]:
    races: List[Race] = []
    order = 0
    for raw in text.splitlines():
        line = raw.strip()
        if not line:
            continue
        # support pipe or comma separated: number | name | heat
        if '|' in line:
            parts = [p.strip() for p in line.split('|')]
        elif ',' in line:
            parts = [p.strip() for p in line.split(',')]
        else:
            parts = [line]

        if len(parts) >= 3:
            event_number, event_name, heat_number = parts[0], parts[1], parts[2]
        elif len(parts) == 2:
            event_number, event_name, heat_number = parts[0], parts[1], "1"
        else:
            # freeform: try to pull a leading number as event number
            m = re.match(r'^(?:event\s*)?(\d+)[\s.\-:]+(.*)$', parts[0], re.IGNORECASE)
            if m:
                event_number, event_name, heat_number = m.group(1), m.group(2).strip(), "1"
            else:
                event_number, event_name, heat_number = str(order + 1), parts[0], "1"

        if not event_number:
            event_number = str(order + 1)
        if not heat_number:
            heat_number = "1"

        races.append(Race(
            event_number=event_number,
            event_name=event_name or f"Event {event_number}",
            heat_number=heat_number,
            order=order,
        ))
        order += 1
    return races


def public_meet(meet: Meet) -> dict:
    d = meet.model_dump()
    d.pop('passcode', None)
    return d


async def get_meet_or_404(code: str) -> Meet:
    doc = await db.meets.find_one({"code": code.upper()})
    if not doc:
        raise HTTPException(status_code=404, detail="Meet not found")
    doc.pop('_id', None)
    return Meet(**doc)


async def get_meet_by_id_or_404(meet_id: str) -> Meet:
    doc = await db.meets.find_one({"id": meet_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Meet not found")
    doc.pop('_id', None)
    return Meet(**doc)


# ---------- Routes ----------
@api_router.get("/")
async def root():
    return {"message": "Poolside Live API"}


@api_router.post("/meets")
async def create_meet(body: MeetCreate):
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="Meet name required")
    if not body.passcode.strip():
        raise HTTPException(status_code=400, detail="Passcode required")
    races = parse_events(body.events_text)
    if not races:
        raise HTTPException(status_code=400, detail="No events found. Add at least one event.")

    # ensure unique code
    code = gen_code()
    while await db.meets.find_one({"code": code}):
        code = gen_code()

    meet = Meet(
        name=body.name.strip(),
        code=code,
        passcode=body.passcode.strip(),
        races=races,
        current_index=0,
    )
    await db.meets.insert_one(meet.model_dump())
    return meet.model_dump()  # includes passcode for the organizer who created it


@api_router.get("/meets/{code}")
async def get_meet(code: str):
    meet = await get_meet_or_404(code)
    return public_meet(meet)


@api_router.get("/meets/id/{meet_id}/read")
async def read_meet_by_id(meet_id: str):
    meet = await get_meet_by_id_or_404(meet_id)
    return public_meet(meet)


@api_router.post("/meets/{code}/auth")
async def auth_meet(code: str, body: PasscodeBody):
    meet = await get_meet_or_404(code)
    if body.passcode.strip() != meet.passcode:
        raise HTTPException(status_code=401, detail="Incorrect passcode")
    return meet.model_dump()


@api_router.post("/meets/{meet_id}/advance")
async def advance(meet_id: str, body: PasscodeBody):
    meet = await get_meet_by_id_or_404(meet_id)
    if body.passcode.strip() != meet.passcode:
        raise HTTPException(status_code=401, detail="Incorrect passcode")
    new_index = min(meet.current_index + 1, len(meet.races))
    await db.meets.update_one({"id": meet_id}, {"$set": {"current_index": new_index}})
    meet.current_index = new_index
    return meet.model_dump()


@api_router.post("/meets/{meet_id}/previous")
async def previous(meet_id: str, body: PasscodeBody):
    meet = await get_meet_by_id_or_404(meet_id)
    if body.passcode.strip() != meet.passcode:
        raise HTTPException(status_code=401, detail="Incorrect passcode")
    new_index = max(meet.current_index - 1, 0)
    await db.meets.update_one({"id": meet_id}, {"$set": {"current_index": new_index}})
    meet.current_index = new_index
    return meet.model_dump()


@api_router.post("/meets/{meet_id}/set-index")
async def set_index(meet_id: str, body: IndexBody):
    meet = await get_meet_by_id_or_404(meet_id)
    if body.passcode.strip() != meet.passcode:
        raise HTTPException(status_code=401, detail="Incorrect passcode")
    new_index = max(0, min(body.index, len(meet.races)))
    await db.meets.update_one({"id": meet_id}, {"$set": {"current_index": new_index}})
    meet.current_index = new_index
    return meet.model_dump()


@api_router.put("/meets/{meet_id}/events")
async def update_events(meet_id: str, body: EventsUpdate):
    meet = await get_meet_by_id_or_404(meet_id)
    if body.passcode.strip() != meet.passcode:
        raise HTTPException(status_code=401, detail="Incorrect passcode")
    races = parse_events(body.events_text)
    if not races:
        raise HTTPException(status_code=400, detail="No events found.")
    await db.meets.update_one(
        {"id": meet_id},
        {"$set": {"races": [r.model_dump() for r in races], "current_index": 0}},
    )
    meet.races = races
    meet.current_index = 0
    return meet.model_dump()


@api_router.post("/meets/{meet_id}/messages")
async def add_message(meet_id: str, body: MessageBody):
    meet = await get_meet_by_id_or_404(meet_id)
    if body.passcode.strip() != meet.passcode:
        raise HTTPException(status_code=401, detail="Incorrect passcode")
    if not body.text.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    msg = Message(text=body.text.strip())
    messages = [msg.model_dump()] + [m.model_dump() for m in meet.messages]
    messages = messages[:20]  # keep latest 20
    await db.meets.update_one({"id": meet_id}, {"$set": {"messages": messages}})
    meet.messages = [Message(**m) for m in messages]
    return meet.model_dump()


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
