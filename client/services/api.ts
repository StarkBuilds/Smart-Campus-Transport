const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

export interface Bus {
  busId: string;
  plateNumber: string;
  capacity: number;
  status: string;
}

export interface StopInfo {
  stopId: string;
  name: string;
  latitude: number;
  longitude: number;
  sequenceOrder: number;
  arrivalOffsetMinutes: number | null;
}

export interface Route {
  routeId: string;
  name: string;
  description: string;
  color: string;
  stops: StopInfo[];
}

export interface Location {
  latitude: number;
  longitude: number;
  timestamp: string;
  speed: number;
}

export interface Prediction {
  etaMinutes: number;
  confidence: number;
  status: string;
}

export const api = {
  login: async (email: string, password: string): Promise<{token: string; email: string; role: string}> => {
    try {
      const res = await fetch(`${API_BASE}/auth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      if (!res.ok) throw new Error("Auth failed");
      const data = await res.json();
      return data;
    } catch (err) {
      throw err;
    }
  },
  getRoutes: async (): Promise<Route[]> => {
    try {
      const res = await fetch(`${API_BASE}/routes`);
      if (!res.ok) throw new Error("Failed to fetch routes");
      return res.json();
    } catch {
      return [];
    }
  },

  getBuses: async (): Promise<Bus[]> => {
    try {
      const res = await fetch(`${API_BASE}/buses`);
      if (!res.ok) throw new Error("Failed to fetch buses");
      return res.json();
    } catch {
      return [];
    }
  },

  getBusLocation: async (busId: string): Promise<Location | null> => {
    try {
      const res = await fetch(`${API_BASE}/buses/${busId}/location`);
      if (!res.ok) throw new Error("Failed to fetch bus location");
      return res.json();
    } catch {
      return null;
    }
  },

  getBusPrediction: async (busId: string): Promise<Prediction | null> => {
    try {
      const res = await fetch(`${API_BASE}/buses/${busId}/prediction`);
      if (!res.ok) throw new Error("Failed to fetch prediction");
      return res.json();
    } catch {
      return null;
    }
  }
};
