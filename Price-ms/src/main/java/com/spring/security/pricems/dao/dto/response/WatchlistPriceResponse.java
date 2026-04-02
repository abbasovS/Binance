package com.spring.security.pricems.dao.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class WatchlistPriceResponse {
    private String symbol;
    private Double price;
}