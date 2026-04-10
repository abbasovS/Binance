package com.spring.security.pricems.mapper;

import com.spring.security.pricems.dao.dto.model.PriceAlert;
import com.spring.security.pricems.dao.dto.response.AlertResponse;

import java.util.List;
import java.util.stream.Collectors;

public class AlertMapper {

    public static AlertResponse mapToResponse(PriceAlert entity) {
        if (entity == null) {
            return null;
        }

        return AlertResponse.builder()
                .id(entity.getId())
                .symbol(entity.getSymbol())
                .targetPrice(entity.getTargetPrice())
                .side(entity.getSide() != null ? entity.getSide().name() : null)
                .triggered(entity.isTriggered())
                .build();
    }

    public static List<AlertResponse> mapToResponseList(List<PriceAlert> entities) {
        return entities.stream()
                .map(AlertMapper::mapToResponse)
                .collect(Collectors.toList());
    }
}