package com.spring.security.pricems.dao.dto.response;

import lombok.AccessLevel;
import lombok.Builder;
import lombok.Data;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AlertResponse {
    Long id;
    String symbol;
    Double targetPrice;
    String side;
    boolean triggered;
}