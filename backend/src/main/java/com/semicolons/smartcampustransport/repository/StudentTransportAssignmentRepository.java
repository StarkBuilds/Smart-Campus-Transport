package com.semicolons.smartcampustransport.repository;

import com.semicolons.smartcampustransport.entity.StudentTransportAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StudentTransportAssignmentRepository extends JpaRepository<StudentTransportAssignment, Long> {

    Optional<StudentTransportAssignment> findByAssignmentId(Long assignmentId);

    List<StudentTransportAssignment> findByUserId(Long userId);

    List<StudentTransportAssignment> findByUserIdAndActiveTrue(Long userId);

    List<StudentTransportAssignment> findByRouteId(String routeId);

    Optional<StudentTransportAssignment> findByUserIdAndRouteIdAndSemesterAndActiveTrue(
        Long userId,
        String routeId,
        String semester
    );

    boolean existsByUserIdAndRouteIdAndSemester(Long userId, String routeId, String semester);
}
