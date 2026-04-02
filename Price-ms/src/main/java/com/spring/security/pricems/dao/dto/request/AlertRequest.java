package com.spring.security.pricems.dao.dto.request;

import lombok.AccessLevel;
import lombok.Builder;
import lombok.Data;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AlertRequest {
     String symbol;
     Double targetPrice;
     String chatId;
}
