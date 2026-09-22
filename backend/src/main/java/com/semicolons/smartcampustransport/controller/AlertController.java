package com.semicolons.smartcampustransport.controller;

import com.semicolons.smartcampustransport.dto.AlertResponse;
import com.semicolons.smartcampustransport.entity.Alert;
import com.semicolons.smartcampustransport.service.AlertService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Controller for alert queries.
 *
 * Auth: STUDENT sees LATE_BUS, STALE_GPS only. ADMIN sees all types.
 * Frontend: AlertList component polls GET /api/alerts every ~30 seconds
 */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class AlertController {

    private final AlertService alertService;

    /**
     * Get active alerts.
     * STUDENT users: Excludes DATA_QUALITY alerts
     * ADMIN users: Sees all alert types
     *
     * @param type optional filter by alert type (ADMIN only)
     * @return list of active alerts
     */
    @GetMapping("/alerts")
    public ResponseEntity<List<AlertResponse>> getAlerts(
            @RequestParam(required = false) String type,
            @RequestParam(required = false, defaultValue = "student") String audience) {

        List<Alert> alerts;

        if (type != null) {
            // Filter by type - typically ADMIN diagnostics
            alerts = alertService.getAlertsByType(Alert.AlertType.valueOf(type));
        } else if ("admin".equalsIgnoreCase(audience)) {
            alerts = alertService.getActiveAlerts();
        } else {
            // Students: transport alerts only (excludes DATA_QUALITY diagnostics)
            alerts = alertService.getStudentVisibleAlerts();
        }

        return ResponseEntity.ok(
            alerts.stream()
                .map(AlertResponse::from)
                .toList()
        );
    }
}
