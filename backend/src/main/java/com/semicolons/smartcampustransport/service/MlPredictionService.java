package com.semicolons.smartcampustransport.service;

import com.semicolons.smartcampustransport.client.MlPredictionClient;
import com.semicolons.smartcampustransport.dto.PredictionRequest;
import com.semicolons.smartcampustransport.dto.PredictionResponse;
import com.semicolons.smartcampustransport.entity.Bus;
import com.semicolons.smartcampustransport.entity.BusLocationEvent;
import com.semicolons.smartcampustransport.entity.Schedule;
import com.semicolons.smartcampustransport.entity.Trip;
import com.semicolons.smartcampustransport.repository.BusLocationEventRepository;
import com.semicolons.smartcampustransport.repository.BusRepository;
import com.semicolons.smartcampustransport.repository.ScheduleRepository;
import com.semicolons.smartcampustransport.repository.TripRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

/**
 * Orchestrates delay prediction for buses by querying current state, active trips,
 * and historical telemetry, then invoking the ML inference client.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MlPredictionService {

    private final BusRepository busRepository;
    private final BusLocationEventRepository busLocationEventRepository;
    private final TripRepository tripRepository;
    private final ScheduleRepository scheduleRepository;
    private final MlPredictionClient mlPredictionClient;

    /**
     * Get delay prediction for a specific bus.
     *
     * @param busId the ID of the bus
     * @return Optional containing PredictionResponse, or Optional.empty() if bus does not exist
     */
    @Transactional(readOnly = true)
    public Optional<PredictionResponse> getPredictionForBus(String busId) {
        Optional<Bus> busOpt = busRepository.findByBusId(busId);
        if (busOpt.isEmpty()) {
            log.warn("Prediction requested for non-existent bus: {}", busId);
            return Optional.empty();
        }

        Bus bus = busOpt.get();
        Optional<BusLocationEvent> latestEventOpt = busLocationEventRepository.findFirstByBusIdOrderByTimestampDesc(busId);

        String routeId = bus.getRouteId();
        Optional<Trip> activeTripOpt = tripRepository.findByBusIdAndStatus(busId, Trip.TripStatus.IN_PROGRESS);
        if (activeTripOpt.isPresent() && activeTripOpt.get().getRouteId() != null) {
            routeId = activeTripOpt.get().getRouteId();
        }

        if (latestEventOpt.isEmpty()) {
            log.info("No location telemetry available for bus {}", busId);
            return Optional.of(PredictionResponse.unavailable(
                    busId,
                    routeId != null ? routeId : "UNKNOWN",
                    "No telemetry available for bus " + busId
            ));
        }

        BusLocationEvent latestEvent = latestEventOpt.get();
        if (routeId == null) {
            routeId = latestEvent.getRouteId();
        }
        if (routeId == null) {
            routeId = "UNKNOWN";
        }

        // Fetch recent telemetry history (up to 30 min window before current ping)
        Instant currentTimestamp = latestEvent.getTimestamp();
        Instant windowStart = currentTimestamp.minus(Duration.ofMinutes(30));
        List<BusLocationEvent> recentEvents = busLocationEventRepository
                .findByBusIdAndTimestampAfterOrderByTimestampDesc(busId, windowStart);

        // Filter out current or future timestamps to strictly satisfy chronological constraint
        List<PredictionRequest.Telemetry> recentTelemetry = recentEvents.stream()
                .filter(e -> e.getTimestamp().isBefore(currentTimestamp))
                .limit(10)
                .sorted(Comparator.comparing(BusLocationEvent::getTimestamp))
                .map(this::mapEventToTelemetry)
                .toList();

        PredictionRequest.Telemetry currentTelemetry = mapEventToTelemetry(latestEvent);

        // Legitimate derivation of scheduled trip start if active trip with schedule is present
        String scheduledTripStart = null;
        if (activeTripOpt.isPresent()) {
            Trip activeTrip = activeTripOpt.get();
            Schedule schedule = activeTrip.getSchedule();
            if (schedule == null && activeTrip.getScheduleId() != null) {
                schedule = scheduleRepository.findByScheduleId(activeTrip.getScheduleId()).orElse(null);
            }
            if (schedule != null && schedule.getDepartureTime() != null && activeTrip.getTripDate() != null) {
                LocalDateTime ldt = LocalDateTime.of(activeTrip.getTripDate(), schedule.getDepartureTime());
                scheduledTripStart = ldt.atZone(ZoneOffset.UTC).toInstant().toString();
            }
        }

        // Never fabricate route length, road distance to next stop, or ETA inputs!
        PredictionRequest request = new PredictionRequest(
                currentTelemetry,
                recentTelemetry.isEmpty() ? null : recentTelemetry,
                null, // routeLengthKm: not legitimately derived from schema, left null
                null, // roadDistanceToNextStopKm: not legitimately derived from schema, left null
                scheduledTripStart
        );

        return Optional.of(mlPredictionClient.predict(request));
    }

    private PredictionRequest.Telemetry mapEventToTelemetry(BusLocationEvent event) {
        Double bearing = event.getBearing();
        if (bearing != null) {
            // Clamping: Spring accepts <= 360.0, ML requires [0.0, 360.0)
            if (bearing >= 360.0 || bearing < 0.0) {
                bearing = 0.0;
            }
        }

        Double speed = event.getSpeedKmh();
        if (speed != null && speed < 0.0) {
            speed = 0.0;
        }

        String statusStr = mapStatus(event.getStatus());

        return new PredictionRequest.Telemetry(
                event.getBusId(),
                event.getRouteId(),
                event.getTripId() != null ? event.getTripId() : "UNKNOWN",
                event.getTimestamp().toString(),
                event.getLatitude(),
                event.getLongitude(),
                bearing,
                speed,
                event.getAccuracyM(),
                statusStr,
                event.getNextStopId()
        );
    }

    private String mapStatus(Bus.BusStatus status) {
        if (status == null) {
            return "IN_SERVICE";
        }
        return switch (status) {
            case IN_SERVICE -> "IN_SERVICE";
            case OUT_OF_SERVICE -> "OUT_OF_SERVICE";
            case MAINTENANCE -> "OUT_OF_SERVICE"; // Explicit mapping per established architecture
        };
    }
}
