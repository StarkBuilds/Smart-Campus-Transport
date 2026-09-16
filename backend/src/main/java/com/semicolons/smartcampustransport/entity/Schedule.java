package com.semicolons.smartcampustransport.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.HashSet;
import java.util.Set;

/**
 * Represents a departure schedule for a route.
 *
 * A Schedule defines when buses depart on a specific route.
 * Multiple schedules can exist for the same route (e.g., morning/afternoon runs).
 *
 * Example: Route R1 has two schedules:
 * - Schedule 1: departureTime=08:00, operatingDays=[MON,TUE,WED,THU,FRI]
 * - Schedule 2: departureTime=17:00, operatingDays=[MON,TUE,WED,THU,FRI]
 */
@Entity
@Table(name = "schedules")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Schedule {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "schedule_id", updatable = false, nullable = false)
    private String scheduleId;

    @Column(name = "route_id", nullable = false)
    private String routeId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "route_id", insertable = false, updatable = false)
    private Route route;

    /**
     * Departure time from the first stop.
     * This is the base time; RouteStop.arrivalOffsetMinutes are relative to this.
     */
    @Column(name = "departure_time", nullable = false)
    private LocalTime departureTime;

    /**
     * Days of week this schedule operates.
     * Stored as comma-separated values: "MON,TUE,WED,THU,FRI"
     */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "schedule_operating_days", joinColumns = @JoinColumn(name = "schedule_id"))
    @Column(name = "day_of_week")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private Set<DayOfWeek> operatingDays = new HashSet<>();

    /**
     * Date when this schedule becomes effective.
     */
    @Column(name = "effective_from")
    private LocalDate effectiveFrom;

    /**
     * Date when this schedule expires.
     */
    @Column(name = "effective_to")
    private LocalDate effectiveTo;

    /**
     * Whether this schedule is currently active.
     */
    @Column(name = "active", nullable = false)
    @Builder.Default
    private Boolean active = true;

    /**
     * Human-readable name for this schedule.
     * Example: "Morning Run", "Afternoon Run"
     */
    @Column(name = "name")
    private String name;

    /**
     * Day of week enum for operating days.
     */
    public enum DayOfWeek {
        MON, TUE, WED, THU, FRI, SAT, SUN
    }
}
