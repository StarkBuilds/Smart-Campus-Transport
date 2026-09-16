package com.semicolons.smartcampustransport.repository;

import com.semicolons.smartcampustransport.entity.Alert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AlertRepository extends JpaRepository<Alert, Long> {

    List<Alert> findByStatus(Alert.AlertStatus status);

    Optional<Alert> findByBusIdAndTypeAndStatus(String busId, Alert.AlertType type, Alert.AlertStatus status);

    List<Alert> findByStatusAndTypeNot(Alert.AlertStatus status, Alert.AlertType type);

    List<Alert> findByType(Alert.AlertType type);
}
