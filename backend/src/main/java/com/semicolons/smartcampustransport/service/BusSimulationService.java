package com.semicolons.smartcampustransport.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.semicolons.smartcampustransport.dto.BusLocationEventRequest;
import com.semicolons.smartcampustransport.entity.RouteStop;
import com.semicolons.smartcampustransport.entity.Stop;
import com.semicolons.smartcampustransport.repository.RouteStopRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * B01 progresses along ONE fixed OSRM LineString derived from canonical sanitized route_stops.
 * Geometry is regenerated only when the stop sequence signature changes.
 * ML predictions never reroute the bus.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class BusSimulationService {

    /** When true, cruise speed is reduced so remaining road-time creates a real timing deviation. */
    public static volatile boolean DEMO_DELAY_ACTIVE = false;
    /** Intended journey delay minutes used to derive cruise speed (not a frozen UI stamp). */
    public static volatile int demoDelayMinutes = 0;
    public static final double NOMINAL_SPEED_KMH = 28.0;

    private static final String ROUTE_ID = "R01";
    private static final String BUS_ID = "B01";
    private static final double STOP_ARRIVAL_RADIUS_M = 55.0;
    private static final double STOP_DWELL_SECONDS = 8.0;
    private static final double APPROACH_SLOW_RADIUS_M = 120.0;

    private final BusEventService busEventService;
    private final RouteGeometryService routeGeometryService;
    private final RouteStopRepository routeStopRepository;
    private final AlertService alertService;

    public static class Point {
        public final double lat;
        public final double lon;

        public Point(double lat, double lon) {
            this.lat = lat;
            this.lon = lon;
        }
    }

    private List<Point> b01Geometry = List.of();
    private double[] cumulativeMeters = new double[0];
    private double totalLengthMeters = 0.0;
    private String geometrySignature = "";

    private List<RouteStop> b01Stops = List.of();
    private int[] stopGeometryIndexes = new int[0];

    private double distanceAlongMeters = 0.0;
    private boolean reverse = false;
    private boolean running = true;
    private double cruiseSpeedKmh = NOMINAL_SPEED_KMH;
    private double speedKmh = NOMINAL_SPEED_KMH;
    private long lastUpdateTime = System.currentTimeMillis();
    private int nextStopIndex = 0;
    private boolean delayAlertPublished = false;
    private double dwellRemainingSeconds = 0.0;
    private int lastDwelledStopIndex = -1;

    @PostConstruct
    public void init() {
        ensureFixedGeometry();
        distanceAlongMeters = 0.0;
        reverse = false;
        nextStopIndex = 0;
        lastUpdateTime = System.currentTimeMillis();
        DEMO_DELAY_ACTIVE = false;
        demoDelayMinutes = 0;
    }

    /**
     * Demo control: run SOURCE → DESTINATION (or reversed) on the fixed OSRM path.
     * Intended delay is realized by slowing cruise speed over remaining road distance.
     */
    public synchronized void startDemo(boolean reverseDirection) {
        ensureFixedGeometry();
        this.reverse = reverseDirection;
        this.running = true;
        this.lastUpdateTime = System.currentTimeMillis();
        this.dwellRemainingSeconds = 0;
        this.lastDwelledStopIndex = -1;

        if (reverseDirection) {
            this.distanceAlongMeters = totalLengthMeters;
            this.nextStopIndex = Math.max(0, b01Stops.size() - 1);
        } else {
            this.distanceAlongMeters = 0.0;
            this.nextStopIndex = 0;
        }

        // Genuine timing deviation: 2–5 min intended, realized via ONE reduced cruise speed for the trip.
        DEMO_DELAY_ACTIVE = true;
        demoDelayMinutes = 2 + (int) (Math.random() * 4);
        delayAlertPublished = false;

        double remainingM = reverseDirection ? totalLengthMeters : totalLengthMeters;
        double remainingKm = Math.max(0.2, remainingM / 1000.0);
        double nominalHours = remainingKm / NOMINAL_SPEED_KMH;
        double targetHours = nominalHours + (demoDelayMinutes / 60.0);
        this.cruiseSpeedKmh = Math.max(12.0, Math.min(NOMINAL_SPEED_KMH - 1.0, remainingKm / Math.max(targetHours, 1e-4)));
        this.speedKmh = cruiseSpeedKmh;

        try {
            alertService.publishLateBusAlert(
                    BUS_ID,
                    ROUTE_ID,
                    "TRIP-01",
                    resolveNextStopId(),
                    demoDelayMinutes
            );
            delayAlertPublished = true;
        } catch (Exception e) {
            log.warn("Could not publish demo delay alert: {}", e.getMessage());
        }

        log.info("SIMULATE B01 started reverse={} cruise={}km/h intendedDelay=+{}m",
                reverseDirection, String.format("%.1f", cruiseSpeedKmh), demoDelayMinutes);

        publishPosition();
    }

    public synchronized void clearDemoDelay() {
        DEMO_DELAY_ACTIVE = false;
        demoDelayMinutes = 0;
        cruiseSpeedKmh = NOMINAL_SPEED_KMH;
        delayAlertPublished = false;
        alertService.resolveLateBusAlertPublic(BUS_ID);
    }

    public boolean isReverse() {
        return reverse;
    }

    public boolean isRunning() {
        return running;
    }

    public double getCruiseSpeedKmh() {
        return cruiseSpeedKmh;
    }

    /** Called when stop sequence changes (e.g. admin adds a stop). */
    public synchronized void generateGeometryNow() {
        geometrySignature = "";
        ensureFixedGeometry();
    }

    @Scheduled(fixedRate = 1000, initialDelay = 4000)
    public void simulateBusMovement() {
        if (!running) {
            return;
        }

        synchronized (this) {
            ensureFixedGeometry();
            if (b01Geometry.isEmpty() || b01Stops.isEmpty() || totalLengthMeters <= 0) {
                return;
            }

            long currentTime = System.currentTimeMillis();
            double timeDeltaSeconds = Math.min(2.0, Math.max(0.05, (currentTime - lastUpdateTime) / 1000.0));
            lastUpdateTime = currentTime;

            // Brief dwell at canonical stops — speed drops to ~0, then resumes.
            if (dwellRemainingSeconds > 0) {
                dwellRemainingSeconds = Math.max(0, dwellRemainingSeconds - timeDeltaSeconds);
                speedKmh = 0.0;
                publishPosition();
                return;
            }

            // Keep demo cruise speed fixed for the trip (do not recompute each tick).
            if (!DEMO_DELAY_ACTIVE) {
                cruiseSpeedKmh = NOMINAL_SPEED_KMH;
            }
            speedKmh = computeInstantSpeed();

            double deltaMeters = (speedKmh * 1000.0 / 3600.0) * timeDeltaSeconds;
            // Monotonic progress along the fixed path (no overshoot/backtrack within a tick).
            if (reverse) {
                distanceAlongMeters = Math.max(0, distanceAlongMeters - deltaMeters);
                if (distanceAlongMeters <= 0) {
                    distanceAlongMeters = 0;
                    // End of reverse trip — clear demo stamp; next outbound starts clean.
                    if (DEMO_DELAY_ACTIVE) {
                        clearDemoDelay();
                    }
                    reverse = false;
                    nextStopIndex = 0;
                    cruiseSpeedKmh = NOMINAL_SPEED_KMH;
                }
            } else {
                distanceAlongMeters = Math.min(totalLengthMeters, distanceAlongMeters + deltaMeters);
                if (distanceAlongMeters >= totalLengthMeters) {
                    distanceAlongMeters = totalLengthMeters;
                    if (DEMO_DELAY_ACTIVE) {
                        clearDemoDelay();
                    }
                    reverse = true;
                    nextStopIndex = Math.max(0, b01Stops.size() - 1);
                    cruiseSpeedKmh = NOMINAL_SPEED_KMH;
                }
            }

            Point position = interpolateAt(distanceAlongMeters);
            updateNextStopIndex(position);
            maybeStartDwell();

            publishPosition();
        }
    }

    private void publishPosition() {
        try {
            Point position = interpolateAt(distanceAlongMeters);
            double bearing = bearingAt(distanceAlongMeters);
            String nextStopId = resolveNextStopId();
            BusLocationEventRequest request = new BusLocationEventRequest(
                    BUS_ID,
                    ROUTE_ID,
                    "TRIP-01",
                    Instant.now().toString(),
                    position.lat,
                    position.lon,
                    bearing,
                    speedKmh,
                    5.0,
                    "IN_SERVICE",
                    nextStopId
            );
            busEventService.ingestEvent(request, true);
        } catch (Exception e) {
            log.error("Simulation error", e);
        }

        if (DEMO_DELAY_ACTIVE && !delayAlertPublished && demoDelayMinutes > 0) {
            try {
                alertService.publishLateBusAlert(BUS_ID, ROUTE_ID, "TRIP-01", resolveNextStopId(), demoDelayMinutes);
                delayAlertPublished = true;
            } catch (Exception ignored) {
                // non-fatal
            }
        }
    }

    /**
     * Kept for clarity: demo cruise is locked in startDemo; non-demo uses nominal.
     */
    private void recomputeCruiseSpeed() {
        if (!DEMO_DELAY_ACTIVE) {
            cruiseSpeedKmh = NOMINAL_SPEED_KMH;
        }
    }

    private double computeInstantSpeed() {
        if (b01Stops.isEmpty() || stopGeometryIndexes.length == 0) {
            return cruiseSpeedKmh;
        }
        int idx = Math.max(0, Math.min(nextStopIndex, stopGeometryIndexes.length - 1));
        double stopDist = cumulativeMeters[stopGeometryIndexes[idx]];
        double distToStop = Math.abs(distanceAlongMeters - stopDist);
        if (distToStop < APPROACH_SLOW_RADIUS_M) {
            double factor = Math.max(0.15, distToStop / APPROACH_SLOW_RADIUS_M);
            return cruiseSpeedKmh * factor;
        }
        // Mild natural variation while cruising
        double wobble = 1.0 + 0.04 * Math.sin(distanceAlongMeters / 180.0);
        return cruiseSpeedKmh * wobble;
    }

    private void maybeStartDwell() {
        if (b01Stops.isEmpty()) {
            return;
        }
        int idx = Math.max(0, Math.min(nextStopIndex, b01Stops.size() - 1));
        // Dwell when we have just arrived at a stop we haven't dwelled at yet.
        double stopDist = cumulativeMeters[stopGeometryIndexes[idx]];
        if (Math.abs(distanceAlongMeters - stopDist) <= STOP_ARRIVAL_RADIUS_M
                && lastDwelledStopIndex != idx) {
            lastDwelledStopIndex = idx;
            dwellRemainingSeconds = STOP_DWELL_SECONDS;
            speedKmh = 0.0;
        }
    }

    private void ensureFixedGeometry() {
        List<RouteStop> stops = routeStopRepository.findByRouteIdOrderBySequenceOrder(ROUTE_ID);
        if (stops.size() < 2) {
            b01Stops = List.of();
            b01Geometry = List.of();
            cumulativeMeters = new double[0];
            totalLengthMeters = 0;
            return;
        }

        String signature = stops.stream()
                .map(rs -> rs.getStopId() + ":" + rs.getSequenceOrder())
                .reduce((a, b) -> a + "|" + b)
                .orElse("");

        if (signature.equals(geometrySignature) && !b01Geometry.isEmpty()) {
            return;
        }

        try {
            JsonNode geomNode = routeGeometryService.getGeometry(ROUTE_ID);
            List<Point> points = new ArrayList<>();
            JsonNode coordinates = geomNode.path("coordinates");
            if (coordinates.isArray()) {
                for (JsonNode coordinate : coordinates) {
                    double lon = coordinate.get(0).asDouble();
                    double lat = coordinate.get(1).asDouble();
                    points.add(new Point(lat, lon));
                }
            }
            if (points.size() < 2) {
                throw new IllegalStateException("OSRM geometry too short for " + ROUTE_ID);
            }

            double[] cum = new double[points.size()];
            cum[0] = 0;
            for (int i = 1; i < points.size(); i++) {
                cum[i] = cum[i - 1] + haversineMeters(
                        points.get(i - 1).lat, points.get(i - 1).lon,
                        points.get(i).lat, points.get(i).lon
                );
            }

            int[] stopIdx = new int[stops.size()];
            for (int i = 0; i < stops.size(); i++) {
                Stop stop = stops.get(i).getStop();
                stopIdx[i] = nearestIndex(points, stop.getLatitude(), stop.getLongitude());
            }

            // Keep monotonic stop indices along outbound geometry to avoid backtracking.
            for (int i = 1; i < stopIdx.length; i++) {
                if (stopIdx[i] < stopIdx[i - 1]) {
                    stopIdx[i] = stopIdx[i - 1];
                }
            }

            this.b01Geometry = List.copyOf(points);
            this.cumulativeMeters = cum;
            this.totalLengthMeters = cum[cum.length - 1];
            this.b01Stops = List.copyOf(stops);
            this.stopGeometryIndexes = stopIdx;
            this.geometrySignature = signature;

            if (distanceAlongMeters > totalLengthMeters) {
                distanceAlongMeters = Math.min(distanceAlongMeters, totalLengthMeters);
            }

            log.info("B01 locked to fixed OSRM path: {} pts, {} m, {} stops",
                    points.size(), Math.round(totalLengthMeters), stops.size());
        } catch (Exception e) {
            log.warn("BusSimulationService could not load R01 OSRM geometry: {}", e.getMessage());
        }
    }

    private void updateNextStopIndex(Point position) {
        if (b01Stops.isEmpty()) {
            return;
        }

        if (!reverse) {
            while (nextStopIndex < b01Stops.size() - 1) {
                Stop stop = b01Stops.get(nextStopIndex).getStop();
                double dist = haversineMeters(position.lat, position.lon, stop.getLatitude(), stop.getLongitude());
                double stopDist = cumulativeMeters[stopGeometryIndexes[nextStopIndex]];
                if (distanceAlongMeters >= stopDist - STOP_ARRIVAL_RADIUS_M || dist < STOP_ARRIVAL_RADIUS_M) {
                    nextStopIndex++;
                } else {
                    break;
                }
            }
        } else {
            while (nextStopIndex > 0) {
                Stop stop = b01Stops.get(nextStopIndex).getStop();
                double dist = haversineMeters(position.lat, position.lon, stop.getLatitude(), stop.getLongitude());
                double stopDist = cumulativeMeters[stopGeometryIndexes[nextStopIndex]];
                if (distanceAlongMeters <= stopDist + STOP_ARRIVAL_RADIUS_M || dist < STOP_ARRIVAL_RADIUS_M) {
                    nextStopIndex--;
                } else {
                    break;
                }
            }
        }
    }

    private String resolveNextStopId() {
        if (b01Stops.isEmpty()) {
            return null;
        }
        int idx = Math.max(0, Math.min(nextStopIndex, b01Stops.size() - 1));
        return b01Stops.get(idx).getStopId();
    }

    private Point interpolateAt(double meters) {
        meters = Math.max(0, Math.min(meters, totalLengthMeters));
        if (b01Geometry.size() == 1) {
            return b01Geometry.get(0);
        }
        int i = 0;
        while (i < cumulativeMeters.length - 2 && cumulativeMeters[i + 1] < meters) {
            i++;
        }
        Point a = b01Geometry.get(i);
        Point b = b01Geometry.get(i + 1);
        double seg = cumulativeMeters[i + 1] - cumulativeMeters[i];
        double t = seg <= 1e-6 ? 0 : (meters - cumulativeMeters[i]) / seg;
        t = Math.max(0, Math.min(1, t));
        return new Point(a.lat + (b.lat - a.lat) * t, a.lon + (b.lon - a.lon) * t);
    }

    private double bearingAt(double meters) {
        meters = Math.max(0, Math.min(meters, totalLengthMeters));
        double lookAhead = reverse ? -8.0 : 8.0;
        Point from = interpolateAt(meters);
        Point to = interpolateAt(meters + lookAhead);
        if (haversineMeters(from.lat, from.lon, to.lat, to.lon) < 0.5) {
            to = interpolateAt(Math.min(totalLengthMeters, meters + 25));
            from = interpolateAt(Math.max(0, meters - 25));
            if (reverse) {
                Point tmp = from;
                from = to;
                to = tmp;
            }
        }
        return calculateBearing(from.lat, from.lon, to.lat, to.lon);
    }

    private int nearestIndex(List<Point> points, double lat, double lon) {
        int best = 0;
        double bestD = Double.MAX_VALUE;
        for (int i = 0; i < points.size(); i++) {
            double d = haversineMeters(points.get(i).lat, points.get(i).lon, lat, lon);
            if (d < bestD) {
                bestD = d;
                best = i;
            }
        }
        return best;
    }

    private double haversineMeters(double lat1, double lon1, double lat2, double lon2) {
        double R = 6371000.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    private double calculateBearing(double lat1, double lon1, double lat2, double lon2) {
        double dLon = Math.toRadians(lon2 - lon1);
        lat1 = Math.toRadians(lat1);
        lat2 = Math.toRadians(lat2);
        double y = Math.sin(dLon) * Math.cos(lat2);
        double x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
        double brng = Math.toDegrees(Math.atan2(y, x));
        return (brng + 360) % 360;
    }
}
