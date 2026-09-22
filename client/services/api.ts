const API_BASE = typeof window !== 'undefined' ? '/api' : 'http://127.0.0.1:8080/api';

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
  liveEtaMinutes?: number | null;
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
  login: async (email: string, password: string): Promise<{token: string; email: string; role: string; name: string}> => {
    const res = await fetch(`${API_BASE}/auth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) throw new Error("Auth failed");
    return await res.json();
  },
  
  register: async (
    role: string,
    name: string,
    email: string,
    password?: string,
    campus?: string,
    pickupLatitude?: number,
    pickupLongitude?: number,
    driverId?: string,
    assignedBusId?: string,
    assignedRouteId?: string,
    assignedStopId?: string
  ): Promise<{
    token: string;
    email: string;
    role: string;
    name: string;
    message: string;
    assignedRouteId?: string;
    assignedStopId?: string;
    assignedRouteName?: string;
    assignedStopName?: string;
  }> => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role, name, email, password,
        campus, pickupLatitude, pickupLongitude,
        driverId, assignedBusId, assignedRouteId, assignedStopId
      })
    });
    if (!res.ok) {
      let errorMsg = "Registration failed";
      try {
        const errorData = await res.json();
        errorMsg = errorData.message || errorMsg;
      } catch {
        // Ignore JSON parsing failure
      }
      throw new Error(errorMsg);
    }
    return await res.json();
  },

  getRoutes: async (): Promise<Route[]> => {
    const res = await fetch(`${API_BASE}/routes`);
    if (!res.ok) throw new Error("Failed to fetch routes");
    const data = await res.json();
    return Array.isArray(data) ? data : [];
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
  },

  simulateB01: async (reverse = false): Promise<{ ok: boolean; delayMinutes?: number; message?: string }> => {
    const res = await fetch(`${API_BASE}/buses/B01/simulate?reverse=${reverse}`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("Failed to start B01 simulation");
    return res.json();
  },

  getAlerts: async (): Promise<Array<{ id: number; busId: string; type: string; status: string; message: string; timestamp: string }>> => {
    try {
      const res = await fetch(`${API_BASE}/alerts?audience=student`);
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  },

  getAdminAlerts: async (): Promise<Array<{ id: number; busId: string; type: string; status: string; message: string; timestamp: string }>> => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const res = await fetch(`${API_BASE}/alerts?audience=admin`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  },

  getMlMetadata: async (): Promise<Record<string, unknown>> => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const res = await fetch(`${API_BASE}/ml/metadata`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error("Failed to load ML metadata");
    return res.json();
  },

  runMlValidation: async (): Promise<Record<string, unknown>> => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const res = await fetch(`${API_BASE}/ml/validate`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error("ML validation failed");
    return res.json();
  },
};
