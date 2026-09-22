package com.semicolons.smartcampustransport.dto;

public record RegistrationRequest(
    String role,
    String name,
    String email,
    String password,
    String campus,
    Double pickupLatitude,
    Double pickupLongitude,
    String driverId,
    String assignedBusId,
    String assignedRouteId
) {}
