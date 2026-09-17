package com.semicolons.smartcampustransport.service;

import com.semicolons.smartcampustransport.dto.ScheduleResponse;
import com.semicolons.smartcampustransport.entity.Schedule;
import com.semicolons.smartcampustransport.repository.RouteRepository;
import com.semicolons.smartcampustransport.repository.ScheduleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Service for schedule management.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class ScheduleService {

    private final ScheduleRepository scheduleRepository;
    private final RouteRepository routeRepository;

    /**
     * Get all active schedules.
     */
    public List<ScheduleResponse> getAllSchedules() {
        return scheduleRepository.findAll().stream()
            .map(ScheduleResponse::from)
            .toList();
    }

    /**
     * Get schedule by ID.
     */
    public Optional<ScheduleResponse> getScheduleById(String scheduleId) {
        return scheduleRepository.findByScheduleId(scheduleId)
            .map(ScheduleResponse::from);
    }

    /**
     * Get schedules for a specific route.
     */
    public List<ScheduleResponse> getSchedulesByRouteId(String routeId) {
        return scheduleRepository.findByRouteId(routeId).stream()
            .map(ScheduleResponse::from)
            .toList();
    }

    /**
     * Get active schedules for a route on a specific date.
     */
    public List<ScheduleResponse> getActiveSchedulesForRouteOnDate(String routeId, LocalDate date) {
        return scheduleRepository.findActiveSchedulesForRouteOnDate(routeId, date).stream()
            .map(ScheduleResponse::from)
            .toList();
    }

    /**
     * Create a new schedule (Admin only).
     */
    @Transactional
    public ScheduleResponse createSchedule(
        String routeId,
        LocalTime departureTime,
        Set<String> operatingDays,
        LocalDate effectiveFrom,
        LocalDate effectiveTo,
        String name
    ) {
        if (!routeRepository.existsById(routeId)) {
            throw new IllegalArgumentException("Unknown route ID: " + routeId);
        }

        Set<Schedule.DayOfWeek> days = operatingDays.stream()
            .map(Schedule.DayOfWeek::valueOf)
            .collect(Collectors.toSet());

        Schedule schedule = Schedule.builder()
            .routeId(routeId)
            .departureTime(departureTime)
            .operatingDays(days)
            .effectiveFrom(effectiveFrom)
            .effectiveTo(effectiveTo)
            .name(name)
            .active(true)
            .build();

        Schedule saved = scheduleRepository.save(schedule);
        log.info("Created schedule {} for route {} departing at {}", saved.getScheduleId(), routeId, departureTime);

        return ScheduleResponse.from(saved);
    }
}
