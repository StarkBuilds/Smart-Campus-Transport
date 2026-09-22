package com.semicolons.smartcampustransport.service;

import com.semicolons.smartcampustransport.dto.BusLocationEventRequest;
import com.semicolons.smartcampustransport.entity.Alert;
import com.semicolons.smartcampustransport.entity.Bus;
import com.semicolons.smartcampustransport.entity.RouteStop;
import com.semicolons.smartcampustransport.entity.Schedule;
import com.semicolons.smartcampustransport.entity.Trip;
import com.semicolons.smartcampustransport.repository.AlertRepository;
import com.semicolons.smartcampustransport.repository.BusLocationEventRepository;
import com.semicolons.smartcampustransport.repository.BusRepository;
import com.semicolons.smartcampustransport.repository.RouteStopRepository;
import com.semicolons.smartcampustransport.repository.ScheduleRepository;
import com.semicolons.smartcampustransport.repository.TripRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

/**
 * Service for generating and managing alerts.
 *
 * Alert types:
 * - LATE_BUS: Bus is significantly behind schedule (trip-aware)
 * - STALE_GPS: No GPS events received for >5 minutes
 * - DATA_QUALITY: GPS data quality issues detected
 *
 * Design principle: Only one active alert per bus per type.
 * If the same issue persists, update the existing alert rather than create duplicates.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AlertService {

    private final AlertRepository alertRepository;
    private final BusRepository busRepository;
    private final RouteStopRepository routeStopRepository;
    private final TripRepository tripRepository;
    private final ScheduleRepository scheduleRepository;

    /** How long without GPS events before stale alert */
    private static final Duration STALE_THRESHOLD = Duration.ofMinutes(5);

    /** How many minutes behind schedule to trigger late alert */
    private static final int LATE_THRESHOLD_MINUTES = 5;

    /**
     * Generate a DATA_QUALITY alert for suspicious GPS data.
     *
     * @param request the GPS event
     * @param warnings list of validation warnings
     */
    @Transactional
    public void generateDataQualityAlert(BusLocationEventRequest request, List<String> warnings) {
        // Check if alert already exists
        alertRepository.findByBusIdAndTypeAndStatus(
            request.busId(),
            Alert.AlertType.DATA_QUALITY,
            Alert.AlertStatus.ACTIVE
        ).ifPresentOrElse(
            existing -> {
                // Update existing alert
                existing.setMessage(String.join("; ", warnings));
                existing.setTripId(request.tripId());
                existing.setTimestamp(Instant.now());
                alertRepository.save(existing);
                log.debug("Updated DATA_QUALITY alert for bus {}", request.busId());
            },
            () -> {
                // Create new alert
                Alert alert = Alert.builder()
                    .busId(request.busId())
                    .routeId(request.routeId())
                    .tripId(request.tripId())
                    .type(Alert.AlertType.DATA_QUALITY)
                    .status(Alert.AlertStatus.ACTIVE)
                    .message(String.join("; ", warnings))
                    .timestamp(Instant.now())
                    .build();
                alertRepository.save(alert);
                log.info("Created DATA_QUALITY alert for bus {}", request.busId());
            }
        );
    }

    /**
     * Check if bus has stale GPS (no events for >5 minutes).
     * Called after each event ingestion.
     *
     * @param busId the bus to check
     */
    @Transactional
    public void checkStaleGps(String busId) {
        busRepository.findById(busId).ifPresent(bus -> {
            Instant latestTimestamp = bus.getLatestTimestamp();

            if (latestTimestamp == null) {
                // No events ever received
                createStaleGpsAlert(busId, "No GPS events received yet", bus.getCurrentTripId());
                return;
            }

            Duration timeSinceLastEvent = Duration.between(latestTimestamp, Instant.now());

            if (timeSinceLastEvent.compareTo(STALE_THRESHOLD) > 0) {
                // Stale - create or update alert
                createStaleGpsAlert(busId,
                    String.format("No GPS events for %d minutes", timeSinceLastEvent.toMinutes()),
                    bus.getCurrentTripId());
            } else {
                // Not stale - resolve any existing stale alert
                resolveStaleGpsAlert(busId);
            }
        });
    }

    private void createStaleGpsAlert(String busId, String message, String tripId) {
        alertRepository.findByBusIdAndTypeAndStatus(
            busId,
            Alert.AlertType.STALE_GPS,
            Alert.AlertStatus.ACTIVE
        ).ifPresentOrElse(
            existing -> {
                existing.setMessage(message);
                existing.setTripId(tripId);
                existing.setTimestamp(Instant.now());
                alertRepository.save(existing);
            },
            () -> {
                Alert alert = Alert.builder()
                    .busId(busId)
                    .tripId(tripId)
                    .type(Alert.AlertType.STALE_GPS)
                    .status(Alert.AlertStatus.ACTIVE)
                    .message(message)
                    .timestamp(Instant.now())
                    .build();
                alertRepository.save(alert);
                log.warn("Created STALE_GPS alert for bus {}", busId);
            }
        );
    }

    private void resolveStaleGpsAlert(String busId) {
        alertRepository.findByBusIdAndTypeAndStatus(
            busId,
            Alert.AlertType.STALE_GPS,
            Alert.AlertStatus.ACTIVE
        ).ifPresent(alert -> {
            alert.setStatus(Alert.AlertStatus.RESOLVED);
            alert.setResolvedAt(Instant.now());
            alertRepository.save(alert);
            log.info("Resolved STALE_GPS alert for bus {}", busId);
        });
    }

    /**
     * Check if bus is running late compared to schedule.
     *
     * Implementation using Trip + Schedule context:
     * 1. If tripId is provided, look up the Trip and its Schedule
     * 2. Calculate expected arrival time = Schedule.departureTime + RouteStop.arrivalOffsetMinutes
     * 3. Compare with current time
     * 4. If >5 minutes behind, create LATE_BUS alert
     *
     * @param request the GPS event
     */
    @Transactional
    public void checkLateBus(BusLocationEventRequest request) {
        if (request.nextStopId() == null || request.nextStopId().isBlank()) {
            return; // Can't check lateness without knowing next stop
        }

        // Try trip-based late detection first
        if (request.tripId() != null && !request.tripId().isBlank()) {
            Optional<Trip> tripOpt = tripRepository.findByTripId(request.tripId());
            if (tripOpt.isPresent()) {
                Trip trip = tripOpt.get();
                Optional<Schedule> schedOpt = scheduleRepository.findByScheduleId(trip.getScheduleId());
                if (schedOpt.isPresent()) {
                    Schedule schedule = schedOpt.get();
                    checkLateBusWithSchedule(request, schedule);
                    return;
                }
            }
        }

        // Fallback: check if bus has an active trip
        Optional<Trip> activeTrip = tripRepository.findByBusIdAndStatus(
            request.busId(), Trip.TripStatus.IN_PROGRESS);
        if (activeTrip.isPresent()) {
            Optional<Schedule> schedOpt = scheduleRepository.findByScheduleId(activeTrip.get().getScheduleId());
            if (schedOpt.isPresent()) {
                checkLateBusWithSchedule(request, schedOpt.get());
                return;
            }
        }
    }

    private void checkLateBusWithSchedule(BusLocationEventRequest request, Schedule schedule) {
        routeStopRepository.findByRouteIdAndStopId(request.routeId(), request.nextStopId())
            .ifPresent(routeStop -> {
                if (routeStop.getArrivalOffsetMinutes() == null) {
                    return;
                }

                // Expected arrival = departureTime + arrivalOffsetMinutes
                LocalTime scheduledArrival = schedule.getDepartureTime()
                    .plusMinutes(routeStop.getArrivalOffsetMinutes());

                LocalTime now = LocalTime.now();
                long delayMinutes = Duration.between(scheduledArrival, now).toMinutes();

                // Ignore stale timetable windows so overnight schedules cannot create +900 min alerts.
                if (Math.abs(delayMinutes) > 90) {
                    return;
                }

                if (delayMinutes > LATE_THRESHOLD_MINUTES) {
                    createLateBusAlert(request.busId(), request.routeId(),
                        request.tripId(), request.nextStopId(), delayMinutes);
                } else {
                    resolveLateBusAlert(request.busId());
                }
            });
    }

    /**
     * Publish a persistent LATE_BUS alert from a real calculated delay (demo or schedule).
     */
    @Transactional
    public void publishLateBusAlert(String busId, String routeId, String tripId, String stopId, long delayMinutes) {
        createLateBusAlert(busId, routeId, tripId, stopId, delayMinutes);
    }

    @Transactional
    public void resolveLateBusAlertPublic(String busId) {
        resolveLateBusAlert(busId);
    }

    private void createLateBusAlert(String busId, String routeId, String tripId, String stopId, long delayMinutes) {
        String message = String.format(
                "Bus %s is running %d minute%s late%s.",
                busId,
                delayMinutes,
                delayMinutes == 1 ? "" : "s",
                stopId != null && !stopId.isBlank() ? " approaching " + stopId : ""
        );
        alertRepository.findByBusIdAndTypeAndStatus(
            busId,
            Alert.AlertType.LATE_BUS,
            Alert.AlertStatus.ACTIVE
        ).ifPresentOrElse(
            existing -> {
                existing.setMessage(message);
                existing.setTripId(tripId);
                existing.setRouteId(routeId);
                existing.setTimestamp(Instant.now());
                alertRepository.save(existing);
            },
            () -> {
                Alert alert = Alert.builder()
                    .busId(busId)
                    .routeId(routeId)
                    .tripId(tripId)
                    .type(Alert.AlertType.LATE_BUS)
                    .status(Alert.AlertStatus.ACTIVE)
                    .message(message)
                    .timestamp(Instant.now())
                    .build();
                alertRepository.save(alert);
                log.warn("Created LATE_BUS alert for bus {} ({} min late)", busId, delayMinutes);
            }
        );
    }

    private void resolveLateBusAlert(String busId) {
        alertRepository.findByBusIdAndTypeAndStatus(
            busId,
            Alert.AlertType.LATE_BUS,
            Alert.AlertStatus.ACTIVE
        ).ifPresent(alert -> {
            alert.setStatus(Alert.AlertStatus.RESOLVED);
            alert.setResolvedAt(Instant.now());
            alertRepository.save(alert);
            log.info("Resolved LATE_BUS alert for bus {}", busId);
        });
    }

    /**
     * Get all active alerts.
     */
    public List<Alert> getActiveAlerts() {
        return alertRepository.findByStatus(Alert.AlertStatus.ACTIVE);
    }

    /**
     * Get alerts by type (for filtering).
     */
    public List<Alert> getAlertsByType(Alert.AlertType type) {
        return alertRepository.findByType(type);
    }

    /**
     * Get alerts visible to students (excludes DATA_QUALITY).
     */
    public List<Alert> getStudentVisibleAlerts() {
        return alertRepository.findByStatusAndTypeNot(
            Alert.AlertStatus.ACTIVE,
            Alert.AlertType.DATA_QUALITY
        );
    }
}
