package com.example.userms.controller;


import com.example.userms.dto.request.AdminBroadcastNotificationRequest;
import com.example.userms.dto.request.AdminUserNotificationRequest;
import com.example.userms.dto.response.AdminNotificationResultResponse;
import com.example.userms.service.InboxNotificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/admin/notifications")
@RequiredArgsConstructor
public class AdminNotificationController {

    private final InboxNotificationService inboxNotificationService;

    @PostMapping("/broadcast")
    public ResponseEntity<AdminNotificationResultResponse> broadcast(
            @RequestBody @Valid AdminBroadcastNotificationRequest request,
            @AuthenticationPrincipal UserDetails adminDetails
    ) {
        long affected = inboxNotificationService.broadcastToAllUsers(request, adminDetails.getUsername());

        return ResponseEntity.ok(
                new AdminNotificationResultResponse(
                        "Broadcast notification göndərildi",
                        affected
                )
        );
    }

    @PostMapping("/user/{userId}")
    public ResponseEntity<String> sendToSingleUser(
            @PathVariable UUID userId,
            @RequestBody @Valid AdminUserNotificationRequest request,
            @AuthenticationPrincipal UserDetails adminDetails
    ) {
        inboxNotificationService.sendToSingleUser(userId, request, adminDetails.getUsername());
        return ResponseEntity.ok("Notification user-ə göndərildi");
    }
}
