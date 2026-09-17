package com.semicolons.smartcampustransport.controller;

import com.semicolons.smartcampustransport.dto.RouteResponse;
import com.semicolons.smartcampustransport.service.RouteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Controller for route and stop queries.
 *
 * Auth: STUDENT and ADMIN
 * Frontend: RouteList component calls GET /api/routes on page load
 */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class RouteController {

    private final RouteService routeService;

    /**
     * Get all routes with ordered stops.
     *
     * @return list of all routes
     */
    @GetMapping("/routes")
    public ResponseEntity<List<RouteResponse>> getAllRoutes() {
        return ResponseEntity.ok(routeService.getAllRoutes());
    }

    /**
     * Get a single route by ID with ordered stops.
     *
     * @param routeId the route ID
     * @return route details or 404
     */
    @GetMapping("/routes/{id}")
    public ResponseEntity<RouteResponse> getRouteById(@PathVariable("id") String routeId) {
        return routeService.getRouteById(routeId)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }
}
