package com.semicolons.smartcampustransport.service;

import com.semicolons.smartcampustransport.dto.BusResponse;
import com.semicolons.smartcampustransport.dto.StopInfo;
import com.semicolons.smartcampustransport.entity.Bus;
import com.semicolons.smartcampustransport.entity.RouteStop;
import com.semicolons.smartcampustransport.entity.Stop;
import com.semicolons.smartcampustransport.repository.BusRepository;
import com.semicolons.smartcampustransport.repository.RouteStopRepository;
import com.semicolons.smartcampustransport.util.DelayCalculator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Live bus projection:
 * CURRENT POSITION → remaining OSRM road distance → speed → base ETA
 * → genuine predicted delay ONCE → final ETA / EARLY|ON TIME|DELAYED.
 */
@Service
@RequiredArgsConstructor
public class BusService {

    private final BusRepository busRepository;
    private final RouteStopRepository routeStopRepository;
    private final DelayCalculator delayCalculator;
    private final RouteDistanceService routeDistanceService;
    private final MlPredictionService mlPredictionService;

    @Transactional(readOnly = true)
    public List<BusResponse> getAllBuses() {
        return busRepository.findAll().stream()
            .map(bus -> toBusResponse(bus, null))
            .toList();
    }

    @Transactional(readOnly = true)
    public Optional<BusResponse> getBusById(String busId) {
        return getBusById(busId, null);
    }

    @Transactional(readOnly = true)
    public Optional<BusResponse> getBusById(String busId, String targetStopId) {
        return busRepository.findById(busId)
            .map(bus -> toBusResponse(bus, targetStopId));
    }

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

    private BusResponse toBusResponse(Bus bus, String targetStopId) {
        BusResponse.BusResponseBuilder builder = BusResponse.builder()
            .busId(bus.getBusId())
            .status(bus.getStatus().name())
            .routeId(bus.getRouteId())
            .currentTripId(bus.getCurrentTripId())
            .latestLatitude(bus.getLatestLatitude())
            .latestLongitude(bus.getLatestLongitude())
            .latestTimestamp(bus.getLatestTimestamp())
            .latestSpeedKmh(bus.getLatestSpeedKmh())
            .bearing(bus.getBearing());

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

        // Student assigned stop takes priority for ETA target when still ahead of the bus.
        int etaTargetIndex = nextIndex;
        if (targetStopId != null && !targetStopId.isBlank()) {
            for (int i = 0; i < routeStops.size(); i++) {
                if (routeStops.get(i).getStopId().equals(targetStopId)) {
                    if (nextIndex < 0 || i >= nextIndex) {
                        etaTargetIndex = i;
                    }
                    break;
                }
            }
        }

        int delayMinutes = 0;
        RouteStop currentRouteStop = null;

        if (nextIndex >= 0) {
            RouteStop nextRouteStop = routeStops.get(nextIndex);
            builder.nextStop(toStopInfo(nextRouteStop, null));

            if (nextIndex > 0) {
                currentRouteStop = routeStops.get(nextIndex - 1);
                builder.currentStop(toStopInfo(currentRouteStop, null));
            } else {
                currentRouteStop = nextRouteStop;
            }

            double speed = bus.getLatestSpeedKmh() != null ? bus.getLatestSpeedKmh() : 12.0;
            double safeSpeed = Math.max(speed, 12.0);

            List<StopInfo> upcoming = new ArrayList<>();
            int from = Math.max(0, nextIndex);
            // Delay applied once below after ML/demo merge — preview bases first, then re-map.
            List<int[]> upcomingBases = new ArrayList<>();
            for (int i = from; i < routeStops.size() && upcomingBases.size() < 8; i++) {
                RouteStop rs = routeStops.get(i);
                double distKm = routeDistanceService.getRoadDistanceKm(
                        bus.getRouteId(),
                        bus.getLatestLatitude(),
                        bus.getLatestLongitude(),
                        rs.getStop().getLatitude(),
                        rs.getStop().getLongitude()
                );
                int stopBaseEta = (int) Math.max(1, Math.ceil(distKm / safeSpeed * 60.0));
                upcomingBases.add(new int[]{i, stopBaseEta});
            }

            RouteStop etaTarget = routeStops.get(Math.max(0, etaTargetIndex >= 0 ? etaTargetIndex : nextIndex));
            double distanceKm = routeDistanceService.getRoadDistanceKm(
                    bus.getRouteId(),
                    bus.getLatestLatitude(),
                    bus.getLatestLongitude(),
                    etaTarget.getStop().getLatitude(),
                    etaTarget.getStop().getLongitude()
            );
            double baseEtaMinutes = distanceKm / safeSpeed * 60.0;

            // Schedule delay + ML predicted delay — applied ONCE to final ETA.
            delayMinutes = delayCalculator.calculateDelayMinutes(bus.getRouteId(), currentRouteStop);
            try {
                var prediction = mlPredictionService.getPredictionForBus(bus.getBusId());
                if (prediction.isPresent() && prediction.get().predictedDelayMinutes() != null) {
                    delayMinutes = Math.max(delayMinutes, prediction.get().predictedDelayMinutes());
                }
            } catch (Exception ignored) {
                // ML optional
            }

            if (BusSimulationService.DEMO_DELAY_ACTIVE) {
                delayMinutes = Math.max(delayMinutes, BusSimulationService.demoDelayMinutes);
            }

            int delayOnce = Math.max(0, delayMinutes);
            for (int[] pair : upcomingBases) {
                RouteStop rs = routeStops.get(pair[0]);
                upcoming.add(toStopInfo(rs, pair[1] + delayOnce));
            }
            builder.upcomingStops(upcoming);

            int finalEta = (int) Math.max(1, Math.ceil(baseEtaMinutes + delayOnce));
            builder.etaMinutes(finalEta);
        } else {
            builder.upcomingStops(List.of());
            builder.etaMinutes(null);
        }

        if (BusSimulationService.DEMO_DELAY_ACTIVE) {
            delayMinutes = Math.max(delayMinutes, BusSimulationService.demoDelayMinutes);
        }

        builder.delayMinutes(delayMinutes);
        return builder.build();
    }

    private StopInfo toStopInfo(RouteStop routeStop, Integer liveEtaMinutes) {
        Stop stop = routeStop.getStop();
        return new StopInfo(
                stop.getStopId(),
                stop.getName(),
                stop.getLatitude(),
                stop.getLongitude(),
                routeStop.getSequenceOrder(),
                routeStop.getArrivalOffsetMinutes(),
                liveEtaMinutes
        );
    }
}
