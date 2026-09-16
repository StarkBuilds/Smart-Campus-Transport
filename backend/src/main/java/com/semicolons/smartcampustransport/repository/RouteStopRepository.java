package com.semicolons.smartcampustransport.repository;

import com.semicolons.smartcampustransport.entity.RouteStop;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RouteStopRepository extends JpaRepository<RouteStop, Long> {

    List<RouteStop> findByRouteIdOrderBySequenceOrder(String routeId);

    Optional<RouteStop> findByRouteIdAndStopId(String routeId, String stopId);
}
