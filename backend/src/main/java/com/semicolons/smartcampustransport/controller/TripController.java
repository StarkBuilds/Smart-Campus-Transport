package com.semicolons.smartcampustransport.controller;

import com.semicolons.smartcampustransport.dto.TripRequest;
import com.semicolons.smartcampustransport.dto.TripResponse;
import com.semicolons.smartcampustransport.service.TripService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * Controller for Trip management.
 *
 * Auth:
 * - GET /api/trips: STUDENT and ADMIN
 * - POST /api/trips: ADMIN only
 * - PUT /api/trips/**: ADMIN only
 */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class TripController {

    private final TripService tripService;

    /**
     * Get trips, optionally filtered by date or routeId.
     */
    @GetMapping("/trips")
    public ResponseEntity<List<TripResponse>> getTrips(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) String routeId) {

        if (routeId != null && date != null) {
            return ResponseEntity.ok(tripService.getTripsByRouteAndDate(routeId, date));
        } else if (date != null) {
            return ResponseEntity.ok(tripService.getTripsByDate(date));
        }

        return ResponseEntity.ok(tripService.getAllTrips());
    }

    /**
     * Get a single trip by ID.
     */
    @GetMapping("/trips/{id}")
    public ResponseEntity<TripResponse> getTripById(@PathVariable("id") String tripId) {
        return tripService.getTripById(tripId)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Create a new scheduled trip (Admin only).
     */
    @PostMapping("/trips")
    public ResponseEntity<TripResponse> createTrip(@Valid @RequestBody TripRequest request) {
        return ResponseEntity.ok(tripService.createTrip(request));
    }

    /**
     * Assign a bus to a trip (Admin only).
     */
    @PutMapping("/trips/{id}/assign-bus")
    public ResponseEntity<TripResponse> assignBus(
            @PathVariable("id") String tripId,
            @RequestParam String busId) {
        return ResponseEntity.ok(tripService.assignBusToTrip(tripId, busId));
    }

    /**
     * Start a trip (Admin/Device only).
     */
    @PutMapping("/trips/{id}/start")
    public ResponseEntity<TripResponse> startTrip(@PathVariable("id") String tripId) {
        return ResponseEntity.ok(tripService.startTrip(tripId));
    }

    /**
     * Complete a trip (Admin/Device only).
     */
    @PutMapping("/trips/{id}/complete")
    public ResponseEntity<TripResponse> completeTrip(@PathVariable("id") String tripId) {
        return ResponseEntity.ok(tripService.completeTrip(tripId));
    }

    /**
     * Cancel a trip (Admin only).
     */
    @PutMapping("/trips/{id}/cancel")
    public ResponseEntity<TripResponse> cancelTrip(
            @PathVariable("id") String tripId,
            @RequestParam(required = false) String reason) {
        return ResponseEntity.ok(tripService.cancelTrip(tripId, reason));
    }
}
