package com.example.userms.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class TelegramConnectRequest {
    @NotBlank(message = "Telegram chat id boş ola bilməz")
    private String chatId;
    String email;
}
