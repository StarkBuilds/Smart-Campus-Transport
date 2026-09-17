package com.semicolons.smartcampustransport.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalTime;

@Entity
@Table(name = "route_stops", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"route_id", "stop_id"}),
        @UniqueConstraint(columnNames = {"route_id", "sequence_order"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RouteStop {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "route_id", nullable = false, insertable = false, updatable = false)
    private String routeId;

    @Column(name = "stop_id", nullable = false, insertable = false, updatable = false)
    private String stopId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "route_id", nullable = false)
    private Route route;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stop_id", nullable = false)
    private Stop stop;

    /**
     * Order of this stop within the route (1-based).
     */
    @Column(name = "sequence_order", nullable = false)
    private Integer sequenceOrder;

    /**
     * Minutes after the route's departure time when the bus arrives at this stop.
     * This is offset-based scheduling to support multiple departures per day.
     *
     * Example: If departure is 08:00 and arrivalOffsetMinutes=15, the bus
     * arrives at this stop at 08:15.
     *
     * This replaces the old scheduledArrivalTime (LocalTime) which only
     * supported single-run schedules.
     */
    @Column(name = "arrival_offset_minutes")
    private Integer arrivalOffsetMinutes;
}
