package com.example.tradems.dto.response;

import com.example.tradems.enums.PositionSide;

import java.math.BigDecimal;
import java.util.UUID;

public record PendingTradeResponse(
        UUID id,
        String symbol,
        PositionSide side,
        BigDecimal targetPrice,
        BigDecimal margin,
        Integer leverage
) {
}
