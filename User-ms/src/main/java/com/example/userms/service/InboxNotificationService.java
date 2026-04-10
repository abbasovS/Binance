package com.example.userms.service;


import com.example.userms.dto.request.AdminBroadcastNotificationRequest;
import com.example.userms.dto.request.AdminUserNotificationRequest;
import com.example.userms.dto.response.NotificationResponse;
import com.example.userms.exception.UserNotFoundException;
import com.example.userms.model.NotificationEntity;
import com.example.userms.model.UserEntity;
import com.example.userms.model.enums.NotificationType;
import com.example.userms.repository.NotificationRepository;
import com.example.userms.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class InboxNotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final SystemStateService systemStateService;

    @Transactional
    public long broadcastToAllUsers(AdminBroadcastNotificationRequest request, String adminEmail) {
        List<UserEntity> activeUsers = userRepository.findAllByActiveTrue();

        if (activeUsers.isEmpty()) {
            log.warn("Broadcast dayandırıldı: aktiv istifadəçi yoxdur");
            return 0;
        }

        List<NotificationEntity> notifications = new ArrayList<>(activeUsers.size());

        for (UserEntity user : activeUsers) {
            notifications.add(
                    NotificationEntity.builder()
                            .userId(user.getId())
                            .title(request.getTitle().trim())
                            .message(request.getMessage().trim())
                            .type(request.getType())
                            .read(false)
                            .createdBy(adminEmail)
                            .build()
            );
        }

        notificationRepository.saveAll(notifications);

        if (request.isAlsoPublishAsGlobalMessage()) {
            systemStateService.setGlobalMessage(request.getMessage().trim());
        }

        log.info("Broadcast göndərildi. Admin: {}, User sayı: {}", adminEmail, notifications.size());
        return notifications.size();
    }

    @Transactional
    public void sendToSingleUser(UUID userId, AdminUserNotificationRequest request, String adminEmail) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("İstifadəçi tapılmadı"));

        if (!user.isActive()) {
            throw new IllegalStateException("Passiv istifadəçiyə mesaj göndərilə bilməz");
        }

        NotificationEntity notification = NotificationEntity.builder()
                .userId(user.getId())
                .title(request.getTitle().trim())
                .message(request.getMessage().trim())
                .type(request.getType())
                .read(false)
                .createdBy(adminEmail)
                .build();

        notificationRepository.save(notification);

        log.info("Tək user notification göndərildi. Admin: {}, UserId: {}", adminEmail, userId);
    }

    @Transactional
    public void sendLegacyBroadcastMessage(String rawMessage, String adminEmail) {
        String safeMessage = rawMessage == null ? "" : rawMessage.trim();

        if (safeMessage.isBlank()) {
            throw new IllegalArgumentException("Mesaj boş ola bilməz");
        }

        AdminBroadcastNotificationRequest request = new AdminBroadcastNotificationRequest();
        request.setTitle("Admin Announcement");
        request.setMessage(safeMessage);
        request.setType(NotificationType.SYSTEM);
        request.setAlsoPublishAsGlobalMessage(true);

        broadcastToAllUsers(request, adminEmail);
    }

    @Transactional
    public Page<NotificationResponse> getMyNotifications(String email, Pageable pageable) {
        UserEntity user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException("İstifadəçi tapılmadı"));

        return notificationRepository.findByUserIdOrderByCreatedAtDesc(user.getId(), pageable)
                .map(this::mapToResponse);
    }

    @Transactional
    public long getUnreadCount(String email) {
        UserEntity user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException("İstifadəçi tapılmadı"));

        return notificationRepository.countByUserIdAndReadFalse(user.getId());
    }

    @Transactional
    public void markAsRead(UUID notificationId, String email) {
        UserEntity user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException("İstifadəçi tapılmadı"));

        NotificationEntity notification = notificationRepository.findByIdAndUserId(notificationId, user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Notification tapılmadı"));

        if (!notification.isRead()) {
            notification.setRead(true);
            notificationRepository.save(notification);
        }
    }

    @Transactional
    public int markAllAsRead(String email) {
        UserEntity user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException("İstifadəçi tapılmadı"));

        return notificationRepository.markAllAsRead(user.getId());
    }

    private NotificationResponse mapToResponse(NotificationEntity entity) {
        return NotificationResponse.builder()
                .id(entity.getId())
                .title(entity.getTitle())
                .message(entity.getMessage())
                .type(entity.getType())
                .read(entity.isRead())
                .createdBy(entity.getCreatedBy())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
