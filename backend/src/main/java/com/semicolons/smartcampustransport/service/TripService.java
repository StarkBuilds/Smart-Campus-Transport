package com.semicolons.smartcampustransport.service;

import com.semicolons.smartcampustransport.dto.TripRequest;
import com.semicolons.smartcampustransport.dto.TripResponse;
import com.semicolons.smartcampustransport.entity.Bus;
import com.semicolons.smartcampustransport.entity.Schedule;
import com.semicolons.smartcampustransport.entity.Trip;
import com.semicolons.smartcampustransport.repository.BusRepository;
import com.semicolons.smartcampustransport.repository.ScheduleRepository;
import com.semicolons.smartcampustransport.repository.TripRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * Service for Trip management.
 *
 * Trips represent the actual execution of a Schedule by a physical Bus.
 * This is where dynamic bus-to-route assignment happens.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class TripService {

    private final TripRepository tripRepository;
    private final ScheduleRepository scheduleRepository;
    private final BusRepository busRepository;

    /**
     * Get all trips for a specific date.
     */
    public List<TripResponse> getTripsByDate(LocalDate date) {
        return tripRepository.findByTripDate(date).stream()
            .map(TripResponse::from)
            .toList();
    }

    /**
     * Get all trips.
     */
    public List<TripResponse> getAllTrips() {
        return tripRepository.findAll().stream()
            .map(TripResponse::from)
            .toList();
    }

    /**
     * Get trip by ID.
     */
    public Optional<TripResponse> getTripById(String tripId) {
        return tripRepository.findByTripId(tripId)
            .map(TripResponse::from);
    }

    /**
     * Get trips for a route on a specific date.
     */
    public List<TripResponse> getTripsByRouteAndDate(String routeId, LocalDate date) {
        return tripRepository.findByRouteIdAndDate(routeId, date).stream()
            .map(TripResponse::from)
            .toList();
    }

    /**
     * Get active (IN_PROGRESS) trip for a bus.
     */
    public Optional<TripResponse> getActiveTripForBus(String busId) {
        return tripRepository.findByBusIdAndStatus(busId, Trip.TripStatus.IN_PROGRESS)
            .map(TripResponse::from);
    }

    /**
     * Create a new scheduled trip (Admin only).
     */
    @Transactional
    public TripResponse createTrip(TripRequest request) {
        Schedule schedule = scheduleRepository.findByScheduleId(request.scheduleId())
            .orElseThrow(() -> new IllegalArgumentException("Unknown schedule ID: " + request.scheduleId()));

        if (request.busId() != null && !busRepository.existsById(request.busId())) {
            throw new IllegalArgumentException("Unknown bus ID: " + request.busId());
        }

        Trip trip = Trip.builder()
            .scheduleId(request.scheduleId())
            .routeId(schedule.getRouteId())
            .busId(request.busId())
            .tripDate(request.tripDate())
            .status(Trip.TripStatus.SCHEDULED)
            .notes(request.notes())
            .build();

        Trip saved = tripRepository.save(trip);
        log.info("Created trip {} for schedule {} on {}", saved.getTripId(), request.scheduleId(), request.tripDate());

        return TripResponse.from(saved);
    }

    /**
     * Assign a bus to a scheduled trip.
     */
    @Transactional
    public TripResponse assignBusToTrip(String tripId, String busId) {
        Trip trip = tripRepository.findByTripId(tripId)
            .orElseThrow(() -> new IllegalArgumentException("Trip not found: " + tripId));

        if (!trip.canAssignBus()) {
            throw new IllegalStateException("Cannot assign bus to trip in status: " + trip.getStatus());
        }

        Bus bus = busRepository.findByBusId(busId)
            .orElseThrow(() -> new IllegalArgumentException("Bus not found: " + busId));

        trip.setBusId(busId);
        Trip saved = tripRepository.save(trip);

        log.info("Assigned bus {} to trip {}", busId, tripId);
        return TripResponse.from(saved);
    }

    /**
     * Start a trip (bus begins route).
     */
    @Transactional
    public TripResponse startTrip(String tripId) {
        Trip trip = tripRepository.findByTripId(tripId)
            .orElseThrow(() -> new IllegalArgumentException("Trip not found: " + tripId));

        if (!trip.canStart()) {
            throw new IllegalStateException("Cannot start trip. Status: " + trip.getStatus() + ", BusId: " + trip.getBusId());
        }

        trip.setStatus(Trip.TripStatus.IN_PROGRESS);
        trip.setActualStartTime(Instant.now());

        // Update bus currentTripId
        if (trip.getBusId() != null) {
            busRepository.findByBusId(trip.getBusId()).ifPresent(bus -> {
                bus.setCurrentTripId(trip.getTripId());
                bus.setRouteId(trip.getRouteId());
                busRepository.save(bus);
            });
        }

        Trip saved = tripRepository.save(trip);
        log.info("Started trip {} with bus {}", tripId, trip.getBusId());
        return TripResponse.from(saved);
    }

    /**
     * Complete a trip.
     */
    @Transactional
    public TripResponse completeTrip(String tripId) {
        Trip trip = tripRepository.findByTripId(tripId)
            .orElseThrow(() -> new IllegalArgumentException("Trip not found: " + tripId));

        if (!trip.canComplete()) {
            throw new IllegalStateException("Cannot complete trip in status: " + trip.getStatus());
        }

        trip.setStatus(Trip.TripStatus.COMPLETED);
        trip.setActualEndTime(Instant.now());

        // Clear bus currentTripId
        if (trip.getBusId() != null) {
            busRepository.findByBusId(trip.getBusId()).ifPresent(bus -> {
                bus.setCurrentTripId(null);
                busRepository.save(bus);
            });
        }

        Trip saved = tripRepository.save(trip);
        log.info("Completed trip {}", tripId);
        return TripResponse.from(saved);
    }

    /**
     * Cancel a trip.
     */
    @Transactional
    public TripResponse cancelTrip(String tripId, String reason) {
        Trip trip = tripRepository.findByTripId(tripId)
            .orElseThrow(() -> new IllegalArgumentException("Trip not found: " + tripId));

        trip.setStatus(Trip.TripStatus.CANCELLED);
        trip.setNotes(reason);

        // Clear bus currentTripId if it was in progress
        if (trip.getBusId() != null && trip.getStatus() == Trip.TripStatus.IN_PROGRESS) {
            busRepository.findByBusId(trip.getBusId()).ifPresent(bus -> {
                bus.setCurrentTripId(null);
                busRepository.save(bus);
            });
        }

        Trip saved = tripRepository.save(trip);
        log.info("Cancelled trip {}: {}", tripId, reason);
        return TripResponse.from(saved);
    }
}
