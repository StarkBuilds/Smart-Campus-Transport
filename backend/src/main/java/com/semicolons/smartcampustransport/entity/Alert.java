package com.semicolons.smartcampustransport.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "alerts", indexes = {
        @Index(name = "idx_alert_bus_id", columnList = "bus_id"),
        @Index(name = "idx_alert_status", columnList = "status"),
        @Index(name = "idx_alert_created_at", columnList = "created_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Alert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "alert_type", nullable = false)
    private AlertType type;

    @Column(name = "bus_id", nullable = false)
    private String busId;

    @Column(name = "route_id")
    private String routeId;

    /**
     * The trip this alert is associated with (optional).
     */
    @Column(name = "trip_id")
    private String tripId;

    @Column(name = "message", nullable = false, length = 500)
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private AlertStatus status = AlertStatus.ACTIVE;

    @Column(name = "timestamp", nullable = false)
    private Instant timestamp;

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    @PrePersist
    protected void onCreate() {
        if (timestamp == null) {
            timestamp = Instant.now();
        }
    }

    public enum AlertType {
        LATE_BUS,
        STALE_GPS,
        DATA_QUALITY
    }

    public enum AlertStatus {
        ACTIVE,
        RESOLVED
    }
}
