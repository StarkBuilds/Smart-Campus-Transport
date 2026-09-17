package com.semicolons.smartcampustransport.validation;

import com.semicolons.smartcampustransport.dto.BusLocationEventRequest;
import com.semicolons.smartcampustransport.entity.Bus;
import com.semicolons.smartcampustransport.entity.BusLocationEvent;
import com.semicolons.smartcampustransport.repository.BusLocationEventRepository;
import com.semicolons.smartcampustransport.repository.BusRepository;
import com.semicolons.smartcampustransport.repository.RouteRepository;
import com.semicolons.smartcampustransport.repository.StopRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.Instant;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class DataValidationServiceTest {

    @Mock
    private BusLocationEventRepository eventRepository;

    @Mock
    private BusRepository busRepository;

    @Mock
    private RouteRepository routeRepository;

    @Mock
    private StopRepository stopRepository;

    @InjectMocks
    private DataValidationService validationService;

    @BeforeEach
    void setUp() {
        // Default mocks: bus, route, stop exist
        when(busRepository.existsById(anyString())).thenReturn(true);
        when(routeRepository.existsById(anyString())).thenReturn(true);
        when(stopRepository.existsById(anyString())).thenReturn(true);
    }

    private BusLocationEventRequest createValidRequest() {
        return new BusLocationEventRequest(
                "B01",
                "R01",
                "TRIP-NL-20260916-0830",
                Instant.now().toString(),
                37.7749,
                -122.4194,
                134.5,
                28.4,
                3.2,
                "IN_SERVICE",
                "STOP-LIBRARY-SOUTH"
        );
    }

    @Test
    @DisplayName("Valid event passes with no warnings")
    void validEvent_passes() {
        var request = createValidRequest();
        var result = validationService.validate(request);

        assertTrue(result.isAccepted());
        assertFalse(result.hasWarnings());
        assertTrue(result.getErrors().isEmpty());
    }

    @Test
    @DisplayName("Hard reject: unknown status enum")
    void invalidStatus_rejected() {
        var request = new BusLocationEventRequest(
                "B01", "R01", "TRIP-01",
                Instant.now().toString(),
                37.7749, -122.4194,
                134.5, 28.4, 3.2,
                "FLYING", // Invalid
                "STOP-01"
        );
        var result = validationService.validate(request);

        assertFalse(result.isAccepted());
        assertTrue(result.getErrors().stream().anyMatch(e -> e.contains("Invalid status")));
    }

    @Test
    @DisplayName("Hard reject: unknown bus_id")
    void unknownBus_rejected() {
        when(busRepository.existsById("UNKNOWN_BUS")).thenReturn(false);

        var request = new BusLocationEventRequest(
                "UNKNOWN_BUS", "R01", "TRIP-01",
                Instant.now().toString(),
                37.7749, -122.4194,
                134.5, 28.4, 3.2,
                "IN_SERVICE",
                "STOP-01"
        );
        var result = validationService.validate(request);

        assertFalse(result.isAccepted());
        assertTrue(result.getErrors().stream().anyMatch(e -> e.contains("Unknown bus_id")));
    }

    @Test
    @DisplayName("Hard reject: timestamp in future (>1min)")
    void futureTimestamp_rejected() {
        String futureTimestamp = Instant.now().plusSeconds(120).toString();

        var request = new BusLocationEventRequest(
                "B01", "R01", "TRIP-01",
                futureTimestamp,
                37.7749, -122.4194,
                134.5, 28.4, 3.2,
                "IN_SERVICE",
                "STOP-01"
        );
        var result = validationService.validate(request);

        assertFalse(result.isAccepted());
        assertTrue(result.getErrors().stream().anyMatch(e -> e.contains("in the future")));
    }

    @Test
    @DisplayName("Hard reject: GPS accuracy > 100m")
    void extremeAccuracy_rejected() {
        var request = new BusLocationEventRequest(
                "B01", "R01", "TRIP-01",
                Instant.now().toString(),
                37.7749, -122.4194,
                134.5, 28.4,
                150.0, // > 100m
                "IN_SERVICE",
                "STOP-01"
        );
        var result = validationService.validate(request);

        assertFalse(result.isAccepted());
        assertTrue(result.getErrors().stream().anyMatch(e -> e.contains("accuracy too poor")));
    }

    @Test
    @DisplayName("Warning: GPS accuracy between 20m and 100m")
    void poorAccuracy_acceptedWithWarning() {
        var request = new BusLocationEventRequest(
                "B01", "R01", "TRIP-01",
                Instant.now().toString(),
                37.7749, -122.4194,
                134.5, 28.4,
                35.0, // > 20m, < 100m
                "IN_SERVICE",
                "STOP-01"
        );
        var result = validationService.validate(request);

        assertTrue(result.isAccepted());
        assertTrue(result.hasWarnings());
        assertTrue(result.getWarnings().stream().anyMatch(w -> w.contains("accuracy above warning threshold")));
    }

    @Test
    @DisplayName("Warning: speed > 60 km/h")
    void highSpeed_acceptedWithWarning() {
        var request = new BusLocationEventRequest(
                "B01", "R01", "TRIP-01",
                Instant.now().toString(),
                37.7749, -122.4194,
                134.5,
                75.0, // > 60 km/h
                3.2,
                "IN_SERVICE",
                "STOP-01"
        );
        var result = validationService.validate(request);

        assertTrue(result.isAccepted());
        assertTrue(result.hasWarnings());
        assertTrue(result.getWarnings().stream().anyMatch(w -> w.contains("Suspicious speed")));
    }

    @Test
    @DisplayName("Warning: physically impossible GPS jump (implied speed > 120 km/h)")
    void impossibleGpsJump_acceptedWithWarning() {
        Instant pastTime = Instant.now().minusSeconds(60); // 1 minute ago

        // Previous position in San Francisco
        BusLocationEvent prevEvent = BusLocationEvent.builder()
                .busId("B01")
                .latitude(37.7749)
                .longitude(-122.4194)
                .timestamp(pastTime)
                .build();

        when(eventRepository.findFirstByBusIdOrderByTimestampDesc("B01"))
                .thenReturn(Optional.of(prevEvent));

        // New position: ~50km away (Oakland airport area) in just 1 minute
        // Implied speed: ~3000 km/h — physically impossible
        var request = new BusLocationEventRequest(
                "B01", "R01", "TRIP-01",
                Instant.now().toString(),
                37.4000, -122.0000,
                134.5, 28.4, 3.2,
                "IN_SERVICE",
                "STOP-01"
        );
        var result = validationService.validate(request);

        assertTrue(result.isAccepted());
        assertTrue(result.hasWarnings());
        assertTrue(result.getWarnings().stream().anyMatch(w -> w.contains("Suspicious GPS jump")));
    }

    @Test
    @DisplayName("Normal movement does not trigger GPS jump warning")
    void normalMovement_noJumpWarning() {
        Instant pastTime = Instant.now().minusSeconds(30); // 30 seconds ago

        BusLocationEvent prevEvent = BusLocationEvent.builder()
                .busId("B01")
                .latitude(37.7749)
                .longitude(-122.4194)
                .timestamp(pastTime)
                .build();

        when(eventRepository.findFirstByBusIdOrderByTimestampDesc("B01"))
                .thenReturn(Optional.of(prevEvent));

        // Moved ~200 meters in 30 seconds = ~24 km/h — perfectly normal
        var request = new BusLocationEventRequest(
                "B01", "R01", "TRIP-01",
                Instant.now().toString(),
                37.7760, -122.4180,
                134.5, 24.0, 3.2,
                "IN_SERVICE",
                "STOP-01"
        );
        var result = validationService.validate(request);

        assertTrue(result.isAccepted());
        assertFalse(result.hasWarnings());
    }
}
