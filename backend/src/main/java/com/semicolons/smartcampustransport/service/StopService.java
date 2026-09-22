package com.semicolons.smartcampustransport.service;

import com.semicolons.smartcampustransport.dto.CreateStopRequest;
import com.semicolons.smartcampustransport.dto.StopInfo;
import com.semicolons.smartcampustransport.entity.Route;
import com.semicolons.smartcampustransport.entity.RouteStop;
import com.semicolons.smartcampustransport.entity.Stop;
import com.semicolons.smartcampustransport.repository.RouteRepository;
import com.semicolons.smartcampustransport.repository.RouteStopRepository;
import com.semicolons.smartcampustransport.repository.StopRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.ObjectProvider;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class StopService {

    private final RouteRepository routeRepository;
    private final StopRepository stopRepository;
    private final RouteStopRepository routeStopRepository;
    private final ObjectProvider<BusSimulationService> busSimulationServiceProvider;

    @Transactional
    public StopInfo createStop(CreateStopRequest request) {
        Route route = routeRepository.findById(request.routeId())
                .orElseThrow(() -> new IllegalArgumentException("Invalid route ID"));
        
        List<RouteStop> existingRouteStops = routeStopRepository.findByRouteIdOrderBySequenceOrder(request.routeId());

        if (existingRouteStops.stream().anyMatch(rs -> rs.getStop().getName().equalsIgnoreCase(request.name().trim()))) {
            throw new IllegalArgumentException("Stop name already exists on this route");
        }

        boolean duplicate = existingRouteStops.stream()
                .map(RouteStop::getStop)
                .anyMatch(stop -> Math.hypot(stop.getLatitude() - request.latitude(), stop.getLongitude() - request.longitude()) < 0.0002);
        
        if (duplicate) {
            throw new IllegalStateException("Duplicate location");
        }

        int targetSeq = request.sequenceOrder();
        
        // Shift sequences to make room
        for (int i = existingRouteStops.size() - 1; i >= 0; i--) {
            RouteStop rs = existingRouteStops.get(i);
            if (rs.getSequenceOrder() >= targetSeq) {
                rs.setSequenceOrder(rs.getSequenceOrder() + 1);
                routeStopRepository.save(rs);
            }
        }

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
                .sequenceOrder(targetSeq)
                .arrivalOffsetMinutes(request.arrivalOffsetMinutes())
                .build();
        routeStopRepository.save(routeStop);

        // Regenerate geometry cache mapping if simulation service exists
        busSimulationServiceProvider.ifAvailable(BusSimulationService::generateGeometryNow);

        return new StopInfo(stop.getStopId(), stop.getName(), stop.getLatitude(), stop.getLongitude(),
                routeStop.getSequenceOrder(), routeStop.getArrivalOffsetMinutes());
    }
}
