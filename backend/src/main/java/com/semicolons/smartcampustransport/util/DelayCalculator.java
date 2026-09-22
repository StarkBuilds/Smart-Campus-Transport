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
 * Genuine schedule delay — predicted arrival vs timetable for a specific stop.
 */
@Component
@RequiredArgsConstructor
public class DelayCalculator {

    private static final long MAX_RELEVANT_ABS_MINUTES = 90;

    private final ScheduleRepository scheduleRepository;

    /**
     * Delay at a stop based on wall-clock "now" vs scheduled arrival (legacy).
     */
    public int calculateDelayMinutes(String routeId, RouteStop currentStop) {
        return calculateArrivalDelayMinutes(routeId, currentStop, 0);
    }

    /**
     * Delay = (now + etaMinutesFromNow) − scheduledArrival at the given stop.
     * Positive = late, negative = early. Returns 0 when no nearby timetable window.
     */
    public int calculateArrivalDelayMinutes(String routeId, RouteStop targetStop, int etaMinutesFromNow) {
        if (targetStop == null) return 0;

        List<Schedule> activeSchedules = scheduleRepository.findActiveSchedulesForRouteOnDate(routeId, LocalDate.now());
        if (activeSchedules.isEmpty()) {
            return 0;
        }

        LocalTime predictedArrival = LocalTime.now(ZoneId.systemDefault()).plusMinutes(Math.max(0, etaMinutesFromNow));
        Integer stopOffset = targetStop.getArrivalOffsetMinutes();
        if (stopOffset == null) stopOffset = 0;

        Schedule bestSchedule = null;
        long minAbsDiff = Long.MAX_VALUE;

        for (Schedule s : activeSchedules) {
            LocalTime scheduledArrival = s.getDepartureTime().plusMinutes(stopOffset);
            long diff = Duration.between(scheduledArrival, predictedArrival).toMinutes();
            long abs = Math.abs(diff);
            if (abs <= MAX_RELEVANT_ABS_MINUTES && abs < minAbsDiff) {
                minAbsDiff = abs;
                bestSchedule = s;
            }
        }

        if (bestSchedule == null) {
            return 0;
        }

        LocalTime scheduledArrival = bestSchedule.getDepartureTime().plusMinutes(stopOffset);
        long delay = Duration.between(scheduledArrival, predictedArrival).toMinutes();
        if (Math.abs(delay) > MAX_RELEVANT_ABS_MINUTES) {
            return 0;
        }
        return (int) delay;
    }
}
