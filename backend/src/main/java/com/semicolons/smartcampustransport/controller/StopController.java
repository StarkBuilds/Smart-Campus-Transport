package com.semicolons.smartcampustransport.controller;

import com.semicolons.smartcampustransport.dto.CreateStopRequest;
import com.semicolons.smartcampustransport.dto.StopInfo;
import com.semicolons.smartcampustransport.entity.Route;
import com.semicolons.smartcampustransport.entity.RouteStop;
import com.semicolons.smartcampustransport.entity.Stop;
import com.semicolons.smartcampustransport.repository.RouteRepository;
import com.semicolons.smartcampustransport.repository.RouteStopRepository;
import com.semicolons.smartcampustransport.repository.StopRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/stops")
@RequiredArgsConstructor
public class StopController {

    private final RouteRepository routeRepository;
    private final StopRepository stopRepository;
    private final RouteStopRepository routeStopRepository;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<StopInfo> create(@Valid @RequestBody CreateStopRequest request) {
        Route route = routeRepository.findById(request.routeId()).orElse(null);
        if (route == null || routeStopRepository.findByRouteIdOrderBySequenceOrder(request.routeId()).stream()
                .anyMatch(routeStop -> routeStop.getStop().getName().equalsIgnoreCase(request.name().trim()))) {
            return ResponseEntity.badRequest().build();
        }
        boolean duplicate = routeStopRepository.findByRouteIdOrderBySequenceOrder(request.routeId()).stream()
                .map(RouteStop::getStop)
                .anyMatch(stop -> Math.hypot(stop.getLatitude() - request.latitude(), stop.getLongitude() - request.longitude()) < 0.0002);
        if (duplicate) return ResponseEntity.status(409).build();

        Stop stop = Stop.builder()
                .stopId("STOP-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .name(request.name().trim())
                .latitude(request.latitude())
                .longitude(request.longitude())
                .build();
        stopRepository.save(stop);
        RouteStop routeStop = RouteStop.builder()
                .route(route)
                .stop(stop)
                .sequenceOrder(request.sequenceOrder())
                .arrivalOffsetMinutes(request.arrivalOffsetMinutes())
                .build();
        routeStopRepository.save(routeStop);
        return ResponseEntity.ok(new StopInfo(stop.getStopId(), stop.getName(), stop.getLatitude(), stop.getLongitude(),
                routeStop.getSequenceOrder(), routeStop.getArrivalOffsetMinutes()));
    }
}