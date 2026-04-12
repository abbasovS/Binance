package com.spring.security.pricems.mapper;

import com.spring.security.pricems.dao.dto.model.PriceAlert;
import com.spring.security.pricems.dao.dto.response.AlertResponse;

import java.util.List;

public class AlertMapper {

    public static AlertResponse mapToResponse(PriceAlert entity) {
        return AlertResponse.builder()
                .id(entity.getId())
                .symbol(entity.getSymbol())
                .targetPrice(entity.getTargetPrice())
                .side(entity.getSide().name())
                .triggered(entity.isTriggered())
                .build();
    }

    public static List<AlertResponse> mapToResponseList(List<PriceAlert> entities) {
        return entities.stream()
                .map(AlertMapper::mapToResponse)
                .toList();
    }
}