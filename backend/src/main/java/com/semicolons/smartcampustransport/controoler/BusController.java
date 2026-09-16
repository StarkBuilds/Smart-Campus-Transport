package com.semicolons.smartcampustransport.controller;

import com.semicolons.smartcampustransport.dto.BusResponse;
import com.semicolons.smartcampustransport.service.BusService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Controller for bus queries.
 *
 * Auth: STUDENT and ADMIN
 * Frontend: BusMap component polls GET /api/buses every 10-15 seconds
 */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class BusController {

    private final BusService busService;

    /**
     * Get all buses with latest location.
     * Frontend polls this every 10-15 seconds for live tracking.
     *
     * @return list of all buses
     */
    @GetMapping("/buses")
    public ResponseEntity<List<BusResponse>> getAllBuses() {
        return ResponseEntity.ok(busService.getAllBuses());
    }

    /**
     * Get a single bus by ID.
     *
     * @param busId the bus ID
     * @return bus details or 404
     */
    @GetMapping("/buses/{id}")
    public ResponseEntity<BusResponse> getBusById(@PathVariable("id") String busId) {
        return busService.getBusById(busId)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Get just the latest location for a bus.
     * Lighter-weight endpoint for frequent polling.
     *
     * @param busId the bus ID
     * @return location only or 404
     */
    @GetMapping("/buses/{id}/location")
    public ResponseEntity<BusResponse.BusLocation> getBusLocation(@PathVariable("id") String busId) {
        return busService.getBusLocation(busId)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }
}
