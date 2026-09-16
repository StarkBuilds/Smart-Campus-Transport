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
     * Scheduled arrival time at this stop for the route.
     * Decision #6: schedule data lives in PostgreSQL, not hardcoded in ML.
     */
    @Column(name = "scheduled_arrival_time")
    private LocalTime scheduledArrivalTime;
}
