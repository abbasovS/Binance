package com.spring.security.pricems.service;

import com.spring.security.pricems.dao.dto.model.PriceAlert;
import com.spring.security.pricems.dao.dto.request.AlertRequest;
import com.spring.security.pricems.dao.dto.response.AlertResponse;
import com.spring.security.pricems.exception.SymbolNotFoundException;
import com.spring.security.pricems.mapper.AlertMapper;
import com.spring.security.pricems.repository.AlertRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AlertService {
    AlertRepository repository;
    PriceService priceService;

    public void createAlert(AlertRequest request, String userEmail) {
        Double currentMarketPrice = priceService.getRealtimePrice(request.getSymbol().toUpperCase());

        if (currentMarketPrice == null) {
            throw new RuntimeException("Qiymət alınmadı, simvolu düzgün daxil edin!");
        }

        PriceAlert newAlert = new PriceAlert();
        newAlert.setSymbol(request.getSymbol().toUpperCase());
        newAlert.setTargetPrice(request.getTargetPrice());
        newAlert.setUserEmail(userEmail);
        newAlert.setTriggered(false);

        if (request.getTargetPrice() > currentMarketPrice) {
            newAlert.setSide("UP");
        } else {
            newAlert.setSide("DOWN");
        }
        repository.save(newAlert);
    }

    public void deleteAlert(Long id, String userEmail) {
        PriceAlert alert = repository.findByIdAndUserEmail(id, userEmail)
                .orElseThrow(() -> new SymbolNotFoundException("Alert tapılmadı və ya sizə aid deyil"));
        repository.delete(alert);
    }

    public List<AlertResponse> getAllAlerts(String userEmail) {
        List<PriceAlert> alerts = repository.findAllByUserEmail(userEmail);
        return AlertMapper.mapToResponseList(alerts);
    }
}