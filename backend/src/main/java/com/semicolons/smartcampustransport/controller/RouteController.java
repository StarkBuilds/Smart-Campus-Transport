package com.semicolons.smartcampustransport.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.semicolons.smartcampustransport.dto.RouteResponse;
import com.semicolons.smartcampustransport.service.RouteService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
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
@Slf4j
public class RouteController {

    private final RouteService routeService;
    private final ObjectMapper objectMapper;
    private final com.semicolons.smartcampustransport.service.RouteGeometryService routeGeometryService;

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
    public ResponseEntity<RouteResponse> getRouteById(
            @PathVariable("id") String routeId
    ) {
        return routeService.getRouteById(routeId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Get route geometry as a JSON object.
     *
     * Response shape:
     * {
     *   "geometry": {
     *     "type": "LineString",
     *     "coordinates": [...]
     *   }
     * }
     */
    @GetMapping(
            value = "/routes/{id}/geometry",
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<String> getRouteGeometry(
            @PathVariable("id") String routeId
    ) {
        try {
            ObjectNode response = objectMapper.createObjectNode();
            response.set("geometry", routeGeometryService.getGeometry(routeId));
            return ResponseEntity.ok(objectMapper.writeValueAsString(response));

        } catch (Exception e) {
            log.error(
                    "Failed to read geometry for route {}",
                    routeId,
                    e
            );

            return ResponseEntity.internalServerError().build();
        }
    }
}