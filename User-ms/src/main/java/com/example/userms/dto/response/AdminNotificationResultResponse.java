package com.example.userms.dto.response;


public record AdminNotificationResultResponse(
        String message,
        long affectedUsers
) {
}
