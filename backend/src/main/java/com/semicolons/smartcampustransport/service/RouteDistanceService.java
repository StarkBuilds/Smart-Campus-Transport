package com.semicolons.smartcampustransport.service;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * Remaining distance along the fixed OSRM LineString — not Haversine operational ETA.
 */
@Service
@RequiredArgsConstructor
public class RouteDistanceService {

    private final RouteGeometryService routeGeometryService;

    private double haversineKm(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return 6371.0 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    public double getRoadDistanceKm(String routeId, double lat1, double lon1, double latDest, double lonDest) {
        try {
            JsonNode geomNode = routeGeometryService.getGeometry(routeId);
            if (geomNode == null) {
                return haversineKm(lat1, lon1, latDest, lonDest);
            }

            JsonNode coordsNode = geomNode.path("coordinates");
            if (!coordsNode.isArray() || coordsNode.isEmpty()) {
                return haversineKm(lat1, lon1, latDest, lonDest);
            }

            List<double[]> points = new ArrayList<>();
            for (JsonNode pt : coordsNode) {
                points.add(new double[]{pt.get(1).asDouble(), pt.get(0).asDouble()});
            }

            double[] cum = new double[points.size()];
            cum[0] = 0;
            for (int i = 1; i < points.size(); i++) {
                cum[i] = cum[i - 1] + haversineKm(
                        points.get(i - 1)[0], points.get(i - 1)[1],
                        points.get(i)[0], points.get(i)[1]
                );
            }

            int startIndex = findNearestPointIndex(points, lat1, lon1);
            int destIndex = findNearestPointIndex(points, latDest, lonDest);

            if (startIndex == destIndex) {
                return haversineKm(lat1, lon1, latDest, lonDest);
            }

            // Remaining road distance along the polyline between nearest vertices,
            // plus stubs from the actual bus/stop coordinates to those vertices.
            double along = Math.abs(cum[destIndex] - cum[startIndex]);
            // Prefer forward remaining distance along the outbound polyline when dest is ahead.
            if (destIndex > startIndex) {
                along = cum[destIndex] - cum[startIndex];
            } else if (destIndex < startIndex) {
                along = cum[startIndex] - cum[destIndex];
            }
            double stubStart = haversineKm(lat1, lon1, points.get(startIndex)[0], points.get(startIndex)[1]);
            double stubEnd = haversineKm(latDest, lonDest, points.get(destIndex)[0], points.get(destIndex)[1]);
            return Math.max(0.0, along + stubStart * 0.5 + stubEnd * 0.5);

        } catch (Exception e) {
            return haversineKm(lat1, lon1, latDest, lonDest);
        }
    }

    private int findNearestPointIndex(List<double[]> points, double lat, double lon) {
        int bestIdx = 0;
        double minD = Double.MAX_VALUE;
        for (int i = 0; i < points.size(); i++) {
            double d = haversineKm(points.get(i)[0], points.get(i)[1], lat, lon);
            if (d < minD) {
                minD = d;
                bestIdx = i;
            }
        }
        return bestIdx;
    }
}
