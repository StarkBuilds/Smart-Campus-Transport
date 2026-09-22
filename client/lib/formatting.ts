export function toIST(isoString: string): string {
  try {
    return new Date(isoString).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Kolkata",
      hour12: true,
    })
  } catch (e) {
    return isoString
  }
}

export function getDelayColor(delayMinutes: number) {
  if (Math.abs(delayMinutes) <= 2) return "emerald"
  if (delayMinutes <= 10) return "amber"
  return "red"
}