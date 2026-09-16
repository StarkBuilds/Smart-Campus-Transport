package com.semicolons.smartcampustransport.service;

import com.semicolons.smartcampustransport.dto.RouteResponse;
import com.semicolons.smartcampustransport.dto.StopInfo;
import com.semicolons.smartcampustransport.entity.Route;
import com.semicolons.smartcampustransport.entity.RouteStop;
import com.semicolons.smartcampustransport.repository.RouteRepository;
import com.semicolons.smartcampustransport.repository.RouteStopRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * Service for route and stop queries.
 */
@Service
@RequiredArgsConstructor
public class RouteService {

    private final RouteRepository routeRepository;
    private final RouteStopRepository routeStopRepository;

    /**
     * Get all routes with their stops.
     */
    @Transactional(readOnly = true)
    public List<RouteResponse> getAllRoutes() {
        return routeRepository.findAll().stream()
            .map(this::toRouteResponse)
            .toList();
    }

    /**
     * Get a single route by ID with ordered stops.
     */
    @Transactional(readOnly = true)
    public Optional<RouteResponse> getRouteById(String routeId) {
        return routeRepository.findById(routeId)
            .map(this::toRouteResponse);
    }

    /**
     * Convert Route entity to RouteResponse DTO.
     * Includes ordered list of stops with scheduled times.
     */
    private RouteResponse toRouteResponse(Route route) {
        List<RouteStop> routeStops = routeStopRepository.findByRouteIdOrderBySequenceOrder(route.getRouteId());

        List<StopInfo> stops = routeStops.stream()
            .map(rs -> new StopInfo(
                rs.getStop().getStopId(),
                rs.getStop().getName(),
                rs.getStop().getLatitude(),
                rs.getStop().getLongitude(),
                rs.getSequenceOrder(),
                rs.getScheduledArrivalTime()
            ))
            .toList();

        return RouteResponse.builder()
            .routeId(route.getRouteId())
            .name(route.getName())
            .description(route.getDescription())
            .color(route.getColor())
            .stops(stops)
            .build();
    }
}
