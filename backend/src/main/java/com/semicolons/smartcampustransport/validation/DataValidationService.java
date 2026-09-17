package com.semicolons.smartcampustransport.validation;

import com.semicolons.smartcampustransport.dto.BusLocationEventRequest;
import com.semicolons.smartcampustransport.entity.Bus;
import com.semicolons.smartcampustransport.entity.BusLocationEvent;
import com.semicolons.smartcampustransport.repository.BusLocationEventRepository;
import com.semicolons.smartcampustransport.repository.BusRepository;
import com.semicolons.smartcampustransport.repository.RouteRepository;
import com.semicolons.smartcampustransport.repository.StopRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Business-level data quality validation for GPS events.
 *
 * HARD REJECT rules: Event is not stored, 400 response returned.
 * SOFT REJECT (warning) rules: Event stored with suspicious=true, warnings logged.
 *
 * Key principle: Only validated events proceed to ML inference.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DataValidationService {

    private final BusLocationEventRepository eventRepository;
    private final BusRepository busRepository;
    private final RouteRepository routeRepository;
    private final StopRepository stopRepository;

    // === THRESHOLDS (configurable via properties later if needed) ===

    /** Maximum acceptable GPS accuracy in meters. Above this = suspicious. */
    private static final double GPS_ACCURACY_WARNING_THRESHOLD_M = 20.0;

    /** GPS accuracy above this = hard reject. */
    private static final double GPS_ACCURACY_REJECT_THRESHOLD_M = 100.0;

    /** Maximum plausible speed for a campus bus (km/h). */
    private static final double MAX_PLAUSIBLE_SPEED_KMH = 80.0;

    /** Speed above this is suspicious but not rejected. */
    private static final double SUSPICIOUS_SPEED_KMH = 60.0;

    /** Maximum speed a bus can physically achieve (for jump detection). */
    private static final double MAX_PHYSICAL_SPEED_KMH = 120.0;

    /** How stale a timestamp can be before warning. */
    private static final Duration STALE_TIMESTAMP_WARNING = Duration.ofMinutes(5);

    /** How stale before hard reject. */
    private static final Duration STALE_TIMESTAMP_REJECT = Duration.ofMinutes(30);

    /** Maximum future timestamp tolerance (clock skew). */
    private static final Duration FUTURE_TOLERANCE = Duration.ofMinutes(1);

    /**
     * Validate a GPS event request.
     *
     * @param request the incoming event (already passed Bean Validation)
     * @return ValidationResult with status and any warnings/errors
     */
    public ValidationResult validate(BusLocationEventRequest request) {
        List<String> errors = new ArrayList<>();
        List<String> warnings = new ArrayList<>();

        // === HARD REJECT RULES ===

        validateStatusEnum(request, errors);
        validateKnownBus(request.busId(), errors);
        validateKnownRoute(request.routeId(), errors);
        validateTimestamp(request.timestamp(), errors);
        validateGpsAccuracyHard(request.accuracyM(), errors);

        // If hard errors exist, stop here
        if (!errors.isEmpty()) {
            return ValidationResult.rejected(errors);
        }

        // === SOFT REJECT (WARNING) RULES ===

        validateGpsAccuracyWarning(request.accuracyM(), warnings);
        validateSpeedPlausibility(request.speedKmh(), warnings);
        validateStaleTimestamp(request.timestamp(), warnings);
        validateKnownStop(request.nextStopId(), warnings);

        // GPS jump detection requires comparing to previous event
        validateGpsJump(request, warnings);

        // === RESULT ===

        if (warnings.isEmpty()) {
            return ValidationResult.accepted();
        } else {
            return ValidationResult.acceptedWithWarnings(warnings);
        }
    }

    // ========================================
    // HARD REJECT RULES
    // ========================================

    /**
     * RULE: status must be a valid enum value.
     * WHY: Invalid status breaks downstream processing and alerts.
     * REJECT: Yes - cannot process event with unknown status.
     */
    private void validateStatusEnum(BusLocationEventRequest request, List<String> errors) {
        if (request.toStatusEnum() == null) {
            errors.add("Invalid status: '" + request.status() +
                    "'. Must be one of: IN_SERVICE, OUT_OF_SERVICE, MAINTENANCE");
        }
    }

    /**
     * RULE: bus_id must reference an existing bus.
     * WHY: Prevents orphan events and ensures data integrity.
     * REJECT: Yes - cannot attribute event to unknown bus.
     */
    private void validateKnownBus(String busId, List<String> errors) {
        if (busId != null && !busRepository.existsById(busId)) {
            errors.add("Unknown bus_id: '" + busId + "'");
        }
    }

    /**
     * RULE: route_id must reference an existing route.
     * WHY: Ensures events can be correlated with route/stop data.
     * REJECT: Yes - cannot process event without route context.
     */
    private void validateKnownRoute(String routeId, List<String> errors) {
        if (routeId != null && !routeRepository.existsById(routeId)) {
            errors.add("Unknown route_id: '" + routeId + "'");
        }
    }

    /**
     * RULE: Timestamp must be valid ISO-8601, not in future, not too stale.
     * WHY: Future timestamps indicate clock issues. Very stale timestamps
     *      indicate the bus data feed is broken or severely delayed.
     * REJECT: Yes - if timestamp is in future or extremely stale (>30 min).
     */
    private void validateTimestamp(String timestampStr, List<String> errors) {
        try {
            Instant timestamp = Instant.parse(timestampStr);
            Instant now = Instant.now();

            // Check for future timestamp
            if (timestamp.isAfter(now.plus(FUTURE_TOLERANCE)) ) {
                errors.add("Timestamp is in the future: " + timestampStr);
            }

            // Check for extremely stale timestamp (hard reject)
            Duration age = Duration.between(timestamp, now);
            if (age.compareTo(STALE_TIMESTAMP_REJECT) > 0) {
                errors.add("Timestamp too stale: " + age.toMinutes() + " minutes old (max: " +
                        STALE_TIMESTAMP_REJECT.toMinutes() + " minutes)");
            }

        } catch (Exception e) {
            errors.add("Invalid timestamp format: '" + timestampStr + "'. Expected ISO-8601 format.");
        }
    }

    /**
     * RULE: GPS accuracy must not be extremely poor.
     * WHY: Very poor accuracy (>100m) means location is unreliable.
     * REJECT: Yes - if accuracy > 100m, location is essentially random.
     */
    private void validateGpsAccuracyHard(Double accuracyM, List<String> errors) {
        if (accuracyM != null && accuracyM > GPS_ACCURACY_REJECT_THRESHOLD_M) {
            errors.add("GPS accuracy too poor: " + accuracyM + "m (max: " +
                    GPS_ACCURACY_REJECT_THRESHOLD_M + "m)");
        }
    }

    // ========================================
    // SOFT REJECT (WARNING) RULES
    // ========================================

    /**
     * RULE: GPS accuracy above threshold triggers warning.
     * WHY: Accuracy >20m is usable but less reliable for precise ETA.
     *      ML may want to weight these events lower.
     * REJECT: No - warning only, event flagged as suspicious.
     */
    private void validateGpsAccuracyWarning(Double accuracyM, List<String> warnings) {
        if (accuracyM != null && accuracyM > GPS_ACCURACY_WARNING_THRESHOLD_M) {
            warnings.add("GPS accuracy above warning threshold: " + accuracyM + "m (threshold: " +
                    GPS_ACCURACY_WARNING_THRESHOLD_M + "m)");
        }
    }

    /**
     * RULE: Speed above threshold triggers warning.
     * WHY: Speeds >60 km/h on a campus are unusual and may indicate:
     *      - GPS noise/speed calculation error
     *      - Bus on non-campus road
     *      - Actual speeding (useful for admin review)
     * REJECT: No - warning only. Speeds >80 km/h would be caught by jump detection.
     */
    private void validateSpeedPlausibility(Double speedKmh, List<String> warnings) {
        if (speedKmh != null && speedKmh > SUSPICIOUS_SPEED_KMH) {
            warnings.add("Suspicious speed: " + speedKmh + " km/h (threshold: " +
                    SUSPICIOUS_SPEED_KMH + " km/h)");
        }
    }

    /**
     * RULE: Timestamp moderately stale triggers warning.
     * WHY: Data feed may be delayed. Event is still useful but should be flagged.
     * REJECT: No - warning only. Very stale events already rejected above.
     */
    private void validateStaleTimestamp(String timestampStr, List<String> warnings) {
        try {
            Instant timestamp = Instant.parse(timestampStr);
            Duration age = Duration.between(timestamp, Instant.now());

            if (age.compareTo(STALE_TIMESTAMP_WARNING) > 0 &&
                age.compareTo(STALE_TIMESTAMP_REJECT) <= 0) {
                warnings.add("Stale timestamp: " + age.toMinutes() + " minutes old");
            }
        } catch (Exception e) {
            // Already caught by hard validation
        }
    }

    /**
     * RULE: next_stop_id should reference a known stop.
     * WHY: Unknown stop ID may indicate:
     *      - Stop added but not in DB
     *      - Typo in stop ID
     *      - Bus on unscheduled route
     * REJECT: No - warning only. Bus location is still valid.
     */
    private void validateKnownStop(String nextStopId, List<String> warnings) {
        if (nextStopId != null && !nextStopId.isBlank() &&
            !stopRepository.existsById(nextStopId)) {
            warnings.add("Unknown next_stop_id: '" + nextStopId + "'");
        }
    }

    /**
     * RULE: GPS position jump must be physically plausible.
     * WHY: Detects GPS glitches where position "jumps" impossibly far.
     *      Compares new position to previous known position and calculates
     *      implied speed. If implied speed > 120 km/h (max physical speed),
     *      the jump is impossible.
     * CALCULATION:
     *      - Get previous event for same bus
     *      - Calculate distance (Haversine formula)
     *      - Calculate time elapsed
     *      - Implied speed = distance / time
     *      - If implied speed > max physical speed, flag as suspicious
     * REJECT: No - warning only. Could be legitimate if bus was moved
     *         (e.g., towed, transported) or GPS glitch corrected.
     */
    private void validateGpsJump(BusLocationEventRequest request, List<String> warnings) {
        if (request.busId() == null) return;

        // Find previous event for this bus
        var previousEvent = eventRepository.findFirstByBusIdOrderByTimestampDesc(request.busId());
        if (previousEvent.isEmpty()) return; // No previous event to compare

        BusLocationEvent prev = previousEvent.get();

        try {
            Instant newTimestamp = Instant.parse(request.timestamp());
            Instant prevTimestamp = prev.getTimestamp();

            // Calculate time elapsed in hours
            Duration timeElapsed = Duration.between(prevTimestamp, newTimestamp);
            if (timeElapsed.isZero() || timeElapsed.isNegative()) {
                // Same timestamp = duplicate or clock issue (handled elsewhere)
                return;
            }

            double hoursElapsed = timeElapsed.toMillis() / (1000.0 * 60 * 60);

            // Calculate distance in km using Haversine formula
            double distanceKm = haversineDistance(
                    prev.getLatitude(), prev.getLongitude(),
                    request.latitude(), request.longitude()
            );

            // Calculate implied speed in km/h
            double impliedSpeedKmh = distanceKm / hoursElapsed;

            // If implied speed exceeds max physical speed, flag as suspicious
            if (impliedSpeedKmh > MAX_PHYSICAL_SPEED_KMH) {
                warnings.add(String.format(
                        "Suspicious GPS jump: %.1f km in %.1f min (implied speed: %.1f km/h, max plausible: %.1f km/h)",
                        distanceKm, timeElapsed.toSeconds() / 60.0, impliedSpeedKmh, MAX_PHYSICAL_SPEED_KMH
                ));
            }

        } catch (Exception e) {
            log.warn("Error calculating GPS jump for bus {}: {}", request.busId(), e.getMessage());
        }
    }

    /**
     * Calculate distance between two GPS coordinates using Haversine formula.
     * Returns distance in kilometers.
     */
    private double haversineDistance(double lat1, double lon1, double lat2, double lon2) {
        final double R = 6371; // Earth radius in km

        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);

        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }

    // ========================================
    // RESULT CLASS
    // ========================================

    /**
     * Result of validation: either accepted, accepted with warnings, or rejected.
     */
    public static class ValidationResult {
        private final boolean accepted;
        private final boolean hasWarnings;
        private final List<String> warnings;
        private final List<String> errors;

        private ValidationResult(boolean accepted, boolean hasWarnings,
                                 List<String> warnings, List<String> errors) {
            this.accepted = accepted;
            this.hasWarnings = hasWarnings;
            this.warnings = warnings != null ? warnings : List.of();
            this.errors = errors != null ? errors : List.of();
        }

        public static ValidationResult accepted() {
            return new ValidationResult(true, false, null, null);
        }

        public static ValidationResult acceptedWithWarnings(List<String> warnings) {
            return new ValidationResult(true, true, warnings, null);
        }

        public static ValidationResult rejected(List<String> errors) {
            return new ValidationResult(false, false, null, errors);
        }

        public boolean isAccepted() { return accepted; }
        public boolean hasWarnings() { return hasWarnings; }
        public List<String> getWarnings() { return warnings; }
        public List<String> getErrors() { return errors; }

        /**
         * Convert warnings list to comma-separated string for storage.
         */
        public String getWarningsJoined() {
            return String.join("; ", warnings);
        }
    }
}
