package com.semicolons.smartcampustransport.repository;

import com.semicolons.smartcampustransport.entity.BusLocationEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface BusLocationEventRepository extends JpaRepository<BusLocationEvent, Long> {

    /**
     * Latest event for a specific bus (for "current location" queries).
     */
    Optional<BusLocationEvent> findFirstByBusIdOrderByTimestampDesc(String busId);

    /**
     * Recent events for a bus within a time window (for GPS jump detection).
     */
    List<BusLocationEvent> findByBusIdAndTimestampAfterOrderByTimestampDesc(
            String busId, Instant after);

    /**
     * Duplicate detection: exact match on bus_id + timestamp.
     */
    boolean existsByBusIdAndTimestamp(String busId, Instant timestamp);

    /**
     * Latest event per bus — for the dashboard "all buses" view.
     */
    @Query("""
            SELECT e FROM BusLocationEvent e
            WHERE e.timestamp = (
                SELECT MAX(e2.timestamp) FROM BusLocationEvent e2
                WHERE e2.busId = e.busId
            )
            """)
    List<BusLocationEvent> findLatestEventPerBus();

    /**
     * Non-suspicious events for ML training data export.
     */
    List<BusLocationEvent> findBySuspiciousFalseAndTimestampBetweenOrderByTimestampAsc(
            Instant from, Instant to);
}
