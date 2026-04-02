package com.example.tradems.repository;

import com.example.tradems.model.WithdrawalEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WithdrawalRepository extends JpaRepository<WithdrawalEntity, Long> {
    List<WithdrawalEntity> findAllByUserIdOrderByRequestDateDesc(Long userId);
}
