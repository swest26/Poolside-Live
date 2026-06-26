const BASE = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api`;

export type Race = {
  id: string;
  event_number: string;
  event_name: string;
  heat_number: string;
  order: number;
};

export type Message = {
  id: string;
  text: string;
  created_at: string;
};

export type Meet = {
  id: string;
  name: string;
  code: string;
  passcode?: string;
  races: Race[];
  current_index: number;
  messages: Message[];
  live_viewers?: number;
  created_at: string;
};

async function handle(res: Response) {
  if (!res.ok) {
    let detail = "Something went wrong";
    try {
      const data = await res.json();
      detail = data.detail || detail;
    } catch {}
    throw new Error(detail);
  }
  return res.json();
}

export async function createMeet(name: string, passcode: string, events_text: string): Promise<Meet> {
  const res = await fetch(`${BASE}/meets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, passcode, events_text }),
  });
  return handle(res);
}

export async function getMeet(code: string): Promise<Meet> {
  const res = await fetch(`${BASE}/meets/${code.toUpperCase()}`);
  return handle(res);
}

export async function sendMessage(id: string, passcode: string, text: string): Promise<Meet> {
  const res = await fetch(`${BASE}/meets/${id}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ passcode, text }),
  });
  return handle(res);
}

export async function heartbeat(code: string, viewerId: string): Promise<{ viewers: number }> {
  const res = await fetch(`${BASE}/meets/${code.toUpperCase()}/heartbeat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ viewer_id: viewerId }),
  });
  return handle(res);
}

export async function readMeet(id: string): Promise<Meet> {
  const res = await fetch(`${BASE}/meets/id/${id}/read`);
  return handle(res);
}

export async function authMeet(code: string, passcode: string): Promise<Meet> {
  const res = await fetch(`${BASE}/meets/${code.toUpperCase()}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ passcode }),
  });
  return handle(res);
}

export async function advanceMeet(id: string, passcode: string): Promise<Meet> {
  const res = await fetch(`${BASE}/meets/${id}/advance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ passcode }),
  });
  return handle(res);
}

export async function previousMeet(id: string, passcode: string): Promise<Meet> {
  const res = await fetch(`${BASE}/meets/${id}/previous`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ passcode }),
  });
  return handle(res);
}

export async function setIndex(id: string, passcode: string, index: number): Promise<Meet> {
  const res = await fetch(`${BASE}/meets/${id}/set-index`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ passcode, index }),
  });
  return handle(res);
}

export async function updateEvents(id: string, passcode: string, events_text: string): Promise<Meet> {
  const res = await fetch(`${BASE}/meets/${id}/events`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ passcode, events_text }),
  });
  return handle(res);
}
