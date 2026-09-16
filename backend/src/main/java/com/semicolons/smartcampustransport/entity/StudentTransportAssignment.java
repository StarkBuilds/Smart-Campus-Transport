package com.semicolons.smartcampustransport.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

/**
 * Represents a student's transport assignment.
 *
 * Links a student (User) to:
 * - A specific route they use
 * - Their pickup stop
 * - Their dropoff stop
 *
 * This enables personalized views where a student sees only
 * relevant route/stop information and ETAs for their stops.
 *
 * Example: Student A is assigned to Route R1,
 * picks up at Stop S2, drops off at Stop S5.
 */
@Entity
@Table(name = "student_transport_assignments",
    uniqueConstraints = @UniqueConstraint(name = "uq_user_route_semester", columnNames = {"user_id", "route_id", "semester"}),
    indexes = {
        @Index(name = "idx_assignment_user", columnList = "user_id"),
        @Index(name = "idx_assignment_route", columnList = "route_id")
    })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentTransportAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "assignment_id")
    private Long assignmentId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", insertable = false, updatable = false)
    private User user;

    @Column(name = "route_id", nullable = false)
    private String routeId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "route_id", insertable = false, updatable = false)
    private Route route;

    /**
     * The stop where the student boards the bus.
     */
    @Column(name = "pickup_stop_id", nullable = false)
    private String pickupStopId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pickup_stop_id", insertable = false, updatable = false)
    private Stop pickupStop;

    /**
     * The stop where the student gets off the bus.
     */
    @Column(name = "dropoff_stop_id", nullable = false)
    private String dropoffStopId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dropoff_stop_id", insertable = false, updatable = false)
    private Stop dropoffStop;

    /**
     * Academic semester this assignment is valid for.
     * Format: "2024-FALL", "2025-SPRING", etc.
     */
    @Column(name = "semester", nullable = false)
    private String semester;

    /**
     * When this assignment was created.
     */
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDate createdAt;

    /**
     * Whether this assignment is currently active.
     */
    @Column(name = "active", nullable = false)
    @Builder.Default
    private Boolean active = true;

    /**
     * Set creation date on persist.
     */
    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDate.now();
        }
    }
}
