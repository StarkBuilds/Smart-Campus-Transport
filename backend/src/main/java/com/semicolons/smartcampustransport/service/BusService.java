package com.semicolons.smartcampustransport.service;

import com.semicolons.smartcampustransport.dto.BusResponse;
import com.semicolons.smartcampustransport.dto.StopInfo;
import com.semicolons.smartcampustransport.entity.Bus;
import com.semicolons.smartcampustransport.entity.RouteStop;
import com.semicolons.smartcampustransport.entity.Stop;
import com.semicolons.smartcampustransport.repository.BusRepository;
import com.semicolons.smartcampustransport.repository.RouteStopRepository;
import com.semicolons.smartcampustransport.repository.StopRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * Service for bus-related queries.
 * Provides efficient access to bus state and location.
 */
@Service
@RequiredArgsConstructor
public class BusService {

    private final BusRepository busRepository;
    private final StopRepository stopRepository;
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
            .latestLatitude(bus.getLatestLatitude())
            .latestLongitude(bus.getLatestLongitude())
            .latestTimestamp(bus.getLatestTimestamp())
            .latestSpeedKmh(bus.getLatestSpeedKmh())
            .bearing(bus.getBearing());

        // Resolve next stop ID to full stop info
        if (bus.getNextStopId() != null && !bus.getNextStopId().isBlank()) {
            stopRepository.findById(bus.getNextStopId())
                .ifPresent(stop -> {
                    builder.nextStop(new StopInfo(
                        stop.getStopId(),
                        stop.getName(),
                        stop.getLatitude(),
                        stop.getLongitude()
                    ));

                    // Also include scheduled arrival time if available
                    if (bus.getRouteId() != null) {
                        routeStopRepository.findByRouteIdAndStopId(bus.getRouteId(), stop.getStopId())
                            .map(RouteStop::getScheduledArrivalTime)
                            .ifPresent(builder::scheduledArrivalTime);
                    }
                });
        }

        return builder.build();
    }
}
