package com.semicolons.smartcampustransport.repository;

import com.semicolons.smartcampustransport.entity.Schedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ScheduleRepository extends JpaRepository<Schedule, String> {

    Optional<Schedule> findByScheduleId(String scheduleId);

    List<Schedule> findByRouteId(String routeId);

    List<Schedule> findByActiveTrue();

    List<Schedule> findByRouteIdAndActiveTrue(String routeId);

    /**
     * Find active schedules for a route that are effective on the given date.
     */
    @Query("SELECT s FROM Schedule s WHERE s.routeId = :routeId " +
           "AND s.active = true " +
           "AND (s.effectiveFrom IS NULL OR s.effectiveFrom <= :date) " +
           "AND (s.effectiveTo IS NULL OR s.effectiveTo >= :date)")
    List<Schedule> findActiveSchedulesForRouteOnDate(
        @Param("routeId") String routeId,
        @Param("date") LocalDate date
    );

    /**
     * Find all active schedules effective on the given date.
     */
    @Query("SELECT s FROM Schedule s WHERE s.active = true " +
           "AND (s.effectiveFrom IS NULL OR s.effectiveFrom <= :date) " +
           "AND (s.effectiveTo IS NULL OR s.effectiveTo >= :date)")
    List<Schedule> findActiveSchedulesOnDate(@Param("date") LocalDate date);
}
