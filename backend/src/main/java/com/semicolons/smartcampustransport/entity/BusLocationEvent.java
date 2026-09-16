package com.semicolons.smartcampustransport.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Maps directly to the canonical GPS event contract.
 *
 * Fields match the agreed data contract exactly:
 * bus_id, route_id, trip_id, timestamp, latitude, longitude,
 * bearing, speed_kmh, accuracy_m, status, next_stop_id
 *
 * Additional fields for data quality (decision #5):
 * validationStatus, validationWarnings, suspicious
 */
@Entity
@Table(name = "bus_location_events", indexes = {
        @Index(name = "idx_event_bus_id", columnList = "bus_id"),
        @Index(name = "idx_event_route_id", columnList = "route_id"),
        @Index(name = "idx_event_timestamp", columnList = "timestamp"),
        @Index(name = "idx_event_bus_timestamp", columnList = "bus_id, timestamp")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BusLocationEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "event_id")
    private Long eventId;

    // --- Canonical contract fields ---

    @Column(name = "bus_id", nullable = false)
    private String busId;

    @Column(name = "route_id", nullable = false)
    private String routeId;

    /**
     * Decision #2: trip_id stored as a String field, not a separate entity.
     */
    @Column(name = "trip_id", nullable = false)
    private String tripId;

    @Column(name = "timestamp", nullable = false)
    private Instant timestamp;

    @Column(name = "latitude", nullable = false)
    private Double latitude;

    @Column(name = "longitude", nullable = false)
    private Double longitude;

    @Column(name = "bearing")
    private Double bearing;

    @Column(name = "speed_kmh")
    private Double speedKmh;

    @Column(name = "accuracy_m")
    private Double accuracyM;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private Bus.BusStatus status;

    @Column(name = "next_stop_id")
    private String nextStopId;

    // --- Data quality fields (decision #5) ---

    /**
     * Ingestion status: ACCEPTED or ACCEPTED_WITH_WARNINGS.
     * REJECTED events are not persisted.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "ingestion_status", nullable = false)
    @Builder.Default
    private IngestionStatus ingestionStatus = IngestionStatus.ACCEPTED;

    /**
     * Comma-separated validation warnings, if any.
     * Kept simple for a hackathon — no separate warnings table.
     */
    @Column(name = "warnings", length = 1000)
    private String warnings;

    /**
     * Flagged by DataValidationService when data is plausible but unusual.
     * ML training pipeline should filter out suspicious events.
     */
    @Column(name = "suspicious", nullable = false)
    @Builder.Default
    private Boolean suspicious = false;

    @Column(name = "received_at", nullable = false, updatable = false)
    private Instant receivedAt;

    @PrePersist
    protected void onPersist() {
        receivedAt = Instant.now();
    }

    public enum IngestionStatus {
        ACCEPTED,
        ACCEPTED_WITH_WARNINGS
        // REJECTED events are not persisted — they get a 400 response
    }
}
