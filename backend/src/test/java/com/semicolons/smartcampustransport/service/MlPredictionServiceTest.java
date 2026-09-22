package com.semicolons.smartcampustransport.service;

import com.semicolons.smartcampustransport.client.MlPredictionClient;
import com.semicolons.smartcampustransport.dto.PredictionRequest;
import com.semicolons.smartcampustransport.dto.PredictionResponse;
import com.semicolons.smartcampustransport.entity.Bus;
import com.semicolons.smartcampustransport.entity.BusLocationEvent;
import com.semicolons.smartcampustransport.entity.Schedule;
import com.semicolons.smartcampustransport.entity.Trip;
import com.semicolons.smartcampustransport.repository.BusLocationEventRepository;
import com.semicolons.smartcampustransport.repository.BusRepository;
import com.semicolons.smartcampustransport.repository.ScheduleRepository;
import com.semicolons.smartcampustransport.repository.TripRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MlPredictionServiceTest {

    @Mock
    private BusRepository busRepository;

    @Mock
    private BusLocationEventRepository busLocationEventRepository;

    @Mock
    private TripRepository tripRepository;

    @Mock
    private ScheduleRepository scheduleRepository;

    @Mock
    private MlPredictionClient mlPredictionClient;

    @InjectMocks
    private MlPredictionService mlPredictionService;

    @Test
    @DisplayName("Should return empty Optional when bus does not exist")
    void testBusNotFoundReturnsEmpty() {
        when(busRepository.findByBusId("BUS-999")).thenReturn(Optional.empty());

        Optional<PredictionResponse> result = mlPredictionService.getPredictionForBus("BUS-999");

        assertTrue(result.isEmpty());
        verifyNoInteractions(mlPredictionClient);
    }

    @Test
    @DisplayName("Should return unavailable response when bus has no telemetry")
    void testBusWithoutTelemetryReturnsUnavailable() {
        Bus bus = Bus.builder()
                .busId("BUS-01")
                .routeId("ROUTE-1")
                .status(Bus.BusStatus.IN_SERVICE)
                .build();

        when(busRepository.findByBusId("BUS-01")).thenReturn(Optional.of(bus));
        when(busLocationEventRepository.findFirstByBusIdOrderByTimestampDesc("BUS-01")).thenReturn(Optional.empty());

        Optional<PredictionResponse> result = mlPredictionService.getPredictionForBus("BUS-01");

        assertTrue(result.isPresent());
        PredictionResponse response = result.get();
        assertEquals("BUS-01", response.busId());
        assertEquals("ROUTE-1", response.routeId());
        assertNotNull(response.error());
        assertNull(response.predictedDelayMinutes());
        verifyNoInteractions(mlPredictionClient);
    }

    @Test
    @DisplayName("Should construct request correctly, map MAINTENANCE to OUT_OF_SERVICE, and clamp bearing 360 to 0")
    void testConstructRequestWithClampingAndStatusMapping() {
        Bus bus = Bus.builder()
                .busId("BUS-02")
                .routeId("ROUTE-1")
                .status(Bus.BusStatus.MAINTENANCE)
                .build();

        Instant now = Instant.now();
        BusLocationEvent event = BusLocationEvent.builder()
                .busId("BUS-02")
                .routeId("ROUTE-1")
                .tripId("TRIP-100")
                .timestamp(now)
                .latitude(12.9716)
                .longitude(77.5946)
                .bearing(360.0) // Clamping boundary
                .speedKmh(25.0)
                .accuracyM(4.5)
                .status(Bus.BusStatus.MAINTENANCE) // Status mapping
                .nextStopId("STOP-2")
                .build();

        when(busRepository.findByBusId("BUS-02")).thenReturn(Optional.of(bus));
        when(busLocationEventRepository.findFirstByBusIdOrderByTimestampDesc("BUS-02")).thenReturn(Optional.of(event));
        when(tripRepository.findByBusIdAndStatus("BUS-02", Trip.TripStatus.IN_PROGRESS)).thenReturn(Optional.empty());
        when(busLocationEventRepository.findByBusIdAndTimestampAfterOrderByTimestampDesc(eq("BUS-02"), any()))
                .thenReturn(List.of());

        PredictionResponse mockResponse = PredictionResponse.success(
                "BUS-02", "ROUTE-1", 3, "2026-09-20T14:30:00Z", null, "1.0.0"
        );
        when(mlPredictionClient.predict(any(PredictionRequest.class))).thenReturn(mockResponse);

        Optional<PredictionResponse> result = mlPredictionService.getPredictionForBus("BUS-02");

        assertTrue(result.isPresent());
        assertEquals(3, result.get().predictedDelayMinutes());

        ArgumentCaptor<PredictionRequest> captor = ArgumentCaptor.forClass(PredictionRequest.class);
        verify(mlPredictionClient).predict(captor.capture());

        PredictionRequest captured = captor.getValue();
        assertNotNull(captured.telemetry());
        assertEquals("BUS-02", captured.telemetry().busId());
        // Status mapped:
        assertEquals("OUT_OF_SERVICE", captured.telemetry().status());
        // Bearing clamped:
        assertEquals(0.0, captured.telemetry().bearing());
        // No fabricated distance/route/ETA:
        assertNull(captured.routeLengthKm());
        assertNull(captured.roadDistanceToNextStopKm());
        assertNull(captured.scheduledTripStart());
    }

    @Test
    @DisplayName("Should legitimately derive scheduledTripStart when active trip and schedule are present")
    void testScheduledTripStartLegitimateDerivation() {
        Bus bus = Bus.builder()
                .busId("BUS-03")
                .routeId("ROUTE-1")
                .status(Bus.BusStatus.IN_SERVICE)
                .build();

        Instant now = Instant.now();
        BusLocationEvent event = BusLocationEvent.builder()
                .busId("BUS-03")
                .routeId("ROUTE-1")
                .tripId("TRIP-200")
                .timestamp(now)
                .latitude(12.9716)
                .longitude(77.5946)
                .bearing(180.0)
                .speedKmh(30.0)
                .status(Bus.BusStatus.IN_SERVICE)
                .build();

        Schedule schedule = Schedule.builder()
                .scheduleId("SCHED-1")
                .departureTime(LocalTime.of(8, 30))
                .build();

        Trip activeTrip = Trip.builder()
                .tripId("TRIP-200")
                .busId("BUS-03")
                .routeId("ROUTE-1")
                .scheduleId("SCHED-1")
                .schedule(schedule)
                .tripDate(LocalDate.of(2026, 9, 20))
                .status(Trip.TripStatus.IN_PROGRESS)
                .build();

        when(busRepository.findByBusId("BUS-03")).thenReturn(Optional.of(bus));
        when(busLocationEventRepository.findFirstByBusIdOrderByTimestampDesc("BUS-03")).thenReturn(Optional.of(event));
        when(tripRepository.findByBusIdAndStatus("BUS-03", Trip.TripStatus.IN_PROGRESS)).thenReturn(Optional.of(activeTrip));
        when(busLocationEventRepository.findByBusIdAndTimestampAfterOrderByTimestampDesc(eq("BUS-03"), any()))
                .thenReturn(List.of());

        PredictionResponse mockResponse = PredictionResponse.success(
                "BUS-03", "ROUTE-1", 5, null, null, "1.0.0"
        );
        when(mlPredictionClient.predict(any(PredictionRequest.class))).thenReturn(mockResponse);

        Optional<PredictionResponse> result = mlPredictionService.getPredictionForBus("BUS-03");

        assertTrue(result.isPresent());
        ArgumentCaptor<PredictionRequest> captor = ArgumentCaptor.forClass(PredictionRequest.class);
        verify(mlPredictionClient).predict(captor.capture());

        PredictionRequest captured = captor.getValue();
        assertNotNull(captured.scheduledTripStart());
        assertEquals("2026-09-20T08:30:00Z", captured.scheduledTripStart());
    }

    @Test
    @DisplayName("Should include recent telemetry in strict chronological order and exclude current timestamp")
    void testRecentTelemetryChronologicalOrder() {
        Bus bus = Bus.builder()
                .busId("BUS-04")
                .routeId("ROUTE-1")
                .status(Bus.BusStatus.IN_SERVICE)
                .build();

        Instant now = Instant.now();
        BusLocationEvent latest = BusLocationEvent.builder()
                .busId("BUS-04")
                .routeId("ROUTE-1")
                .tripId("TRIP-300")
                .timestamp(now)
                .latitude(12.9716)
                .longitude(77.5946)
                .bearing(45.0)
                .speedKmh(20.0)
                .status(Bus.BusStatus.IN_SERVICE)
                .build();

        BusLocationEvent ping1 = BusLocationEvent.builder()
                .busId("BUS-04")
                .routeId("ROUTE-1")
                .tripId("TRIP-300")
                .timestamp(now.minus(2, ChronoUnit.MINUTES))
                .latitude(12.9700)
                .longitude(77.5930)
                .bearing(40.0)
                .speedKmh(18.0)
                .status(Bus.BusStatus.IN_SERVICE)
                .build();

        BusLocationEvent ping2 = BusLocationEvent.builder()
                .busId("BUS-04")
                .routeId("ROUTE-1")
                .tripId("TRIP-300")
                .timestamp(now.minus(1, ChronoUnit.MINUTES))
                .latitude(12.9708)
                .longitude(77.5938)
                .bearing(42.0)
                .speedKmh(19.0)
                .status(Bus.BusStatus.IN_SERVICE)
                .build();

        when(busRepository.findByBusId("BUS-04")).thenReturn(Optional.of(bus));
        when(busLocationEventRepository.findFirstByBusIdOrderByTimestampDesc("BUS-04")).thenReturn(Optional.of(latest));
        when(tripRepository.findByBusIdAndStatus("BUS-04", Trip.TripStatus.IN_PROGRESS)).thenReturn(Optional.empty());
        // Repository returns desc order (latest first, ping2, ping1)
        when(busLocationEventRepository.findByBusIdAndTimestampAfterOrderByTimestampDesc(eq("BUS-04"), any()))
                .thenReturn(List.of(latest, ping2, ping1));

        PredictionResponse mockResponse = PredictionResponse.success(
                "BUS-04", "ROUTE-1", 1, null, null, "1.0.0"
        );
        when(mlPredictionClient.predict(any(PredictionRequest.class))).thenReturn(mockResponse);

        mlPredictionService.getPredictionForBus("BUS-04");

        ArgumentCaptor<PredictionRequest> captor = ArgumentCaptor.forClass(PredictionRequest.class);
        verify(mlPredictionClient).predict(captor.capture());

        PredictionRequest captured = captor.getValue();
        assertNotNull(captured.recentTelemetry());
        // Must exclude the current event ('latest')
        assertEquals(2, captured.recentTelemetry().size());
        // Must be in ascending chronological order: ping1 (2 min ago) then ping2 (1 min ago)
        assertEquals(ping1.getTimestamp().toString(), captured.recentTelemetry().get(0).timestamp());
        assertEquals(ping2.getTimestamp().toString(), captured.recentTelemetry().get(1).timestamp());
    }
}
