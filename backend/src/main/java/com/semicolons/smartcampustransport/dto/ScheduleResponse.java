package com.semicolons.smartcampustransport.dto;

import com.semicolons.smartcampustransport.entity.Schedule;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Response DTO for Schedule entity.
 */
public record ScheduleResponse(
    String scheduleId,
    String routeId,
    LocalTime departureTime,
    Set<String> operatingDays,
    LocalDate effectiveFrom,
    LocalDate effectiveTo,
    Boolean active,
    String name
) {
    public static ScheduleResponse from(Schedule schedule) {
        return new ScheduleResponse(
            schedule.getScheduleId(),
            schedule.getRouteId(),
            schedule.getDepartureTime(),
            schedule.getOperatingDays().stream()
                .map(Enum::name)
                .collect(Collectors.toSet()),
            schedule.getEffectiveFrom(),
            schedule.getEffectiveTo(),
            schedule.getActive(),
            schedule.getName()
        );
    }
}
