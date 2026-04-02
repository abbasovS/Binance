package com.spring.security.pricems.repository;


import com.spring.security.pricems.dao.dto.model.PriceAlert;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AlertRepository extends JpaRepository<PriceAlert, Long> {
    List<PriceAlert> findAllByIsTriggeredFalse();

    List<PriceAlert> findAllByUserEmail(String userEmail);
    Optional<PriceAlert> findByIdAndUserEmail(Long id, String userEmail);


}
