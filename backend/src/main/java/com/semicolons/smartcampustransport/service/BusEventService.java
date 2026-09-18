package com.semicolons.smartcampustransport.service;

import com.semicolons.smartcampustransport.dto.BusLocationEventRequest;
import com.semicolons.smartcampustransport.dto.BusLocationEventResponse;
import com.semicolons.smartcampustransport.entity.Bus;
import com.semicolons.smartcampustransport.entity.BusLocationEvent;
import com.semicolons.smartcampustransport.repository.BusLocationEventRepository;
import com.semicolons.smartcampustransport.repository.BusRepository;
import com.semicolons.smartcampustransport.validation.DataValidationService;
import com.semicolons.smartcampustransport.validation.DataValidationService.ValidationResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

/**
 * Service for ingesting and processing GPS bus events.
 *
 * Flow: request -> validation -> persistence -> alert generation
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BusEventService {

    private final BusLocationEventRepository eventRepository;
    private final BusRepository busRepository;
    private final DataValidationService validationService;
    private final AlertService alertService;

    /**
     * Ingest a GPS bus event.
     *
     * Validation flow:
     * 1. Bean validation (already done by @Valid in controller)
     * 2. Business validation via DataValidationService
     * 3. Duplicate detection
     * 4. Persist event
     * 5. Update bus state
     * 6. Generate alerts
     *
     * @param request the GPS event request
     * @return response with event ID and validation status
     */
    @Transactional
    public BusLocationEventResponse ingestEvent(BusLocationEventRequest request) {
        log.debug("Ingesting event for bus {} at {}", request.busId(), request.timestamp());

        // Step 1: Business validation
        ValidationResult validation = validationService.validate(request);

        if (!validation.isAccepted()) {
            log.warn("Event rejected for bus {}: {}", request.busId(), validation.getErrors());
            return BusLocationEventResponse.rejected(validation.getErrors());
        }

        // Step 2: Check for duplicate (same bus, same timestamp)
        if (isDuplicate(request)) {
            log.warn("Duplicate event for bus {} at {}", request.busId(), request.timestamp());
            return BusLocationEventResponse.rejected(
                java.util.List.of("Duplicate event: bus " + request.busId() + " already has event at " + request.timestamp())
            );
        }

        // Step 3: Build and persist event
        BusLocationEvent event = buildEvent(request, validation);
        event = eventRepository.save(event);
        log.info("Saved event {} for bus {} with status {}",
            event.getEventId(), request.busId(), event.getIngestionStatus());

        // Step 4: Update bus latest state
        updateBusLatestState(request);

        // Step 5: Generate alerts for suspicious data
        if (validation.hasWarnings()) {
            alertService.generateDataQualityAlert(request, validation.getWarnings());
        }

        // Step 6: Check for stale GPS (no events for >5 minutes)
        alertService.checkStaleGps(request.busId());

        // Step 7: Check for late bus (comparison against schedule)
        alertService.checkLateBus(request);

        if (validation.hasWarnings()) {
            return BusLocationEventResponse.acceptedWithWarnings(
                String.valueOf(event.getEventId()), validation.getWarnings());
        }

        return BusLocationEventResponse.accepted(String.valueOf(event.getEventId()));
    }

    /**
     * Check if this event is a duplicate (same bus, same timestamp).
     */
    private boolean isDuplicate(BusLocationEventRequest request) {
        try {
            Instant timestamp = Instant.parse(request.timestamp());
            return eventRepository.existsByBusIdAndTimestamp(request.busId(), timestamp);
        } catch (Exception e) {
            return false; // Invalid timestamp caught by validation
        }
    }

    /**
     * Build BusLocationEvent entity from request.
     */
    private BusLocationEvent buildEvent(BusLocationEventRequest request, ValidationResult validation) {
        BusLocationEvent.BusLocationEventBuilder builder = BusLocationEvent.builder()
            .busId(request.busId())
            .routeId(request.routeId())
            .tripId(request.tripId())
            .timestamp(Instant.parse(request.timestamp()))
            .latitude(request.latitude())
            .longitude(request.longitude())
            .bearing(request.bearing())
            .speedKmh(request.speedKmh())
            .accuracyM(request.accuracyM())
            .status(request.toStatusEnum())
            .nextStopId(request.nextStopId())
            .suspicious(validation.hasWarnings())
            .warnings(validation.hasWarnings() ? validation.getWarningsJoined() : null);

        if (validation.hasWarnings()) {
            builder.ingestionStatus(BusLocationEvent.IngestionStatus.ACCEPTED_WITH_WARNINGS);
        } else {
            builder.ingestionStatus(BusLocationEvent.IngestionStatus.ACCEPTED);
        }

        return builder.build();
    }

    /**
     * Update bus entity with latest location/state.
     * This enables efficient "GET /api/buses" queries.
     */
    private void updateBusLatestState(BusLocationEventRequest request) {
        busRepository.findById(request.busId()).ifPresent(bus -> {
            bus.setLatestLatitude(request.latitude());
            bus.setLatestLongitude(request.longitude());
            bus.setLatestTimestamp(Instant.parse(request.timestamp()));
            bus.setLatestSpeedKmh(request.speedKmh());
            bus.setStatus(request.toStatusEnum());
            bus.setNextStopId(request.nextStopId());
            busRepository.save(bus);
        });
    }
}
