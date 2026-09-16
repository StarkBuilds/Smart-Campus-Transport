package com.semicolons.smartcampustransport.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "buses")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Bus {

    @Id
    @Column(name = "bus_id", nullable = false, unique = true)
    private String busId;

    @Column(name = "license_plate")
    private String licensePlate;

    @Column(name = "capacity")
    private Integer capacity;

    @Column(name = "route_id")
    private String routeId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private BusStatus status;

    // Latest GPS state (denormalized for efficient queries)
    @Column(name = "latest_latitude")
    private Double latestLatitude;

    @Column(name = "latest_longitude")
    private Double latestLongitude;

    @Column(name = "latest_timestamp")
    private Instant latestTimestamp;

    @Column(name = "latest_speed_kmh")
    private Double latestSpeedKmh;

    @Column(name = "bearing")
    private Double bearing;

    @Column(name = "next_stop_id")
    private String nextStopId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = Instant.now();
        updatedAt = Instant.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }

    public enum BusStatus {
        IN_SERVICE,
        OUT_OF_SERVICE,
        MAINTENANCE
    }
}
