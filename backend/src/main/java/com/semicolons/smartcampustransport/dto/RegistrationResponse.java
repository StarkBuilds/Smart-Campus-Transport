package com.semicolons.smartcampustransport.dto;

public record RegistrationResponse(
    String token,
    String email,
    String role,
    String name,
    String message,
    String assignedRouteId,
    String assignedStopId,
    String assignedRouteName,
    String assignedStopName
) {}
