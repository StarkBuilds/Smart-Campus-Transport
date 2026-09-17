package com.semicolons.smartcampustransport.dto;

import lombok.Builder;

import java.util.List;

/**
 * Response DTO for route queries.
 * Includes ordered list of stops with scheduled times.
 */
@Builder
public record RouteResponse(
    String routeId,
    String name,
    String description,
    String color,
    List<StopInfo> stops
) {}
