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

        int journeyDelayMinutes = 0;
        int nextStopDelayMinutes = 0;

        if (nextIndex >= 0 && bus.getLatestLatitude() != null && bus.getLatestLongitude() != null) {
            RouteStop nextRouteStop = routeStops.get(nextIndex);
            builder.nextStop(toStopInfo(nextRouteStop, null));

            RouteStop currentRouteStop;
            if (nextIndex > 0) {
                currentRouteStop = routeStops.get(nextIndex - 1);
                builder.currentStop(toStopInfo(currentRouteStop, null));
            } else {
                currentRouteStop = nextRouteStop;
            }

            // Use actual simulation speed; floor only when essentially stopped to avoid ∞ ETA.
            double reportedSpeed = bus.getLatestSpeedKmh() != null ? bus.getLatestSpeedKmh() : BusSimulationService.NOMINAL_SPEED_KMH;
            double etaSpeed = reportedSpeed < 3.0
                    ? Math.max(BusSimulationService.NOMINAL_SPEED_KMH * 0.6, 12.0)
                    : reportedSpeed;

            List<StopInfo> upcoming = new ArrayList<>();
            int from = Math.max(0, nextIndex);
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
                int stopBaseEta = (int) Math.max(1, Math.ceil(distKm / etaSpeed * 60.0));
                upcomingBases.add(new int[]{i, stopBaseEta});
            }

            // Next-stop base ETA from remaining OSRM road distance.
            double nextDistKm = routeDistanceService.getRoadDistanceKm(
                    bus.getRouteId(),
                    bus.getLatestLatitude(),
                    bus.getLatestLongitude(),
                    nextRouteStop.getStop().getLatitude(),
                    nextRouteStop.getStop().getLongitude()
            );
            int nextBaseEta = (int) Math.max(1, Math.ceil(nextDistKm / etaSpeed * 60.0));

            RouteStop etaTarget = routeStops.get(Math.max(0, etaTargetIndex >= 0 ? etaTargetIndex : nextIndex));
            double distanceKm = routeDistanceService.getRoadDistanceKm(
                    bus.getRouteId(),
                    bus.getLatestLatitude(),
                    bus.getLatestLongitude(),
                    etaTarget.getStop().getLatitude(),
                    etaTarget.getStop().getLongitude()
            );
            double baseEtaMinutes = distanceKm / etaSpeed * 60.0;

            // Movement timing deviation vs nominal cruise (demo slowdown shows up here dynamically).
            double nominalEta = distanceKm / BusSimulationService.NOMINAL_SPEED_KMH * 60.0;
            int movementDelay = (int) Math.round(baseEtaMinutes - nominalEta);

            // Next-stop delay: schedule at next stop vs predicted arrival, plus local movement share.
            nextStopDelayMinutes = delayCalculator.calculateArrivalDelayMinutes(
                    bus.getRouteId(), nextRouteStop, nextBaseEta);
            double nextNominal = nextDistKm / BusSimulationService.NOMINAL_SPEED_KMH * 60.0;
            int nextMovementDelay = (int) Math.round(nextBaseEta - nextNominal);
            if (Math.abs(nextStopDelayMinutes) < 1 && nextMovementDelay != 0) {
                nextStopDelayMinutes = nextMovementDelay;
            } else if (nextMovementDelay > 0) {
                nextStopDelayMinutes = Math.max(nextStopDelayMinutes, nextMovementDelay);
            }

            // Journey delay: schedule at target + ML predicted delay (once) + movement deviation.
            journeyDelayMinutes = delayCalculator.calculateArrivalDelayMinutes(
                    bus.getRouteId(), etaTarget, (int) Math.ceil(baseEtaMinutes));
            if (Math.abs(journeyDelayMinutes) < 1 && movementDelay != 0) {
                journeyDelayMinutes = movementDelay;
            } else if (movementDelay > 0) {
                journeyDelayMinutes = Math.max(journeyDelayMinutes, movementDelay);
            }

            Integer mlDelay = null;
            try {
                var prediction = mlPredictionService.getPredictionForBus(bus.getBusId());
                if (prediction.isPresent() && prediction.get().predictedDelayMinutes() != null) {
                    mlDelay = prediction.get().predictedDelayMinutes();
                    journeyDelayMinutes = Math.max(journeyDelayMinutes, mlDelay);
                }
            } catch (Exception ignored) {
                // ML optional
            }

            // Demo intended delay is a ceiling while active, but ETA still comes from slowed speed + this once.
            if (BusSimulationService.DEMO_DELAY_ACTIVE && BusSimulationService.demoDelayMinutes > 0) {
                journeyDelayMinutes = Math.max(journeyDelayMinutes, BusSimulationService.demoDelayMinutes);
                // Next-stop gets a proportional share of journey delay (not the full journey stamp).
                double share = distanceKm > 1e-6 ? Math.min(1.0, nextDistKm / distanceKm) : 1.0;
                int nextShare = (int) Math.max(0, Math.round(BusSimulationService.demoDelayMinutes * share));
                nextStopDelayMinutes = Math.max(nextStopDelayMinutes, nextShare);
            }

            int delayOnce = Math.max(0, journeyDelayMinutes);
            for (int[] pair : upcomingBases) {
                RouteStop rs = routeStops.get(pair[0]);
                // Upcoming stop ETAs: road-distance base + journey delay applied once (not synthetic +3/+6/+9).
                upcoming.add(toStopInfo(rs, pair[1] + delayOnce));
            }
            builder.upcomingStops(upcoming);

            // Final ETA = remaining road time at CURRENT speed + ML predicted delay ONCE.
            // Demo slowdown already inflates baseEtaMinutes — do not add demoDelay again.
            int mlOnce = Math.max(0, mlDelay != null ? mlDelay : 0);
            int finalEta;
            if (BusSimulationService.DEMO_DELAY_ACTIVE) {
                int beyondMovement = Math.max(0, mlOnce - Math.max(0, movementDelay));
                finalEta = (int) Math.max(1, Math.round(baseEtaMinutes + beyondMovement));
            } else if (delayOnce > 0 && delayOnce > mlOnce) {
                finalEta = (int) Math.max(1, Math.round(baseEtaMinutes + delayOnce));
            } else {
                finalEta = (int) Math.max(1, Math.round(baseEtaMinutes + mlOnce));
            }
            builder.etaMinutes(finalEta);
            builder.nextStop(toStopInfo(nextRouteStop, nextBaseEta + Math.max(0, nextStopDelayMinutes)));
        } else {
            builder.upcomingStops(List.of());
            builder.etaMinutes(null);
        }

        builder.delayMinutes(journeyDelayMinutes);
        builder.nextStopDelayMinutes(nextStopDelayMinutes);
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
