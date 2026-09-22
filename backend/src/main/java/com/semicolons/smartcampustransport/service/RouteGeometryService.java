package com.semicolons.smartcampustransport.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.semicolons.smartcampustransport.entity.RouteStop;
import com.semicolons.smartcampustransport.repository.RouteStopRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.net.URI;
import java.net.HttpURLConnection;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RouteGeometryService {

    private final RouteStopRepository routeStopRepository;
    private final ObjectMapper objectMapper;
    @Transactional(readOnly = true)
    public JsonNode getGeometry(String routeId) {
        List<RouteStop> routeStops = routeStopRepository.findByRouteIdOrderBySequenceOrder(routeId);
        if (routeStops.size() < 2) {
            throw new IllegalStateException("Route " + routeId + " needs at least two active stops");
        }

        String coordinates = routeStops.stream()
                .map(routeStop -> routeStop.getStop().getLongitude() + "," + routeStop.getStop().getLatitude())
                .reduce((left, right) -> left + ";" + right)
                .orElseThrow();

        String response;
        HttpURLConnection connection = null;
        try {
            connection = (HttpURLConnection) URI.create(
                    "https://router.project-osrm.org/route/v1/driving/" + coordinates
                            + "?overview=full&geometries=geojson&steps=false").toURL().openConnection();
            connection.setRequestMethod("GET");
            connection.setRequestProperty("User-Agent", "CampusRide/1.0");
            connection.setRequestProperty("Accept-Encoding", "identity");
            if (connection.getResponseCode() != 200) {
                throw new IllegalStateException("OSRM returned HTTP " + connection.getResponseCode());
            }
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(
                    connection.getInputStream(), StandardCharsets.UTF_8))) {
                response = reader.lines().collect(Collectors.joining("\n"));
            }
        } catch (IOException exception) {
            throw new IllegalStateException("Unable to request OSRM geometry for " + routeId, exception);
        } finally {
            if (connection != null) connection.disconnect();
        }

        try {
            JsonNode root = objectMapper.readTree(response);
            if (!"Ok".equals(root.path("code").asText()) || !root.path("routes").isArray()
                    || root.path("routes").isEmpty()) {
                throw new IllegalStateException("OSRM returned no route for " + routeId);
            }
            return root.path("routes").get(0).path("geometry");
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to parse OSRM geometry for " + routeId, exception);
        }
    }
}