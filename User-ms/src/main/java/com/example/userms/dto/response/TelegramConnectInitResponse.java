package com.example.userms.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TelegramConnectInitResponse {
    private String connectUrl;
}
