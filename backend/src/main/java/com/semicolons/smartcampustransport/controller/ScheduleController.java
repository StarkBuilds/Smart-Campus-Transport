package com.semicolons.smartcampustransport.controller;

import com.semicolons.smartcampustransport.dto.ScheduleResponse;
import com.semicolons.smartcampustransport.service.ScheduleService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Set;

/**
 * Controller for schedule management.
 *
 * Auth:
 * - GET /api/schedules: STUDENT and ADMIN
 * - POST /api/schedules: ADMIN only
 */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ScheduleController {

    private final ScheduleService scheduleService;

    /**
     * Get all schedules, optionally filtered by routeId.
     */
    @GetMapping("/schedules")
    public ResponseEntity<List<ScheduleResponse>> getSchedules(
            @RequestParam(required = false) String routeId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

        if (routeId != null && date != null) {
            return ResponseEntity.ok(scheduleService.getActiveSchedulesForRouteOnDate(routeId, date));
        } else if (routeId != null) {
            return ResponseEntity.ok(scheduleService.getSchedulesByRouteId(routeId));
        }

        return ResponseEntity.ok(scheduleService.getAllSchedules());
    }

    /**
     * Get a single schedule by ID.
     */
    @GetMapping("/schedules/{id}")
    public ResponseEntity<ScheduleResponse> getScheduleById(@PathVariable("id") String scheduleId) {
        return scheduleService.getScheduleById(scheduleId)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Request DTO for creating a schedule.
     */
    public record CreateScheduleRequest(
        String routeId,
        LocalTime departureTime,
        Set<String> operatingDays,
        LocalDate effectiveFrom,
        LocalDate effectiveTo,
        String name
    ) {}

    /**
     * Create a new schedule (Admin only).
     */
    @PostMapping("/schedules")
    public ResponseEntity<ScheduleResponse> createSchedule(@RequestBody CreateScheduleRequest request) {
        ScheduleResponse response = scheduleService.createSchedule(
            request.routeId(),
            request.departureTime(),
            request.operatingDays(),
            request.effectiveFrom(),
            request.effectiveTo(),
            request.name()
        );
        return ResponseEntity.ok(response);
    }
}
