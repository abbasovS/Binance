package com.example.tradems.dto.response;

import com.example.tradems.enums.PositionSide;

import java.math.BigDecimal;
import java.util.UUID;

public record OpenTradeResponse(
        UUID id,
        String symbol,
        PositionSide side,
        BigDecimal entryPrice,
        BigDecimal currentPrice,
        BigDecimal margin,
        Integer leverage,
        BigDecimal pnl,
        BigDecimal pnlPercentage,
        BigDecimal takeProfit,       // YENİ
        BigDecimal stopLoss,         // YENİ
        BigDecimal liquidationPrice
) {
}
