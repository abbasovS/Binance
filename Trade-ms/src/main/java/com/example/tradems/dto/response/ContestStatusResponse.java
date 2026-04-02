package com.example.tradems.dto.response;

public record ContestStatusResponse(
        String status,
        String message,
        String targetDate
) {
}
