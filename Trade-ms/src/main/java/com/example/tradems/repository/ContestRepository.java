package com.example.tradems.repository;

import com.example.tradems.enums.ContestStatus;
import com.example.tradems.model.ContestEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ContestRepository extends JpaRepository<ContestEntity,Long> {
    Optional<ContestEntity> findFirstByStatus(ContestStatus status);
}
