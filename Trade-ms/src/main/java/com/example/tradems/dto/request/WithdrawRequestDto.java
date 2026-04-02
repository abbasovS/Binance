package com.example.tradems.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record WithdrawRequestDto(
        @NotNull(message = "Məbləğ boş ola bilməz")
        @DecimalMin(value = "10.0", message = "Minimum çıxarış məbləği 10 USDT olmalıdır")
        BigDecimal amount,

        @NotBlank(message = "Cüzdan adresi boş ola bilməz")
        String walletAddress
) {
}
