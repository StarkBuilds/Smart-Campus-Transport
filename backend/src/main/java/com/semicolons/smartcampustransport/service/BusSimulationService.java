package com.semicolons.smartcampustransport.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.semicolons.smartcampustransport.dto.BusLocationEventRequest;
import com.semicolons.smartcampustransport.entity.RouteStop;
import com.semicolons.smartcampustransport.repository.RouteStopRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

@Service
@RequiredArgsConstructor
@Slf4j
public class BusSimulationService {

    private final BusEventService busEventService;
    private final RouteStopRepository routeStopRepository;
    private final RouteGeometryService routeGeometryService;

    private final List<Coordinate> routeCoordinates = new ArrayList<>();
    private final List<RouteStop> routeStops = new ArrayList<>();
    private final List<Integer> stopCoordinateIndices = new ArrayList<>();
    private int currentPointIndex;
    private boolean outbound = true;
    private int dwellTicks;
    private double bearing;
    private String routeSignature = "";

    private record Coordinate(double longitude, double latitude) {}

    @PostConstruct
    public void init() {
        try {
            refreshRoute();
        } catch (Exception exception) {
            log.error("B01 simulation will wait for an active R01 route", exception);
        }
    }

    @Scheduled(fixedRate = 2000)
    public synchronized void simulateBusMovement() {
        refreshRouteIfChanged();
        if (routeCoordinates.size() < 2 || routeStops.size() < 2) return;

        Coordinate current = routeCoordinates.get(currentPointIndex);
        if (dwellTicks > 0) {
            dwellTicks--;
            emit(current, 0.0);
            return;
        }

        int nextIndex = outbound ? currentPointIndex + 1 : currentPointIndex - 1;
        if (nextIndex >= routeCoordinates.size() || nextIndex < 0) {
            outbound = !outbound;
            currentPointIndex = outbound ? 0 : routeCoordinates.size() - 1;
            dwellTicks = 6;
            emit(routeCoordinates.get(currentPointIndex), 0.0);
            return;
        }

        Coordinate next = routeCoordinates.get(nextIndex);
        bearing = calculateBearing(current.latitude(), current.longitude(), next.latitude(), next.longitude());
        currentPointIndex = nextIndex;
        int stopIndex = nextStopIndex();
        if (stopIndex >= 0 && stopCoordinateIndices.get(stopIndex) == currentPointIndex) {
            dwellTicks = 3;
            emit(next, 0.0);
        } else {
            emit(next, calculateSpeed());
        }
    }

    private void refreshRouteIfChanged() {
        List<RouteStop> currentStops = routeStopRepository.findByRouteIdOrderBySequenceOrder("R01");
        String signature = signature(currentStops);
        if (!signature.equals(routeSignature)) {
            try {
                refreshRoute();
            } catch (Exception exception) {
                log.warn("Unable to refresh B01 route geometry", exception);
            }
        }
    }

    private void refreshRoute() {
        List<RouteStop> currentStops = routeStopRepository.findByRouteIdOrderBySequenceOrder("R01");
        if (currentStops.size() < 2) {
            log.warn("Cannot initialize B01: R01 has fewer than two active stops");
            return;
        }

        JsonNode geometry = routeGeometryService.getGeometry("R01");
        if (!"LineString".equals(geometry.path("type").asText()) || !geometry.path("coordinates").isArray()) {
            throw new IllegalStateException("OSRM returned invalid R01 geometry");
        }

        routeStops.clear();
        routeStops.addAll(currentStops);
        routeCoordinates.clear();
        for (JsonNode point : geometry.path("coordinates")) {
            routeCoordinates.add(new Coordinate(point.get(0).asDouble(), point.get(1).asDouble()));
        }

        stopCoordinateIndices.clear();
        for (RouteStop stop : routeStops) {
            int closest = 0;
            double closestDistance = Double.MAX_VALUE;
            for (int index = 0; index < routeCoordinates.size(); index++) {
                Coordinate point = routeCoordinates.get(index);
                double distance = Math.hypot(point.longitude() - stop.getStop().getLongitude(),
                        point.latitude() - stop.getStop().getLatitude());
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closest = index;
                }
            }
            stopCoordinateIndices.add(closest);
        }

        routeSignature = signature(currentStops);
        currentPointIndex = Math.min(currentPointIndex, routeCoordinates.size() - 1);
        log.info("B01 simulation loaded {} active R01 stops and {} OSRM coordinates",
                routeStops.size(), routeCoordinates.size());
    }

    private void emit(Coordinate coordinate, double speed) {
        int nextIndex = nextStopIndex();
        String nextStopId = routeStops.get(nextIndex).getStopId();
        BusLocationEventRequest event = new BusLocationEventRequest(
                "B01", "R01", outbound ? "T01_OUT" : "T01_IN", Instant.now().toString(),
                coordinate.latitude(), coordinate.longitude(), bearing,
                Math.round(speed * 10.0) / 10.0, 5.0, "IN_SERVICE", nextStopId);
        try {
            busEventService.ingestEvent(event);
        } catch (Exception exception) {
            log.error("Failed to ingest simulated B01 event", exception);
        }
    }

    private int nextStopIndex() {
        if (outbound) {
            for (int index = 0; index < stopCoordinateIndices.size(); index++) {
                if (stopCoordinateIndices.get(index) >= currentPointIndex) return index;
            }
            return routeStops.size() - 1;
        }
        for (int index = stopCoordinateIndices.size() - 1; index >= 0; index--) {
            if (stopCoordinateIndices.get(index) <= currentPointIndex) return index;
        }
        return 0;
    }

    private double calculateSpeed() {
        return Math.max(8.0, Math.min(35.0, 24.0 + (ThreadLocalRandom.current().nextDouble() - 0.5) * 6.0));
    }

    private String signature(List<RouteStop> stops) {
        return stops.stream()
                .map(stop -> stop.getStopId() + ":" + stop.getSequenceOrder())
                .reduce((left, right) -> left + "|" + right)
                .orElse("");
    }

    private double calculateBearing(double lat1, double lon1, double lat2, double lon2) {
        double dLon = Math.toRadians(lon2 - lon1);
        lat1 = Math.toRadians(lat1);
        lat2 = Math.toRadians(lat2);
        double y = Math.sin(dLon) * Math.cos(lat2);
        double x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
        return (Math.toDegrees(Math.atan2(y, x)) + 360.0) % 360.0;
    }
}
