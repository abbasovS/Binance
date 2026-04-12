package com.spring.security.pricems.dao.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Data;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

@Data
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AlertRequest {

     @NotBlank(message = "Symbol boş ola bilməz")
     String symbol;

     @NotNull(message = "Target price boş ola bilməz")
     @DecimalMin(value = "0.00000001", message = "Target price 0-dan böyük olmalıdır")
     Double targetPrice;

     @NotBlank(message = "Chat ID boş ola bilməz")
     String chatId;
}