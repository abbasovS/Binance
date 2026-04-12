package com.example.userms.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProfileResponse {
    private UUID id;
    private String email;
    private String phoneNumber;
    private String telegramChatId;
    private boolean premium;
    private boolean inTournament;
    private boolean emailVerified;
    private boolean phoneVerified;
    private boolean active;
    private String role;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}