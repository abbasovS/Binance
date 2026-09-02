package com.spring.security.pricems.service;

import com.spring.security.pricems.dao.dto.model.PriceAlert;
import com.spring.security.pricems.dao.dto.request.AlertRequest;
import com.spring.security.pricems.dao.dto.response.AlertResponse;
import com.spring.security.pricems.enums.TargetSide;
import com.spring.security.pricems.exception.CryptoException;
import com.spring.security.pricems.exception.SymbolNotFoundException;
import com.spring.security.pricems.mapper.AlertMapper;
import com.spring.security.pricems.repository.AlertRepository;
import lombok.*;
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
        String symbol = request.getSymbol().trim().toUpperCase();
        String chatId = request.getChatId() == null ? "" : request.getChatId().trim();
        if (chatId.isBlank()) {
            throw new CryptoException("Chat ID boş ola bilməz.");
        }
        Double currentMarketPrice = priceService.getRealtimePrice(symbol);

        if (currentMarketPrice == null) {
            throw new CryptoException("Qiymət alınmadı.");
        }

        TargetSide side = request.getTargetPrice() > currentMarketPrice
                ? TargetSide.UP
                : TargetSide.DOWN;

        PriceAlert newAlert = PriceAlert.builder()
                .symbol(symbol)
                .targetPrice(request.getTargetPrice())
                .userEmail(userEmail)
                .chatId(chatId)
                .side(side)
                .isTriggered(false)
                .build();

        repository.save(newAlert);
    }

    public void deleteAlert(Long id, String userEmail) {
        PriceAlert alert = repository.findByIdAndUserEmail(id, userEmail)
                .orElseThrow(() -> new SymbolNotFoundException("Alert tapılmadı"));
        repository.delete(alert);
    }

    public List<AlertResponse> getAllAlerts(String userEmail) {
        return AlertMapper.mapToResponseList(repository.findAllByUserEmail(userEmail));
    }
}