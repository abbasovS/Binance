package com.spring.security.pricems.dao.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class PriceResponse {
    String symbol;
    BigDecimal price;
    private BigDecimal change;     // priceChangePercent
    private BigDecimal high;       // highPrice
    private BigDecimal low;        // lowPrice
    private BigDecimal volume;     // quoteVolume
    private BigDecimal baseVolume; // volume
    private BigDecimal vwap;       // weightedAvgPrice
    private BigDecimal priceChangeAmt; // priceChange
}
