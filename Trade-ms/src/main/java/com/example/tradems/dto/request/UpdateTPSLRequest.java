package com.example.tradems.dto.request;

import java.math.BigDecimal;

    public record UpdateTPSLRequest(BigDecimal takeProfit,
                                    BigDecimal stopLoss) {
}
