package com.semicolons.smartcampustransport.repository;

import com.semicolons.smartcampustransport.entity.Bus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BusRepository extends JpaRepository<Bus, String> {

    Optional<Bus> findByBusId(String busId);

    List<Bus> findByStatus(Bus.BusStatus status);
}
