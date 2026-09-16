package com.semicolons.smartcampustransport.repository;

import com.semicolons.smartcampustransport.entity.Stop;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface StopRepository extends JpaRepository<Stop, String> {

    Optional<Stop> findByStopId(String stopId);
}
