package com.example.userms.controller;


import com.example.userms.dto.response.NotificationResponse;
import com.example.userms.dto.response.UnreadCountResponse;
import com.example.userms.service.InboxNotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/user/notifications")
@RequiredArgsConstructor
public class UserNotificationController {

    private final InboxNotificationService inboxNotificationService;

    @GetMapping
    public ResponseEntity<Page<NotificationResponse>> getMyNotifications(
            @AuthenticationPrincipal UserDetails currentUser,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        PageRequest pageable = PageRequest.of(
                page,
                size,
                Sort.by(Sort.Direction.DESC, "createdAt")
        );

        return ResponseEntity.ok(
                inboxNotificationService.getMyNotifications(currentUser.getUsername(), pageable)
        );
    }

    @GetMapping("/unread-count")
    public ResponseEntity<UnreadCountResponse> unreadCount(
            @AuthenticationPrincipal UserDetails currentUser
    ) {
        long unreadCount = inboxNotificationService.getUnreadCount(currentUser.getUsername());
        return ResponseEntity.ok(new UnreadCountResponse(unreadCount));
    }

    @PatchMapping("/{notificationId}/read")
    public ResponseEntity<Map<String, String>> markAsRead(
            @PathVariable UUID notificationId,
            @AuthenticationPrincipal UserDetails currentUser
    ) {
        inboxNotificationService.markAsRead(notificationId, currentUser.getUsername());
        return ResponseEntity.ok(Map.of("message", "Notification oxundu kimi işarələndi"));
    }

    @PatchMapping("/read-all")
    public ResponseEntity<Map<String, Object>> markAllAsRead(
            @AuthenticationPrincipal UserDetails currentUser
    ) {
        int updated = inboxNotificationService.markAllAsRead(currentUser.getUsername());
        return ResponseEntity.ok(Map.of(
                "message", "Bütün notification-lar oxundu kimi işarələndi",
                "updatedCount", updated
        ));
    }
}
