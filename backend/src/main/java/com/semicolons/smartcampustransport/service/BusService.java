package com.semicolons.smartcampustransport.service;

import com.semicolons.smartcampustransport.dto.BusResponse;
import com.semicolons.smartcampustransport.dto.StopInfo;
import com.semicolons.smartcampustransport.entity.Bus;
import com.semicolons.smartcampustransport.entity.RouteStop;
import com.semicolons.smartcampustransport.entity.Stop;
import com.semicolons.smartcampustransport.repository.BusRepository;
import com.semicolons.smartcampustransport.repository.RouteStopRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.lang.Math;

/**
 * Service for bus-related queries.
 * Provides efficient access to bus state and location.
 */
@Service
@RequiredArgsConstructor
public class BusService {

    private final BusRepository busRepository;
    private final RouteStopRepository routeStopRepository;

    /**
     * Get all buses with their latest state.
     * Frontend calls this every 10-15 seconds for live tracking.
     */
    @Transactional(readOnly = true)
    public List<BusResponse> getAllBuses() {
        return busRepository.findAll().stream()
            .map(this::toBusResponse)
            .toList();
    }

    /**
     * Get a single bus by ID.
     */
    @Transactional(readOnly = true)
    public Optional<BusResponse> getBusById(String busId) {
        return busRepository.findById(busId)
            .map(this::toBusResponse);
    }

    /**
     * Get just the latest location for a bus.
     * Lighter-weight than full bus response for frequent polling.
     */
    @Transactional(readOnly = true)
    public Optional<BusResponse.BusLocation> getBusLocation(String busId) {
        return busRepository.findById(busId)
            .map(bus -> new BusResponse.BusLocation(
                bus.getBusId(),
                bus.getLatestLatitude(),
                bus.getLatestLongitude(),
                bus.getLatestTimestamp(),
                bus.getLatestSpeedKmh(),
                bus.getBearing()
            ));
    }

    /**
     * Convert Bus entity to BusResponse DTO.
     * Resolves next_stop_id to full stop information.
     */
    private BusResponse toBusResponse(Bus bus) {
        BusResponse.BusResponseBuilder builder = BusResponse.builder()
            .busId(bus.getBusId())
            .status(bus.getStatus().name())
            .routeId(bus.getRouteId())
            .currentTripId(bus.getCurrentTripId())
            .latestLatitude(bus.getLatestLatitude())
            .latestLongitude(bus.getLatestLongitude())
            .latestTimestamp(bus.getLatestTimestamp())
            .latestSpeedKmh(bus.getLatestSpeedKmh())
            .bearing(bus.getBearing())
            .delayMinutes(0);

        List<RouteStop> routeStops = bus.getRouteId() == null
                ? List.of()
                : routeStopRepository.findByRouteIdOrderBySequenceOrder(bus.getRouteId());
        int nextIndex = -1;
        for (int index = 0; index < routeStops.size(); index++) {
            if (routeStops.get(index).getStopId().equals(bus.getNextStopId())) {
                nextIndex = index;
                break;
            }
        }

        if (nextIndex >= 0) {
            RouteStop nextRouteStop = routeStops.get(nextIndex);
            builder.nextStop(toStopInfo(nextRouteStop));
            if (nextIndex > 0) builder.currentStop(toStopInfo(routeStops.get(nextIndex - 1)));
            builder.upcomingStops(routeStops.subList(nextIndex, routeStops.size()).stream()
                    .map(this::toStopInfo)
                    .limit(5)
                    .toList());

            double distanceKm = distanceKm(bus.getLatestLatitude(), bus.getLatestLongitude(),
                    nextRouteStop.getStop().getLatitude(), nextRouteStop.getStop().getLongitude());
            double speed = bus.getLatestSpeedKmh() == null ? 0.0 : bus.getLatestSpeedKmh();
            builder.etaMinutes((int) Math.max(1, Math.ceil(distanceKm / Math.max(speed, 12.0) * 60.0)));
        } else {
            builder.upcomingStops(List.of());
        }

        // Resolve next stop ID to full stop info
        return builder.build();
    }

    private StopInfo toStopInfo(RouteStop routeStop) {
        Stop stop = routeStop.getStop();
        return new StopInfo(stop.getStopId(), stop.getName(), stop.getLatitude(), stop.getLongitude(),
                routeStop.getSequenceOrder(), routeStop.getArrivalOffsetMinutes());
    }

    private double distanceKm(Double firstLatitude, Double firstLongitude, double secondLatitude, double secondLongitude) {
        if (firstLatitude == null || firstLongitude == null) return 0.0;
        double lat1 = Math.toRadians(firstLatitude);
        double lat2 = Math.toRadians(secondLatitude);
        double dLat = lat2 - lat1;
        double dLon = Math.toRadians(secondLongitude - firstLongitude);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return 6371.0 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
}
