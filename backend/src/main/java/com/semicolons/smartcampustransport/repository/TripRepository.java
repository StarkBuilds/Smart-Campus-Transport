package com.semicolons.smartcampustransport.repository;

import com.semicolons.smartcampustransport.entity.Trip;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface TripRepository extends JpaRepository<Trip, String> {

    Optional<Trip> findByTripId(String tripId);

    List<Trip> findByBusId(String busId);

    List<Trip> findByRouteId(String routeId);

    List<Trip> findByScheduleId(String scheduleId);

    List<Trip> findByTripDate(LocalDate tripDate);

    List<Trip> findByTripDateAndStatus(LocalDate tripDate, Trip.TripStatus status);

    /**
     * Find the active trip for a bus on a specific date.
     * A bus can only have one IN_PROGRESS trip at a time.
     */
    Optional<Trip> findByBusIdAndTripDateAndStatus(
        String busId,
        LocalDate tripDate,
        Trip.TripStatus status
    );

    /**
     * Find trips for a route on a specific date.
     */
    @Query("SELECT t FROM Trip t WHERE t.routeId = :routeId AND t.tripDate = :date ORDER BY t.tripId")
    List<Trip> findByRouteIdAndDate(@Param("routeId") String routeId, @Param("date") LocalDate date);

    /**
     * Find the current in-progress trip for a bus.
     */
    Optional<Trip> findByBusIdAndStatus(String busId, Trip.TripStatus status);

    /**
     * Find scheduled trips for a schedule on a specific date.
     */
    Optional<Trip> findByScheduleIdAndTripDate(String scheduleId, LocalDate tripDate);
}
