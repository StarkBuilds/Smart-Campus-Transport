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

    public static volatile boolean DEMO_DELAY_ACTIVE = false;
    public static volatile int demoDelayMinutes = 0;

    private static final String ROUTE_ID = "R01";
    private static final String BUS_ID = "B01";
    private static final double DEFAULT_SPEED_KMH = 28.0;
    private static final double STOP_ARRIVAL_RADIUS_M = 55.0;

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
    private double speedKmh = DEFAULT_SPEED_KMH;
    private long lastUpdateTime = System.currentTimeMillis();
    private int nextStopIndex = 0;
    private boolean delayAlertPublished = false;

    @PostConstruct
    public void init() {
        ensureFixedGeometry();
        distanceAlongMeters = 0.0;
        reverse = false;
        nextStopIndex = 0;
        lastUpdateTime = System.currentTimeMillis();
    }

    /**
     * Demo control: run SOURCE → DESTINATION (or reversed) on the fixed OSRM path.
     */
    public synchronized void startDemo(boolean reverseDirection) {
        ensureFixedGeometry();
        this.reverse = reverseDirection;
        this.running = true;
        this.speedKmh = DEFAULT_SPEED_KMH + (Math.random() * 6.0 - 3.0);
        this.lastUpdateTime = System.currentTimeMillis();

        if (reverseDirection) {
            this.distanceAlongMeters = totalLengthMeters;
            this.nextStopIndex = Math.max(0, b01Stops.size() - 1);
        } else {
            this.distanceAlongMeters = 0.0;
            this.nextStopIndex = 0;
        }

        // Apply a genuine delay once for this demo run (feeds ETA + status + alert).
        DEMO_DELAY_ACTIVE = true;
        demoDelayMinutes = 3 + (int) (Math.random() * 5);
        delayAlertPublished = false;
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

        log.info("SIMULATE B01 started reverse={} speed={}km/h delay=+{}m",
                reverseDirection, String.format("%.1f", speedKmh), demoDelayMinutes);

        // Immediately publish the reset position so the map/ETA don't lag a full tick.
        try {
            Point position = interpolateAt(distanceAlongMeters);
            double bearing = bearingAt(distanceAlongMeters);
            busEventService.ingestEvent(new BusLocationEventRequest(
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
                    resolveNextStopId()
            ));
        } catch (Exception e) {
            log.warn("Could not publish demo start position: {}", e.getMessage());
        }
    }

    public synchronized void clearDemoDelay() {
        DEMO_DELAY_ACTIVE = false;
        demoDelayMinutes = 0;
        delayAlertPublished = false;
        alertService.resolveLateBusAlertPublic(BUS_ID);
    }

    public boolean isReverse() {
        return reverse;
    }

    public boolean isRunning() {
        return running;
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

            double deltaMeters = (speedKmh * 1000.0 / 3600.0) * timeDeltaSeconds;
            if (reverse) {
                distanceAlongMeters -= deltaMeters;
                if (distanceAlongMeters <= 0) {
                    distanceAlongMeters = 0;
                    reverse = false;
                    nextStopIndex = 0;
                }
            } else {
                distanceAlongMeters += deltaMeters;
                if (distanceAlongMeters >= totalLengthMeters) {
                    distanceAlongMeters = totalLengthMeters;
                    reverse = true;
                    nextStopIndex = Math.max(0, b01Stops.size() - 1);
                }
            }

            Point position = interpolateAt(distanceAlongMeters);
            double bearing = bearingAt(distanceAlongMeters);
            updateNextStopIndex(position);

            String nextStopId = resolveNextStopId();

            try {
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
                busEventService.ingestEvent(request);
            } catch (Exception e) {
                log.error("Simulation error", e);
            }

            if (DEMO_DELAY_ACTIVE && !delayAlertPublished && demoDelayMinutes > 0) {
                try {
                    alertService.publishLateBusAlert(BUS_ID, ROUTE_ID, "TRIP-01", nextStopId, demoDelayMinutes);
                    delayAlertPublished = true;
                } catch (Exception ignored) {
                    // non-fatal
                }
            }
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
