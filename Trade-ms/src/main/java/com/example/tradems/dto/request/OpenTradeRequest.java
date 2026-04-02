package com.example.tradems.dto.request;

import com.example.tradems.enums.PositionSide;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import org.hibernate.validator.constraints.Range;

import java.math.BigDecimal;
public record OpenTradeRequest

        (@NotNull(message = "Id bos ola bilez")
         Long userId,
         @NotNull(message = "symbol bos ola bilez")
         String symbol,
         @NotNull(message = "side bos ola bilez")
         PositionSide side,
         @NotNull(message = "margin bos ola bilez")
         @Min(value = 10, message = "Minimum margin 10 USDT olmalıdır")
         BigDecimal margin,
         @Range(min = 2, max = 50, message = "Leverage 2-50 arası olmalıdır")
         int leverage,
         BigDecimal takeProfit,
         BigDecimal stopLoss,
         BigDecimal targetPrice){
}
