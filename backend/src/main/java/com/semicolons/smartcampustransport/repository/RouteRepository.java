package com.semicolons.smartcampustransport.repository;

import com.semicolons.smartcampustransport.entity.Route;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RouteRepository extends JpaRepository<Route, String> {

    Optional<Route> findByRouteId(String routeId);
}
