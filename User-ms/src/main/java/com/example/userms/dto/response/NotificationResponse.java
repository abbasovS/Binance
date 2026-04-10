package com.example.userms.dto.response;
import com.example.userms.model.enums.NotificationType;
import lombok.Builder;

import java.time.LocalDateTime;
import java.util.UUID;

@Builder
public record NotificationResponse(
        UUID id,
        String title,
        String message,
        NotificationType type,
        boolean read,
        String createdBy,
        LocalDateTime createdAt
) {
}