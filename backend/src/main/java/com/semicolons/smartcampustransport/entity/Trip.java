package com.semicolons.smartcampustransport.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;

/**
 * Represents a specific journey of a bus on a route.
 *
 * A Trip is the actual execution of a Schedule on a specific date.
 * It links a physical bus to a route for a specific journey.
 *
 * Lifecycle:
 * 1. SCHEDULED - Trip is planned but bus hasn't started
 * 2. IN_PROGRESS - Bus is actively on this trip
 * 3. COMPLETED - Bus finished the trip
 * 4. CANCELLED - Trip was cancelled (bus breakdown, etc.)
 *
 * This enables dynamic bus-to-route assignment:
 * - Bus 1 does Route R1 morning trip (Schedule 1)
 * - Same Bus 1 does Route R2 afternoon trip (Schedule 2)
 */
@Entity
@Table(name = "trips", indexes = {
    @Index(name = "idx_trip_schedule", columnList = "schedule_id"),
    @Index(name = "idx_trip_bus", columnList = "bus_id"),
    @Index(name = "idx_trip_date_status", columnList = "trip_date,status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Trip {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "trip_id", updatable = false, nullable = false)
    private String tripId;

    @Column(name = "schedule_id", nullable = false)
    private String scheduleId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "schedule_id", insertable = false, updatable = false)
    private Schedule schedule;

    @Column(name = "route_id", nullable = false)
    private String routeId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "route_id", insertable = false, updatable = false)
    private Route route;

    @Column(name = "bus_id")
    private String busId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bus_id", insertable = false, updatable = false)
    private Bus bus;

    /**
     * The date this trip occurs.
     * Combined with Schedule.departureTime gives the actual departure time.
     */
    @Column(name = "trip_date", nullable = false)
    private LocalDate tripDate;

    /**
     * Current status of this trip.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private TripStatus status = TripStatus.SCHEDULED;

    /**
     * When the trip actually started (bus began moving).
     */
    @Column(name = "actual_start_time")
    private Instant actualStartTime;

    /**
     * When the trip completed.
     */
    @Column(name = "actual_end_time")
    private Instant actualEndTime;

    /**
     * Notes about this trip (cancellation reason, delays, etc.).
     */
    @Column(name = "notes", length = 500)
    private String notes;

    /**
     * Trip status lifecycle.
     */
    public enum TripStatus {
        SCHEDULED,
        IN_PROGRESS,
        COMPLETED,
        CANCELLED
    }

    /**
     * Check if this trip can be assigned to a bus.
     */
    public boolean canAssignBus() {
        return status == TripStatus.SCHEDULED;
    }

    /**
     * Check if this trip can be started.
     */
    public boolean canStart() {
        return status == TripStatus.SCHEDULED && busId != null;
    }

    /**
     * Check if this trip can be completed.
     */
    public boolean canComplete() {
        return status == TripStatus.IN_PROGRESS;
    }
}
