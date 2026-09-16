package com.semicolons.smartcampustransport.controller;

import com.semicolons.smartcampustransport.dto.BusLocationEventRequest;
import com.semicolons.smartcampustransport.dto.BusLocationEventResponse;
import com.semicolons.smartcampustransport.service.BusEventService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Controller for GPS event ingestion.
 *
 * Endpoint: POST /api/bus-events
 * Auth: ADMIN only (bus devices authenticated as admin)
 * Request: BusLocationEventRequest (canonical GPS contract)
 * Response: BusLocationEventResponse with eventId and status
 *
 * Frontend: Not consumed directly by frontend. Called by bus GPS devices.
 *
 * Flow:
 * 1. Bean validation (@Valid)
 * 2. Business validation (DataValidationService)
 * 3. Duplicate detection
 * 4. Persist event
 * 5. Update bus latest state
 * 6. Generate alerts
 * 7. Return response
 */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Slf4j
public class BusEventController {

    private final BusEventService busEventService;

    /**
     * Ingest a GPS bus event.
     *
     * @param request the GPS event data
     * @return response with event ID and validation status
     */
    @PostMapping("/bus-events")
    public ResponseEntity<BusLocationEventResponse> ingestEvent(
            @Valid @RequestBody BusLocationEventRequest request) {

        log.info("Received event for bus {} at {}", request.busId(), request.timestamp());

        BusLocationEventResponse response = busEventService.ingestEvent(request);

        if ("REJECTED".equals(response.status())) {
            return ResponseEntity.badRequest().body(response);
        }

        return ResponseEntity.ok(response);
    }
}
