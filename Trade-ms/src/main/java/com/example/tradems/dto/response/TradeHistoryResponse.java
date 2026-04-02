package com.example.tradems.dto.response;

import com.example.tradems.enums.PositionSide;
import com.example.tradems.enums.TradeStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record TradeHistoryResponse(
        String symbol,
        PositionSide side,
        BigDecimal entryPrice,
        BigDecimal closePrice,
        BigDecimal margin,
        Integer leverage,
        BigDecimal pnl,
        TradeStatus status,
        LocalDateTime closeTime
) {
}
