package com.semicolons.smartcampustransport.util;

import com.semicolons.smartcampustransport.entity.RouteStop;
import com.semicolons.smartcampustransport.entity.Schedule;
import com.semicolons.smartcampustransport.repository.ScheduleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.time.Duration;

/**
 * Genuine schedule delay only — ignores stale timetable mismatches.
 */
@Component
@RequiredArgsConstructor
public class DelayCalculator {

    private static final long MAX_RELEVANT_ABS_MINUTES = 90;

    private final ScheduleRepository scheduleRepository;

    public int calculateDelayMinutes(String routeId, RouteStop currentStop) {
        if (currentStop == null) return 0;

        List<Schedule> activeSchedules = scheduleRepository.findActiveSchedulesForRouteOnDate(routeId, LocalDate.now());
        if (activeSchedules.isEmpty()) {
            return 0;
        }

        LocalTime now = LocalTime.now(ZoneId.systemDefault());
        Integer stopOffset = currentStop.getArrivalOffsetMinutes();
        if (stopOffset == null) stopOffset = 0;

        Schedule bestSchedule = null;
        long minAbsDiff = Long.MAX_VALUE;

        for (Schedule s : activeSchedules) {
            LocalTime scheduledArrival = s.getDepartureTime().plusMinutes(stopOffset);
            long diff = Duration.between(scheduledArrival, now).toMinutes();
            long abs = Math.abs(diff);
            // Only consider timetable windows near "now" so overnight/stale schedules don't fabricate +900 min delays.
            if (abs <= MAX_RELEVANT_ABS_MINUTES && abs < minAbsDiff) {
                minAbsDiff = abs;
                bestSchedule = s;
            }
        }

        if (bestSchedule == null) {
            return 0;
        }

        LocalTime scheduledArrival = bestSchedule.getDepartureTime().plusMinutes(stopOffset);
        long delay = Duration.between(scheduledArrival, now).toMinutes();
        if (Math.abs(delay) > MAX_RELEVANT_ABS_MINUTES) {
            return 0;
        }
        return (int) delay;
    }
}
