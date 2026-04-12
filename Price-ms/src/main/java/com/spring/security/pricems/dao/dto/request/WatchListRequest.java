package com.spring.security.pricems.dao.dto.request;
import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class WatchListRequest {
    String symbol;
    Double targetPrice;
}
